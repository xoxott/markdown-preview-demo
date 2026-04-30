/** ReactiveCompactRecovery 测试 — API 413 紧急压缩恢复 */

import { describe, expect, it, vi } from 'vitest';
import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressResult } from '@suga/ai-context';
import { ReactiveCompactRecovery, extractApiError } from '../core/ReactiveCompactRecovery';

/** 辅助：创建 mock CompressPipeline */
function createMockPipeline(reactiveCompactResult: CompressResult) {
  return {
    reactiveCompact: vi.fn().mockResolvedValue(reactiveCompactResult)
  } as unknown as import('@suga/ai-context').CompressPipeline;
}

/** 辅助：创建 mock 消息列表 */
function createMockMessages(): AgentMessage[] {
  return [
    { id: 'u1', role: 'user', content: 'hello', timestamp: Date.now() },
    { id: 'a1', role: 'assistant', content: 'hi', toolUses: [], timestamp: Date.now() }
  ];
}

describe('ReactiveCompactRecovery', () => {
  describe('API 413 检测', () => {
    it('statusCode === 413 时应触发恢复', async () => {
      const compressedMessages = [createMockMessages()[0]];
      const pipeline = createMockPipeline({
        messages: compressedMessages,
        didCompress: true
      });
      const recovery = new ReactiveCompactRecovery(pipeline);

      const result = await recovery.recover(
        { statusCode: 413, message: 'prompt-too-long' },
        createMockMessages()
      );

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('reactive_compact');
      expect(result.transition.type).toBe('reactive_compact_retry');
      if (result.transition.type === 'reactive_compact_retry') {
        expect(result.transition.compressedMessages).toHaveLength(1);
      }
      expect(pipeline.reactiveCompact).toHaveBeenCalledOnce();
    });

    it('status === 413 (Node.js HTTP 错误格式) 也应触发恢复', async () => {
      const pipeline = createMockPipeline({
        messages: createMockMessages().slice(0, 1),
        didCompress: true
      });
      const recovery = new ReactiveCompactRecovery(pipeline);

      const result = await recovery.recover(
        { status: 413, message: 'Content Too Large' },
        createMockMessages()
      );

      expect(result.recovered).toBe(true);
      expect(result.transition.type).toBe('reactive_compact_retry');
    });

    it('嵌套 error.statusCode === 413 应触发恢复', async () => {
      const pipeline = createMockPipeline({
        messages: createMockMessages().slice(0, 1),
        didCompress: true
      });
      const recovery = new ReactiveCompactRecovery(pipeline);

      const error = { error: { statusCode: 413, message: 'prompt too long' } };
      const result = await recovery.recover(error, createMockMessages());

      expect(result.recovered).toBe(true);
    });

    it('非 413 错误不应触发恢复', async () => {
      const pipeline = createMockPipeline({ messages: [], didCompress: false });
      const recovery = new ReactiveCompactRecovery(pipeline);

      const result = await recovery.recover(
        { statusCode: 500, message: 'Internal Server Error' },
        createMockMessages()
      );

      expect(result.recovered).toBe(false);
      expect(result.strategy).toBe('no_recovery_needed');
      expect(result.transition.type).toBe('next_turn');
      expect(pipeline.reactiveCompact).not.toHaveBeenCalled();
    });

    it('自定义 isApiOverflowError 应覆盖默认检测器', async () => {
      const pipeline = createMockPipeline({
        messages: createMockMessages().slice(0, 1),
        didCompress: true
      });
      // 自定义检测器：只检测 statusCode === 507 (Insufficient Storage)
      const recovery = new ReactiveCompactRecovery(pipeline, (error: unknown): boolean => {
        return (
          error !== null &&
          typeof error === 'object' &&
          'statusCode' in error &&
          (error as Record<string, unknown>).statusCode === 507
        );
      });

      // 413 不再被自定义检测器识别
      const result413 = await recovery.recover(
        { statusCode: 413, message: 'prompt-too-long' },
        createMockMessages()
      );
      expect(result413.recovered).toBe(false);

      // 507 被自定义检测器识别
      const result507 = await recovery.recover(
        { statusCode: 507, message: 'Insufficient Storage' },
        createMockMessages()
      );
      expect(result507.recovered).toBe(true);
    });
  });

  describe('压缩失败', () => {
    it('压缩返回 didCompress: false 时应返回恢复失败', async () => {
      const pipeline = createMockPipeline({ messages: createMockMessages(), didCompress: false });
      const recovery = new ReactiveCompactRecovery(pipeline);

      const result = await recovery.recover(
        { statusCode: 413, message: 'prompt-too-long' },
        createMockMessages()
      );

      expect(result.recovered).toBe(false);
      expect(result.strategy).toBe('reactive_compact');
      expect(result.transition.type).toBe('next_turn');
    });
  });
});

describe('extractApiError', () => {
  it('应从 statusCode 对象提取信息', () => {
    const error = { statusCode: 413, message: 'prompt-too-long' };
    const result = extractApiError(error);
    expect(result.statusCode).toBe(413);
    expect(result.message).toBe('prompt-too-long');
    expect(result.originalError).toBe(error);
  });

  it('应从 status 对象提取信息', () => {
    const error = { status: 413 };
    const result = extractApiError(error);
    expect(result.statusCode).toBe(413);
    expect(result.message).toBe('API prompt-too-long');
  });

  it('非对象错误应返回默认值', () => {
    const result = extractApiError('string error');
    expect(result.statusCode).toBe(413);
    expect(result.message).toBe('Unknown API overflow error');
  });
});
