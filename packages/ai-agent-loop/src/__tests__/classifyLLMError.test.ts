/** classifyLLMError 测试 — 错误分类纯函数 */

import { describe, expect, it } from 'vitest';
import { classifyLLMError } from '../phase/classifyLLMError';

describe('classifyLLMError', () => {
  it('413 status → recoverable_overflow', () => {
    const error = Object.assign(new Error('prompt is too long'), { status: 413 });
    const result = classifyLLMError(error);
    expect(result.kind).toBe('recoverable_overflow');
    if (result.kind === 'recoverable_overflow') {
      expect(result.apiError.statusCode).toBe(413);
      expect(result.apiError.message).toBe('prompt is too long');
    }
  });

  it("'prompt is too long' message → recoverable_overflow", () => {
    const error = new Error('prompt is too long: 200000 tokens > 190000 maximum');
    const result = classifyLLMError(error);
    expect(result.kind).toBe('recoverable_overflow');
    if (result.kind === 'recoverable_overflow') {
      expect(result.apiError.tokenGap).toBe(10000);
      expect(result.apiError.promptTokens).toBe(200000);
      expect(result.apiError.maxTokens).toBe(190000);
    }
  });

  it("'context exceeded' message → recoverable_overflow", () => {
    const error = new Error('context window exceeded limit');
    const result = classifyLLMError(error);
    expect(result.kind).toBe('recoverable_overflow');
  });

  it("'context_limit' message → recoverable_overflow", () => {
    const error = new Error('context_limit: 100000 exceeded');
    const result = classifyLLMError(error);
    expect(result.kind).toBe('recoverable_overflow');
  });

  it('529 status → recoverable_overloaded', () => {
    const error = Object.assign(new Error('Overloaded'), { status: 529 });
    const result = classifyLLMError(error);
    expect(result.kind).toBe('recoverable_overloaded');
    if (result.kind === 'recoverable_overloaded') {
      expect(result.apiError.statusCode).toBe(529);
    }
  });

  it("'Overloaded' message → recoverable_overloaded", () => {
    const error = new Error('Service is overloaded');
    const result = classifyLLMError(error);
    expect(result.kind).toBe('recoverable_overloaded');
  });

  it('AbortError → unrecoverable_abort', () => {
    const error = new DOMException('Request aborted', 'AbortError');
    const result = classifyLLMError(error);
    expect(result.kind).toBe('unrecoverable_abort');
  });

  it('401 status → unrecoverable_other', () => {
    const error = Object.assign(new Error('auth failed'), { status: 401 });
    const result = classifyLLMError(error);
    expect(result.kind).toBe('unrecoverable_other');
  });

  it('403 status → unrecoverable_other', () => {
    const error = Object.assign(new Error('forbidden'), { status: 403 });
    const result = classifyLLMError(error);
    expect(result.kind).toBe('unrecoverable_other');
  });

  it('unknown Error → unrecoverable_other', () => {
    const error = new Error('something went wrong');
    const result = classifyLLMError(error);
    expect(result.kind).toBe('unrecoverable_other');
  });

  it('null → unrecoverable_other', () => {
    const result = classifyLLMError(null);
    expect(result.kind).toBe('unrecoverable_other');
  });

  it('token gap parsing — X tokens > Y maximum', () => {
    const error = new Error('prompt is too long: 50000 tokens > 45000 maximum');
    const result = classifyLLMError(error);
    expect(result.kind).toBe('recoverable_overflow');
    if (result.kind === 'recoverable_overflow') {
      expect(result.apiError.promptTokens).toBe(50000);
      expect(result.apiError.maxTokens).toBe(45000);
      expect(result.apiError.tokenGap).toBe(5000);
    }
  });
});
