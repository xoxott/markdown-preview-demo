/**
 * ToolSearchDelta — ToolSearch增量通知机制
 *
 * 对齐 Claude Code src/utils/toolSearch.ts:
 *
 * - extractDiscoveredToolNames: 从消息历史扫描 tool_reference 块提取已发现工具名
 * - getDeferredToolsDelta: 计算新增/移除的延迟工具差异
 * - isToolSearchEnabled: 判断是否启用ToolSearch（自动阈值检查）
 * - ToolSearchMode: tst/tst-auto/standard 三种模式
 *
 * Delta模式通过 system-reminder attachment 通知模型新增/移除的延迟工具名， 而非老式的全量 prepend 方式。
 */

import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { AgentMessage, AssistantMessage } from '@suga/ai-agent-loop';
import { isDeferredTool } from './tool-search';

// ============================================================
// 类型定义
// ============================================================

/** ToolSearch 模式 */
export type ToolSearchMode = 'tst' | 'tst-auto' | 'standard';

/** 增量通知类型 */
export interface DeferredToolsDelta {
  /** 新增的延迟工具名（排序） */
  readonly addedNames: string[];
  /** 新增工具的渲染行（排序） */
  readonly addedLines: string[];
  /** 移除的延迟工具名（排序） */
  readonly removedNames: string[];
}

/** 增量扫描上下文（用于诊断日志） */
export interface DeferredToolsDeltaScanContext {
  readonly callSite:
    | 'attachments_main'
    | 'attachments_subagent'
    | 'compact_full'
    | 'compact_partial'
    | 'reactive_compact';
  readonly querySource?: string;
}

/** 增量通知 attachment */
export interface DeferredToolsDeltaAttachment {
  readonly type: 'deferred_tools_delta';
  readonly addedNames: string[];
  readonly removedNames: string[];
}

// ============================================================
// ToolSearch 启用判定
// ============================================================

/** 自动阈值百分比（延迟工具超过上下文窗口的10%时启用） */
const DEFAULT_AUTO_PERCENTAGE = 10;

/** 获取 ToolSearch 模式 */
export function getToolSearchMode(enableToolSearch?: string): ToolSearchMode {
  if (!enableToolSearch || enableToolSearch === '') {
    // 默认: tst（始终延迟 MCP 和 shouldDefer 工具）
    return 'tst';
  }

  if (enableToolSearch === 'false') {
    return 'standard';
  }

  if (enableToolSearch === 'true' || enableToolSearch === 'auto:0') {
    return 'tst';
  }

  if (enableToolSearch.startsWith('auto')) {
    return 'tst-auto';
  }

  return 'tst';
}

/** 判断 ToolSearch 是否启用（乐观检查，不含模型支持检查） */
export function isToolSearchEnabledOptimistic(
  mode: ToolSearchMode,
  enableToolSearch?: string,
  isFirstParty?: boolean
): boolean {
  if (mode === 'standard') return false;

  // 用户明确配置 → 启用
  if (enableToolSearch && enableToolSearch !== '') return true;

  // 未配置时，仅 Anthropic 第一方 API 启用
  if (isFirstParty) return true;

  return false;
}

/** 判断模型是否支持 tool_reference（默认支持，haiku 不支持） */
export function isModelSupportToolReference(model: string): boolean {
  // Haiku 不支持 tool_reference
  if (model.toLowerCase().includes('haiku')) return false;
  // 其他模型默认支持
  return true;
}

/** 判断 ToolSearch 是否完整启用 */
export function isToolSearchEnabled(
  mode: ToolSearchMode,
  model: string,
  enableToolSearch?: string,
  isFirstParty?: boolean
): boolean {
  if (mode === 'standard') return false;
  if (!isModelSupportToolReference(model)) return false;
  return isToolSearchEnabledOptimistic(mode, enableToolSearch, isFirstParty);
}

// ============================================================
// 自动阈值检查
// ============================================================

/**
 * 检查延迟工具是否超过自动阈值
 *
 * @param tools 所有工具
 * @param contextWindowSize 上下文窗口大小（tokens）
 * @param percentage 阈值百分比（默认10%）
 * @returns 是否超过阈值
 */
export function checkAutoThreshold(
  tools: readonly AnyBuiltTool[],
  contextWindowSize: number,
  percentage: number = DEFAULT_AUTO_PERCENTAGE
): boolean {
  const deferredTools = tools.filter(isDeferredTool);
  if (deferredTools.length === 0) return false;

  // 字符启发式估算: name + description + searchHint 的总字符数
  const totalChars = deferredTools.reduce((sum, tool) => {
    const nameLen = tool.name.length;
    const hintLen = tool.searchHint?.length ?? 0;
    // inputSchema 估算: JSON.stringify 的长度
    const schemaLen = JSON.stringify(tool.inputSchema).length;
    return sum + nameLen + hintLen + schemaLen;
  }, 0);

  // 阈值 = contextWindowSize * percentage% * 2.5 chars_per_token
  const charThreshold = contextWindowSize * (percentage / 100) * 2.5;

  return totalChars >= charThreshold;
}

// ============================================================
// extractDiscoveredToolNames — 从消息历史提取已发现工具名
// ============================================================

/**
 * 从消息历史中扫描 tool_reference 块提取已发现工具名
 *
 * P12: 改为从 AssistantMessage.toolReferences 真实扫描， 而非之前从 (msg as any).metadata.discoveredTools 伪实现。
 */
export function extractDiscoveredToolNames(messages: readonly AgentMessage[]): Set<string> {
  const discoveredTools = new Set<string>();

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      // P12: 从 AssistantMessage.toolReferences 真实扫描
      const refs = (msg as AssistantMessage).toolReferences;
      if (refs) {
        for (const ref of refs) {
          discoveredTools.add(ref.name);
        }
      }
    }
  }

  return discoveredTools;
}

// ============================================================
// getDeferredToolsDelta — 计算延迟工具增量差异
// ============================================================

/**
 * 计算当前延迟工具池与已通知工具的增量差异
 *
 * P12: 使用 extractDiscoveredToolNames (从 AssistantMessage.toolReferences 真实扫描) 替代之前从 (msg as
 * any).metadata.deferredToolsDelta 的伪实现。
 */
export function getDeferredToolsDelta(
  tools: readonly AnyBuiltTool[],
  messages: readonly AgentMessage[],
  _scanContext?: DeferredToolsDeltaScanContext
): DeferredToolsDelta | null {
  // 1. 从 toolReferences 扫描已发现/已通知的工具名
  const announced = extractDiscoveredToolNames(messages);

  // 2. 当前延迟工具名
  const deferredTools = tools.filter(isDeferredTool);
  const deferredNames = new Set(deferredTools.map(t => t.name));
  const poolNames = new Set(tools.map(t => t.name));

  // 3. 新增的延迟工具（尚未通知）
  const added = deferredTools.filter(t => !announced.has(t.name));

  // 4. 移除的延迟工具（已通知但不再在工具池中）
  const removed: string[] = [];
  for (const n of announced) {
    if (deferredNames.has(n)) continue; // 仍在延迟池中
    if (poolNames.has(n)) continue; // 已解除延迟（静默，不通知移除）
    removed.push(n); // 完全不在工具池中
  }

  if (added.length === 0 && removed.length === 0) return null;

  return {
    addedNames: added.map(t => t.name).sort(),
    addedLines: added.map(t => t.name).sort(),
    removedNames: removed.sort()
  };
}

// ============================================================
// buildDeferredToolsSystemReminder — 构建 system-reminder 附件
// ============================================================

/**
 * 构建延迟工具列表的 system-reminder 文本
 *
 * Delta模式: 仅包含增量变化（新增/移除） Standard模式: 包含全部延迟工具名
 */
export function buildDeferredToolsSystemReminder(
  delta: DeferredToolsDelta | null,
  allDeferredTools: readonly AnyBuiltTool[],
  mode: 'delta' | 'standard'
): string | null {
  if (mode === 'delta') {
    if (!delta) return null;

    const lines: string[] = [];

    if (delta.addedNames.length > 0) {
      lines.push('New deferred tools available:');
      for (const name of delta.addedNames) {
        lines.push(`- ${name}`);
      }
    }

    if (delta.removedNames.length > 0) {
      lines.push('Previously deferred tools no longer available:');
      for (const name of delta.removedNames) {
        lines.push(`- ${name}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }

  // Standard模式: 全量列表（仅包含延迟工具）
  const deferredOnly = allDeferredTools.filter(isDeferredTool);
  if (deferredOnly.length === 0) return null;

  const lines = ['Available deferred tools (use ToolSearch to load them):'];
  for (const tool of deferredOnly) {
    lines.push(`- ${tool.name}`);
  }

  return lines.join('\n');
}
