import { describe, expect, it } from 'vitest';
import {
  PromptRequestSchema,
  PromptResponseSchema,
  SyncHookResponseSchema
} from '../types/hooks-prompt-schema';

describe('PromptRequestSchema', () => {
  it('validates valid request', () => {
    const result = PromptRequestSchema.safeParse({
      hookEvent: 'PreToolUse',
      prompt: 'Check safety'
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty hookEvent', () => {
    const result = PromptRequestSchema.safeParse({ hookEvent: '', prompt: 'test' });
    expect(result.success).toBe(false);
  });

  it('rejects empty prompt', () => {
    const result = PromptRequestSchema.safeParse({ hookEvent: 'PreToolUse', prompt: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional requestId', () => {
    const result = PromptRequestSchema.safeParse({
      hookEvent: 'PostToolUse',
      prompt: 'Review',
      requestId: 'req-1'
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requestId).toBe('req-1');
    }
  });

  it('rejects unknown fields', () => {
    const result = PromptRequestSchema.safeParse({ hookEvent: 'X', prompt: 'Y', extra: true });
    expect(result.success).toBe(false);
  });
});

describe('PromptResponseSchema', () => {
  it('validates valid response', () => {
    const result = PromptResponseSchema.safeParse({ response: 'Approved', cancelled: false });
    expect(result.success).toBe(true);
  });

  it('defaults cancelled to false', () => {
    const result = PromptResponseSchema.safeParse({ response: 'Ok' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelled).toBe(false);
    }
  });

  it('accepts cancelled=true', () => {
    const result = PromptResponseSchema.safeParse({ response: '', cancelled: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cancelled).toBe(true);
    }
  });
});

describe('SyncHookResponseSchema', () => {
  it('accepts string response', () => {
    const result = SyncHookResponseSchema.safeParse('Approved');
    expect(result.success).toBe(true);
  });

  it('accepts object response', () => {
    const result = SyncHookResponseSchema.safeParse({ stdout: 'ok', exitCode: 0 });
    expect(result.success).toBe(true);
  });

  it('defaults exitCode to 0', () => {
    const result = SyncHookResponseSchema.safeParse({ stderr: 'warning' });
    expect(result.success).toBe(true);
    if (result.success && typeof result.data === 'object') {
      expect(result.data.exitCode).toBe(0);
    }
  });

  it('rejects unknown fields in object', () => {
    const result = SyncHookResponseSchema.safeParse({ stdout: 'ok', extra: true });
    expect(result.success).toBe(false);
  });
});
