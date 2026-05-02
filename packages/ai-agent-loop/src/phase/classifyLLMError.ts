/** LLM 错误分类 — 判断错误是否可恢复（溢出/过载）vs 不可恢复 */

/**
 * API 错误信息 — 携带状态码、原始错误、token gap 等恢复所需数据
 *
 * 与 ai-recovery 的 ApiOverflowError 兼容但独立定义， 避免 ai-agent-loop → ai-recovery 的循环依赖。
 */
export interface ApiErrorInfo {
  /** HTTP 状态码 */
  readonly statusCode?: number;
  /** 错误消息 */
  readonly message: string;
  /** 原始错误对象 */
  readonly originalError: unknown;
  /** PTL token gap（input > max 的差值） */
  readonly tokenGap?: number;
  /** 估算 prompt tokens */
  readonly promptTokens?: number;
  /** context window 最大 tokens */
  readonly maxTokens?: number;
}

/**
 * LLM 错误分类结果
 *
 * - recoverable_overflow: 413 / context exceeded — RecoveryPhase 可紧急压缩重试
 * - recoverable_overloaded: 529 / overloaded — RecoveryPhase 可降级或延迟重试
 * - unrecoverable_abort: DOMException(AbortError) — 用户中断，不可恢复
 * - unrecoverable_other: 401/403/未知 — 认证失败或不可分类错误
 */
export type LLMErrorClassification =
  | { kind: 'recoverable_overflow'; apiError: ApiErrorInfo }
  | { kind: 'recoverable_overloaded'; apiError: ApiErrorInfo }
  | { kind: 'unrecoverable_abort' }
  | { kind: 'unrecoverable_other'; originalError: unknown };

/**
 * 分类 LLM API 错误 — 纯函数
 *
 * 根据 HTTP 状态码和错误消息特征判断错误是否可恢复。 可恢复错误写入 ctx.meta.apiError，让 composePhases 不短路， RecoveryPhase 可在下游处理。
 *
 * 不可恢复错误设 ctx.setError()，composePhases 短路终止。
 */
export function classifyLLMError(error: unknown): LLMErrorClassification {
  // AbortError → 用户中断，不可恢复
  if (error instanceof DOMException && error.name === 'AbortError') {
    return { kind: 'unrecoverable_abort' };
  }

  // 从 Error 对象提取信息
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const status = obj.status ?? obj.statusCode;
    const message = typeof obj.message === 'string' ? obj.message : String(error);

    // 413 / prompt-too-long / context exceeded → 可恢复溢出
    if (
      status === 413 ||
      /prompt.*too.*long/i.test(message) ||
      /context.*exceeded/i.test(message) ||
      /context[_ ]?limit/i.test(message)
    ) {
      return {
        kind: 'recoverable_overflow',
        apiError: {
          statusCode: typeof status === 'number' ? status : 413,
          message,
          originalError: error,
          ...parseTokenGapFromMessage(message)
        }
      };
    }

    // 529 / overloaded → 可恢复过载
    if (status === 529 || /overloaded/i.test(message)) {
      return {
        kind: 'recoverable_overloaded',
        apiError: {
          statusCode: typeof status === 'number' ? status : 529,
          message,
          originalError: error
        }
      };
    }

    // 401 / 403 → 认证失败，不可恢复
    if (status === 401 || status === 403) {
      return { kind: 'unrecoverable_other', originalError: error };
    }
  }

  // 默认 → 不可恢复
  return { kind: 'unrecoverable_other', originalError: error };
}

/** 从错误消息中解析 PTL token gap — 纯函数 */
function parseTokenGapFromMessage(message: string): {
  tokenGap?: number;
  promptTokens?: number;
  maxTokens?: number;
} {
  // Anthropic 格式: "prompt is too long: X tokens > Y maximum"
  const match = message.match(/(\d+)\s*tokens\s*>\s*(\d+)\s*maximum/i);
  if (match) {
    const promptTokens = Number(match[1]);
    const maxTokens = Number(match[2]);
    return { promptTokens, maxTokens, tokenGap: promptTokens - maxTokens };
  }
  return {};
}
