/** openai-error-mapper 测试 — OpenAI API 错误映射 */

import { describe, expect, it } from 'vitest';
import { mapOpenAIError } from '../error/openai-error-mapper';

describe('mapOpenAIError', () => {
  it('401 → 认证失败错误', () => {
    const body = JSON.stringify({
      error: { message: 'Invalid API key', type: 'invalid_request_error', code: 'invalid_api_key' }
    });
    const err = mapOpenAIError(401, body);

    expect(err.message).toContain('认证失败');
    expect(err.message).toContain('Invalid API key');
  });

  it('403 → 权限不足错误', () => {
    const err = mapOpenAIError(403, '');
    expect(err.message).toContain('权限不足');
  });

  it('429 → 请求频率限制错误', () => {
    const body = JSON.stringify({
      error: { message: 'Rate limit reached', type: 'rate_limit_error' }
    });
    const err = mapOpenAIError(429, body);

    expect(err.message).toContain('请求频率限制');
    expect(err.message).toContain('Rate limit reached');
  });

  it('500 → 服务内部错误', () => {
    const err = mapOpenAIError(500, '');
    expect(err.message).toContain('OpenAI 服务内部错误');
  });

  it('502 → 服务不可用', () => {
    const err = mapOpenAIError(502, '');
    expect(err.message).toContain('OpenAI 服务不可用');
    expect(err.message).toContain('502');
  });

  it('503 → 服务不可用', () => {
    const err = mapOpenAIError(503, '');
    expect(err.message).toContain('OpenAI 服务不可用');
    expect(err.message).toContain('503');
  });

  it('context_length_exceeded → 上下文长度超出限制', () => {
    const body = JSON.stringify({
      error: {
        message: 'This model maximum context length is 8192',
        type: 'invalid_request_error',
        code: 'context_length_exceeded'
      }
    });
    const err = mapOpenAIError(400, body);

    expect(err.message).toContain('上下文长度超出限制');
  });

  it('insufficient_quota → 配额不足', () => {
    const body = JSON.stringify({
      error: { message: 'You exceeded your quota', type: 'insufficient_quota' }
    });
    const err = mapOpenAIError(429, body);

    expect(err.message).toContain('配额不足');
  });

  it('server_error → 服务错误', () => {
    const body = JSON.stringify({
      error: { message: 'Server error', type: 'server_error' }
    });
    const err = mapOpenAIError(500, body);

    expect(err.message).toContain('OpenAI 服务错误');
  });

  it('未知状态码 → 通用错误', () => {
    const err = mapOpenAIError(418, '');
    expect(err.message).toContain('418');
  });

  it('非 JSON 响应 → 使用原始文本', () => {
    const err = mapOpenAIError(401, 'Not JSON');
    expect(err.message).toContain('认证失败');
    expect(err.message).toContain('Not JSON');
  });
});
