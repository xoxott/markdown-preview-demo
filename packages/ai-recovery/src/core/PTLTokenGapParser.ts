/** PTLTokenGapParser — 从 API 413 错误消息解析精确的 token 溢出量 */

/**
 * PTL Token Gap 解析结果
 *
 * 从 Anthropic API 的 prompt-too-long 错误消息中提取精确的 token 数值， 用于指导压缩算法精确裁剪到目标大小。
 */
export interface PTLTokenGapResult {
  /** API 报告的实际 prompt token 数 */
  readonly promptTokens?: number;
  /** API 报告的 context window 上限 */
  readonly maxTokens?: number;
  /** 需要释放的 token 数（promptTokens 超出 maxTokens 的部分） */
  readonly tokenGap?: number;
}

/** Anthropic API PTL 错误消息正则模式 */
const PTL_PATTERNS = [
  // 模式1: "prompt is too long: <X> tokens > <Y> maximum"
  /prompt\s+is\s+too\s+long:\s+(\d+)\s+tokens?\s+>\s+(\d+)\s+maximum/i,
  // 模式2: "Prompt is too long: <X> tokens, max <Y>"
  /prompt\s+is\s+too\s+long:\s+(\d+)\s+tokens?,\s+max\s+(\d+)/i,
  // 模式3: "<X> tokens > <Y>" (简洁格式)
  /(\d+)\s+tokens?\s+>\s+(\d+)/,
  // 模式4: "prompt is too long: <X> input tokens + <Y> output tokens > <Z>"
  /prompt\s+is\s+too\s+long:\s+(\d+)\s+input\s+tokens/i,
  // 模式5: Claude Code 内部格式 "input length <X> exceeds max <Y>"
  /input\s+length\s+(\d+)\s+exceeds\s+max\s+(\d+)/i
] as const;

/**
 * 从 API 错误中解析 PTL token gap
 *
 * 尝试多种正则模式匹配 Anthropic API 的 prompt-too-long 错误消息， 提取精确的 promptTokens 和 maxTokens 数值。
 *
 * 无法解析时返回空结果（不阻断正常恢复流程）。
 *
 * @param error - API 错误对象（可能包含嵌套的 error.message）
 * @returns 解析结果（promptTokens/maxTokens/tokenGap）
 */
export function parsePTLTokenGap(error: unknown): PTLTokenGapResult {
  // 提取消息文本
  const messageText = extractErrorMessageText(error);

  if (!messageText) {
    return {};
  }

  // 按优先级尝试各正则模式
  for (const pattern of PTL_PATTERNS) {
    const match = messageText.match(pattern);
    if (match) {
      const promptTokens = Number.parseInt(match[1], 10);
      const maxTokens = match[2] ? Number.parseInt(match[2], 10) : undefined;

      if (Number.isNaN(promptTokens)) continue;

      const tokenGap =
        maxTokens !== undefined && !Number.isNaN(maxTokens) ? promptTokens - maxTokens : undefined;

      return { promptTokens, maxTokens, tokenGap };
    }
  }

  // 最后尝试：提取任意 "<number> tokens" 模式
  const tokensMatch = messageText.match(/(\d+)\s+tokens?/i);
  if (tokensMatch) {
    const promptTokens = Number.parseInt(tokensMatch[1], 10);
    if (!Number.isNaN(promptTokens)) {
      return { promptTokens };
    }
  }

  return {};
}

/**
 * 从错误对象中提取消息文本
 *
 * 支持多种错误格式：
 *
 * - { message: string }
 * - { error: { message: string } }
 * - Error 实例
 * - 纯字符串
 */
function extractErrorMessageText(error: unknown): string | undefined {
  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message;

  if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, unknown>;

    // 优先检查嵌套 error.message（Anthropic API 格式）
    if (typeof obj.error === 'object' && obj.error !== null) {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.message === 'string') return inner.message;
    }

    // 检查顶层 message
    if (typeof obj.message === 'string') return obj.message;
  }

  return undefined;
}
