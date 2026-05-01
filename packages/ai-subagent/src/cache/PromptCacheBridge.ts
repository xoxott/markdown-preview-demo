/** PromptCacheBridge — 提取 cache 安全参数、构建 placeholder 结果、组装子代理消息 */

import type { ToolRegistry } from '@suga/ai-tool-core';
import type { AgentMessage, LLMProvider, ToolDefinition, ToolUseBlock } from '@suga/ai-agent-loop';
import type { SubagentDefinition } from '../types/subagent';
import type { CacheSafeParams, PlaceholderResult } from '../types/cache';

/** Placeholder 占位文本（所有 fork 子代理共享同一文本） */
const PLACEHOLDER_TEXT = 'Fork started -- processing in background';

/**
 * extractCacheSafeParams — 从父上下文提取 cache 安全参数
 *
 * 用于评估子代理消息是否与父共享 prompt cache：
 *
 * - systemPrompt: 系统提示文本
 * - toolDefinitions: 工具定义列表
 * - useExactTools: 是否使用完整工具池（不做筛选）
 */
export function extractCacheSafeParams(
  parentProvider: LLMProvider,
  parentRegistry: ToolRegistry,
  def: SubagentDefinition
): CacheSafeParams {
  const useExactTools = def.tools === undefined;

  const tools = useExactTools
    ? parentRegistry.getAll()
    : parentRegistry.getAll().filter(t => def.tools!.includes(t.name));

  const toolDefinitions: ToolDefinition[] = tools.map(t => parentProvider.formatToolDefinition(t));

  return {
    systemPrompt: def.systemPromptPrefix ?? '',
    toolDefinitions,
    useExactTools
  };
}

/**
 * buildPlaceholderResults — 为 fork 子代理构建 placeholder 工具结果
 *
 * 所有 fork 子代理使用同一占位文本，保证消息前缀字节一致。 只有 directive 文本块不同（per-child）。
 */
export function buildPlaceholderResults(
  parentToolUses: readonly ToolUseBlock[]
): PlaceholderResult[] {
  return parentToolUses.map(tu => ({
    toolUseId: tu.id,
    placeholderText: PLACEHOLDER_TEXT,
    isPlaceholder: true
  }));
}

/**
 * assembleChildMessages — 组装子代理的初始消息
 *
 * 消息构造模式（对齐 Claude Code Fork）：
 *
 *     [...parent_history,
 *       assistant(all_tool_uses + thinking + text),
 *       user(placeholder_results..., directive_text_block)]
 *
 * @param parentHistory 父消息历史
 * @param placeholders placeholder 工具结果
 * @param directiveText 子代理任务指令
 * @returns 子代理初始消息
 */
export function assembleChildMessages(
  parentHistory: readonly AgentMessage[],
  placeholders: PlaceholderResult[],
  directiveText: string
): AgentMessage[] {
  const directiveMessage: AgentMessage = {
    id: `directive_${Date.now()}`,
    role: 'user',
    content: directiveText,
    timestamp: Date.now()
  };

  // Placeholder 工具结果消息（对齐 ToolResultMessage 类型）
  const placeholderMessages: AgentMessage[] = placeholders.map(p => ({
    id: `placeholder_${p.toolUseId}`,
    role: 'tool_result' as const,
    toolUseId: p.toolUseId,
    toolName: 'placeholder',
    result: p.placeholderText,
    isSuccess: true,
    timestamp: Date.now()
  }));

  return [...parentHistory, ...placeholderMessages, directiveMessage];
}
