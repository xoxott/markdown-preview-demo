/** ReactiveCompactRecovery — API 413 紧急压缩恢复 复用 P8 ReactiveCompactLayer */

import type { AgentMessage, ContinueTransition } from '@suga/ai-agent-loop';
import type { CompressPipeline } from '@suga/ai-context';
import type { ApiOverflowError, RecoveryResult } from '../types/recovery';

/**
 * ReactiveCompact 恢复器
 *
 * 当 API 返回 413 (prompt-too-long) 时，调用 CompressPipeline.reactiveCompact
 * 进行紧急压缩，然后构造 reactive_compact_retry ContinueTransition。
 *
 * 流程：
 * 1. 检测 API 413 错误
 * 2. 调用 pipeline.reactiveCompact 进行紧急压缩
 * 3. 构造 reactive_compact_retry transition（使用压缩后的消息作为基础）
 * 4. 返回 RecoveryResult → advanceState 丢弃本轮产出，从压缩后的消息重新开始
 */
export class ReactiveCompactRecovery {
  private readonly pipeline: CompressPipeline;
  private readonly isApiOverflowError: (error: unknown) => boolean;

  constructor(pipeline: CompressPipeline, isApiOverflowError?: (error: unknown) => boolean) {
    this.pipeline = pipeline;
    this.isApiOverflowError = isApiOverflowError ?? defaultIsApiOverflowError;
  }

  /**
   * 检测并恢复 API 溢出错误
   *
   * @param error API 错误对象
   * @param messages 当前消息历史
   * @returns 恢复结果（成功时返回 reactive_compact_retry transition）
   */
  async recover(error: unknown, messages: readonly AgentMessage[]): Promise<RecoveryResult> {
    if (!this.isApiOverflowError(error)) {
      return {
        transition: { type: 'next_turn' },
        strategy: 'no_recovery_needed',
        recovered: false
      };
    }

    // API 413 → 紧急压缩
    const result = await this.pipeline.reactiveCompact(messages);

    if (!result.didCompress) {
      // 压缩失败 → 无法恢复，将错误向上传播
      return { transition: { type: 'next_turn' }, strategy: 'reactive_compact', recovered: false };
    }

    const transition: ContinueTransition = {
      type: 'reactive_compact_retry',
      compressedMessages: result.messages
    };

    return {
      transition,
      strategy: 'reactive_compact',
      recovered: true
    };
  }
}

/** 默认 API 溢出检测器 — 检测 statusCode === 413 */
function defaultIsApiOverflowError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    // 检查 statusCode
    if (obj.statusCode === 413) return true;
    // 检查 status (Node.js HTTP 错误)
    if (obj.status === 413) return true;
    // 检查 error.message 包含 prompt-too-long
    if (obj.error && typeof obj.error === 'object') {
      const inner = obj.error as Record<string, unknown>;
      if (inner.statusCode === 413) return true;
    }
  }
  return false;
}

/** 提取 API 错误信息 — 公共 API，用于 RecoveryMeta.apiError */
export function extractApiError(error: unknown): ApiOverflowError {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    return {
      statusCode: (obj.statusCode as number) ?? (obj.status as number) ?? 413,
      message: (obj.message as string) ?? 'API prompt-too-long',
      originalError: error
    };
  }
  return { statusCode: 413, message: 'Unknown API overflow error', originalError: error };
}
