/**
 * SnipProjection — Snip 视图投影
 *
 * 对齐 CC services/compact/snipProjection.ts。在用户 UI 中，已被 snip 的消息默认折叠 显示为单条占位符；用户展开时才看到完整消息。本模块提供
 * projection 算法，把原始 消息列表投影成 UI 可渲染的折叠视图。
 *
 * 注意：投影是 UI 层概念，不影响发送给模型的实际 messages。模型看到的是 snipCompact 处理后的列表（含 snip_marker），而 UI 看到的是这里的
 * projected 列表（含 collapsed_snip_group）。
 */

import { isSnipMarkerMessage } from './snipCompact';
import type { SnipCompactMessage } from './snipCompact';

// ============================================================
// 类型
// ============================================================

/** 折叠后的 UI 消息组 */
export interface CollapsedSnipGroup {
  readonly type: 'collapsed_snip_group';
  readonly role: 'system';
  readonly snippedCount: number;
  readonly snippedTokens: number;
  /** 摘要文本（"snipped N messages, ~X tokens"） */
  readonly summary: string;
  /** 原始 marker 索引（用于 reverse projection） */
  readonly originalIndex: number;
}

/** Projection 后的混合消息 */
export type ProjectedMessage = SnipCompactMessage | CollapsedSnipGroup;

/** 是否为已投影的折叠组 */
export function isCollapsedSnipGroup(msg: ProjectedMessage): msg is CollapsedSnipGroup {
  return (msg as CollapsedSnipGroup).type === 'collapsed_snip_group';
}

/** 是否为 snip 边界消息（snipCompact 的 marker 或 projection 的 collapsed group） */
export function isSnipBoundaryMessage(msg: ProjectedMessage): boolean {
  if (isCollapsedSnipGroup(msg)) return true;
  return isSnipMarkerMessage(msg as SnipCompactMessage);
}

// ============================================================
// 投影
// ============================================================

/** Projection 选项 */
export interface SnipProjectionOptions {
  /** 是否合并连续的 snip marker 为单个 group（默认 true） */
  readonly mergeAdjacent?: boolean;
  /** 自定义摘要文本生成器 */
  readonly formatSummary?: (count: number, tokens: number) => string;
}

const DEFAULT_FORMAT = (count: number, tokens: number): string =>
  `[${count} message${count === 1 ? '' : 's'} collapsed, ~${tokens} tokens — expand to view]`;

/** 把模型用的 messages（含 snip_marker）投影成 UI 用的 projected 视图 */
export function projectSnippedView(
  messages: readonly SnipCompactMessage[],
  options: SnipProjectionOptions = {}
): readonly ProjectedMessage[] {
  const result: ProjectedMessage[] = [];
  const mergeAdjacent = options.mergeAdjacent !== false;
  const formatSummary = options.formatSummary ?? DEFAULT_FORMAT;

  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i]!;
    if (!isSnipMarkerMessage(msg)) {
      result.push(msg);
      continue;
    }

    let count = msg.snippedCount;
    let tokens = msg.snippedTokens;
    const originalIdx = i;

    // 合并相邻的 snip marker
    if (mergeAdjacent) {
      while (i + 1 < messages.length) {
        const next = messages[i + 1]!;
        if (!isSnipMarkerMessage(next)) break;
        count += next.snippedCount;
        tokens += next.snippedTokens;
        i += 1;
      }
    }

    result.push({
      type: 'collapsed_snip_group',
      role: 'system',
      snippedCount: count,
      snippedTokens: tokens,
      summary: formatSummary(count, tokens),
      originalIndex: originalIdx
    });
  }

  return result;
}

/**
 * 反投影：从 projected 视图（含 collapsed_snip_group）恢复回模型可用的 messages
 *
 * 折叠组无法精确还原内部消息，但可以恢复为单个 snip_marker —— 适用于持久化场景， UI 折叠状态可以丢弃但 marker 必须保留以保证模型上下文一致性。
 */
export function unprojectSnippedView(
  projected: readonly ProjectedMessage[]
): readonly SnipCompactMessage[] {
  const result: SnipCompactMessage[] = [];
  for (const msg of projected) {
    if (isCollapsedSnipGroup(msg)) {
      const marker = {
        type: 'snip_marker' as const,
        role: 'system' as const,
        content: msg.summary,
        snippedCount: msg.snippedCount,
        snippedTokens: msg.snippedTokens
      };
      result.push(marker);
    } else {
      result.push(msg);
    }
  }
  return result;
}

// ============================================================
// 统计
// ============================================================

export interface SnipProjectionStats {
  readonly totalProjected: number;
  readonly groups: number;
  readonly snippedMessages: number;
  readonly snippedTokens: number;
}

export function getProjectionStats(projected: readonly ProjectedMessage[]): SnipProjectionStats {
  let groups = 0;
  let snippedMessages = 0;
  let snippedTokens = 0;
  for (const msg of projected) {
    if (isCollapsedSnipGroup(msg)) {
      groups += 1;
      snippedMessages += msg.snippedCount;
      snippedTokens += msg.snippedTokens;
    }
  }
  return {
    totalProjected: projected.length,
    groups,
    snippedMessages,
    snippedTokens
  };
}
