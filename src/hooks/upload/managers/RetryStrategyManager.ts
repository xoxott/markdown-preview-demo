/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:11:06
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:11:14
 * @FilePath: \markdown-preview-demo\src\hooks\upload\RetryStrategyManager.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { CONSTANTS } from '../constants';
import type { FileTask, UploadConfig } from '../type';
import { ChunkStatus, UploadStatus } from '../type';

// ==================== 工具类：重试策略管理器 ====================

/**
 * 重试策略管理器，用于管理文件或分片上传过程中的重试逻辑。 主要功能：
 *
 * 1. 判断某个任务是否需要重试
 * 2. 根据重试次数计算延迟时间
 * 3. 重置任务状态以便重新上传
 */
export default class RetryStrategyManager {
  /** @param config - 上传配置对象，包含最大重试次数等参数 */
  constructor(private config: UploadConfig) {}

  /**
   * 判断某个任务是否需要重试
   *
   * @param task - 当前文件任务对象
   * @param error - 任务失败时的错误对象
   * @returns 是否需要重试（true/false）
   */
  shouldRetry(task: FileTask, error: Error): boolean {
    // 判断重试次数是否超过最大值
    if (task.retryCount >= (task.options.maxRetries || this.config.maxRetries)) {
      return false;
    }

    // 判断错误信息是否属于可重试类型
    const errorMessage = error.message.toLowerCase();
    return CONSTANTS.RETRYABLE_ERROR_KEYWORDS.some(keyword => errorMessage.includes(keyword));
  }

  /**
   * 计算下一次重试的延迟时间 使用指数退避策略（exponential backoff）
   *
   * @param retryCount - 当前重试次数
   * @param isChunk - 是否为分片重试（默认为 false）
   * @returns 延迟时间，单位毫秒
   */
  calculateDelay(retryCount: number, isChunk: boolean = false): number {
    const maxDelay = isChunk ? CONSTANTS.RETRY.CHUNK_MAX_DELAY : CONSTANTS.RETRY.MAX_DELAY;
    const delay = CONSTANTS.RETRY.BASE_DELAY * CONSTANTS.RETRY.BACKOFF_MULTIPLIER ** retryCount;
    return Math.min(delay, maxDelay);
  }

  /**
   * 重置文件任务及其分片状态 将任务状态置为待上传（PENDING），清除错误信息，分片错误计数重置
   *
   * @param task - 文件任务对象
   */
  resetTask(task: FileTask): void {
    task.status = UploadStatus.PENDING;
    task.error = null;
    task.chunks.forEach(chunk => {
      if (chunk.status === ChunkStatus.ERROR) {
        chunk.status = ChunkStatus.PENDING;
        chunk.retryCount = 0;
        chunk.error = undefined;
      }
    });
  }
}
