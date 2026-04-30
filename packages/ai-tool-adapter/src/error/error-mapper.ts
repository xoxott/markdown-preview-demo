/** Anthropic API 错误映射 — HTTP 状态码/错误类型 → 内部错误 */

/**
 * 将 Anthropic API 错误映射为内部错误类型
 *
 * CallModelPhase 要求：
 *
 * - DOMException(AbortError) 表示中断
 * - 普通 Error 表示模型错误
 *
 * @param status HTTP 状态码
 * @param body 响应体（字符串或 JSON）
 * @returns 映射后的 Error 或 DOMException
 */
export function mapAnthropicError(status: number, body: string): Error {
  // 尝试解析 JSON 错误响应
  let errorType = '';
  let errorMessage = '';

  try {
    const parsed = JSON.parse(body);
    if (parsed.error) {
      errorType = parsed.error.type ?? '';
      errorMessage = parsed.error.message ?? '';
    }
  } catch {
    // 非 JSON 响应，使用原始文本
    errorMessage = body || `HTTP ${status}`;
  }

  switch (status) {
    case 401:
      return new Error(`认证失败：API 密钥无效${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 403:
      return new Error(`权限不足${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 429:
      return new Error(`请求频率限制${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 500:
      return new Error(`Anthropic 服务内部错误${errorMessage ? ` — ${errorMessage}` : ''}`);
    case 529:
      return new Error(`Anthropic 服务过载${errorMessage ? ` — ${errorMessage}` : ''}`);
    default:
      // 特殊错误类型检测
      if (errorType === 'overloaded_error') {
        return new Error(`Anthropic 服务过载 — ${errorMessage}`);
      }
      if (errorType === 'context_window_exceeded') {
        return new Error(`上下文窗口超出限制 — ${errorMessage}`);
      }
      return new Error(`Anthropic API 错误 (${status})${errorMessage ? ` — ${errorMessage}` : ''}`);
  }
}

/**
 * 创建中断错误
 *
 * CallModelPhase 通过 DOMException.name === 'AbortError' 判断中断类型。
 */
export function createAbortError(reason?: string): DOMException {
  return new DOMException(reason ?? '请求被中断', 'AbortError');
}
