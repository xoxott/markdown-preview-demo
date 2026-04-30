/** error-mapper 测试 — Anthropic API 错误映射 */

import { describe, expect, it } from 'vitest';
import { createAbortError, mapAnthropicError } from '../error/error-mapper';

describe('mapAnthropicError', () => {
  it('401 → 认证失败错误', () => {
    const body = JSON.stringify({
      type: 'error',
      error: { type: 'authentication_error', message: 'invalid key' }
    });
    const err = mapAnthropicError(401, body);

    expect(err.message).toContain('认证失败');
  });

  it('403 → 权限不足错误', () => {
    const err = mapAnthropicError(403, '');

    expect(err.message).toContain('权限不足');
  });

  it('429 → 请求频率限制错误', () => {
    const err = mapAnthropicError(429, '');

    expect(err.message).toContain('请求频率限制');
  });

  it('500 → 服务内部错误', () => {
    const err = mapAnthropicError(500, '');

    expect(err.message).toContain('服务内部错误');
  });

  it('529 → 服务过载错误', () => {
    const err = mapAnthropicError(529, '');

    expect(err.message).toContain('服务过载');
  });

  it('JSON 错误响应 → 解析错误信息', () => {
    const body = JSON.stringify({
      type: 'error',
      error: { type: 'not_found_error', message: 'Model not found' }
    });
    const err = mapAnthropicError(400, body);

    expect(err.message).toContain('Model not found');
  });

  it('context_window_exceeded → 上下文窗口错误', () => {
    const body = JSON.stringify({
      type: 'error',
      error: { type: 'context_window_exceeded', message: 'too long' }
    });
    const err = mapAnthropicError(400, body);

    expect(err.message).toContain('上下文窗口');
  });

  it('未知状态码 → 通用错误', () => {
    const err = mapAnthropicError(418, '');

    expect(err.message).toContain('418');
  });
});

describe('createAbortError', () => {
  it('应创建 DOMException AbortError', () => {
    const err = createAbortError();

    expect(err instanceof DOMException).toBe(true);
    expect(err.name).toBe('AbortError');
  });

  it('应支持自定义原因', () => {
    const err = createAbortError('自定义中断');

    expect(err.message).toBe('自定义中断');
  });
});
