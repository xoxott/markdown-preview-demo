/** OpenAI API 错误映射 — HTTP 状态码/错误类型 → 内部错误 */

import type { OpenAIErrorResponse } from '../types/openai';

/**
 * 将 OpenAI API 错误映射为内部错误类型
 *
 * 与 Anthropic error-mapper 平行：
 *
 * - DOMException(AbortError) 表示中断
 * - 普通 Error 表示模型错误
 *
 * @param status HTTP 状态码
 * @param body 响应体（字符串或 JSON）
 * @returns 映射后的 Error
 */
export function mapOpenAIError(status: number, body: string): Error {
  // 尝试解析 JSON 错误响应
  let errorType = '';
  let errorMessage = '';
  let errorCode = '';

  try {
    const parsed: OpenAIErrorResponse = JSON.parse(body);
    if (parsed.error) {
      errorType = parsed.error.type ?? '';
      errorMessage = parsed.error.message ?? '';
      errorCode = parsed.error.code ?? '';
    }
  } catch {
    // 非 JSON 响应，使用原始文本
    errorMessage = body || `HTTP ${status}`;
  }

  // 特殊错误类型检测（优先于状态码匹配）
  if (errorCode === 'context_length_exceeded') {
    return new Error(`上下文长度超出限制 — ${errorMessage}`);
  }
  if (errorType === 'insufficient_quota') {
    return new Error(`配额不足 — ${errorMessage}`);
  }
  if (errorType === 'server_error') {
    return new Error(`OpenAI 服务错误 — ${errorMessage}`);
  }

  switch (status) {
    case 401:
      return new Error(`认证失败：API 密钥无效${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 403:
      return new Error(`权限不足${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 429:
      return new Error(`请求频率限制${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 500:
      return new Error(`OpenAI 服务内部错误${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 502:
      return new Error(`OpenAI 服务不可用 (502)${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 503:
      return new Error(`OpenAI 服务不可用 (503)${errorMessage ? ` — ${errorMessage}` : ''}`);
    default:
      return new Error(`OpenAI API 错误 (${status})${errorMessage ? ` — ${errorMessage}` : ''}`);
  }
}
