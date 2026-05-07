/**
 * SnipCompact — 局部消息片段压缩（"Snip"）
 *
 * 对齐 CC services/compact/snipCompact.ts。"Snip" 是一种在主对话流中插入压缩边界标记 的轻量级 compact：不全量摘要，而是把一段连续的
 * tool_use/tool_result/思维过程替换成 一个 SNIP_MARKER 消息，保留前后的结构以便用户/模型理解上下文。
 *
 * 与 microcompact / compact 的区别：
 *
 * - microcompact：用 LLM 对消息列表生成精简摘要
 * - snipCompact：基于规则（默认 collapse 连续的 ReadFile/Bash 等）静默压缩，无网络成本
 */

// ============================================================
// 类型
// ============================================================

/** 简化的消息形态 */
export interface SnipCompactMessage {
  readonly id?: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: unknown;
  readonly type?: 'snip_marker' | string;
  readonly tokens?: number;
  /** 标记此消息可被 snip（如 ReadFile/Bash 这些具有重复读取价值的） */
  readonly snippable?: boolean;
}

/** Snip 边界标记消息 */
export interface SnipMarkerMessage extends SnipCompactMessage {
  readonly type: 'snip_marker';
  readonly snippedCount: number;
  readonly snippedTokens: number;
}

/** Snip 配置（CC 端"snip"压缩 — 与本包内已有 SnipCompactConfig 区分） */
export interface SnipMarkerConfig {
  readonly enabled: boolean;
  /** 触发 snip 的最小连续 snippable 消息数 */
  readonly minRunLength: number;
  /** 触发 snip 的最小 token 数（小于此值的不压缩） */
  readonly minRunTokens: number;
  /** 总 token 软上限 — 超过后开始压缩最早的连续段 */
  readonly tokenSoftCap: number;
  /** 留住最近的 N 条消息不参与 snip */
  readonly keepRecentMessages: number;
}

export const DEFAULT_SNIP_MARKER_CONFIG: SnipMarkerConfig = {
  enabled: false,
  minRunLength: 4,
  minRunTokens: 2_000,
  tokenSoftCap: 60_000,
  keepRecentMessages: 8
};

// ============================================================
// 工具函数
// ============================================================

/** 判断消息是否为 SnipMarker */
export function isSnipMarkerMessage(message: SnipCompactMessage): message is SnipMarkerMessage {
  return message.type === 'snip_marker';
}

/** 判断消息是否为可 snip 类型 */
function isSnippable(message: SnipCompactMessage): boolean {
  return message.snippable === true || isSnipMarkerMessage(message);
}

/** 估算消息 token（如果未显式提供） */
function estimateTokens(message: SnipCompactMessage): number {
  if (typeof message.tokens === 'number') return message.tokens;
  const json = JSON.stringify(message.content ?? '');
  return Math.ceil(json.length / 4);
}

// ============================================================
// 压缩主流程
// ============================================================

/** Snip 结果 */
export interface SnipCompactResult {
  readonly messages: readonly SnipCompactMessage[];
  readonly tokensFreed: number;
  readonly snipsPerformed: number;
}

/**
 * 检查并执行 snip 压缩
 *
 * 算法：
 *
 * 1. 计算总 token，如果未超过 tokenSoftCap 直接返回
 * 2. 从最早的消息开始扫描，识别连续 snippable 段
 * 3. 满足 minRunLength + minRunTokens 的段替换为 SnipMarker
 * 4. 直到总 token 降至 tokenSoftCap 之下
 */
export function snipCompactIfNeeded(
  messages: readonly SnipCompactMessage[],
  config: SnipMarkerConfig = DEFAULT_SNIP_MARKER_CONFIG
): SnipCompactResult {
  if (!config.enabled || messages.length === 0) {
    return { messages, tokensFreed: 0, snipsPerformed: 0 };
  }

  const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m), 0);
  if (totalTokens <= config.tokenSoftCap) {
    return { messages, tokensFreed: 0, snipsPerformed: 0 };
  }

  const result: SnipCompactMessage[] = [];
  let i = 0;
  const lastSnippableIdx = messages.length - config.keepRecentMessages;
  let tokensFreed = 0;
  let snipsPerformed = 0;
  let currentTotal = totalTokens;

  while (i < messages.length) {
    const message = messages[i]!;
    if (i >= lastSnippableIdx || !isSnippable(message) || currentTotal <= config.tokenSoftCap) {
      result.push(message);
      i += 1;
      continue;
    }

    // 扫描连续 snippable 段
    let runEnd = i;
    let runTokens = 0;
    while (
      runEnd < lastSnippableIdx &&
      runEnd < messages.length &&
      isSnippable(messages[runEnd]!)
    ) {
      runTokens += estimateTokens(messages[runEnd]!);
      runEnd += 1;
    }

    const runLength = runEnd - i;
    if (runLength >= config.minRunLength && runTokens >= config.minRunTokens) {
      // 替换为 SnipMarker
      const marker: SnipMarkerMessage = {
        type: 'snip_marker',
        role: 'system',
        content: `[snipped ${runLength} messages, ~${runTokens} tokens]`,
        snippedCount: runLength,
        snippedTokens: runTokens,
        tokens: 50
      };
      result.push(marker);
      tokensFreed += runTokens - 50;
      currentTotal -= runTokens - 50;
      snipsPerformed += 1;
      i = runEnd;
    } else {
      result.push(message);
      i += 1;
    }
  }

  return { messages: result, tokensFreed, snipsPerformed };
}

// ============================================================
// 提示文本（用户在 UI 中看到的）
// ============================================================

export const SNIP_NUDGE_TEXT =
  'Conversation is approaching token limits. Consider running /compact or /clear to free context.';

/** 是否需要提示用户（基于是否包含 snip marker 且 marker 数量超过阈值） */
export function shouldNudgeForSnips(
  messages: readonly SnipCompactMessage[],
  thresholdMarkers: number = 3
): boolean {
  let count = 0;
  for (const m of messages) {
    if (isSnipMarkerMessage(m)) count += 1;
    if (count >= thresholdMarkers) return true;
  }
  return false;
}
