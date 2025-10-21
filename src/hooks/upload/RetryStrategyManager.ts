/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:11:06
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:11:14
 * @FilePath: \markdown-preview-demo\src\hooks\upload\RetryStrategyManager.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { CONSTANTS } from "./constants";
import { ChunkStatus, FileTask, UploadConfig, UploadStatus } from "./type";

// ==================== 工具类：重试策略管理器 ====================
export default class RetryStrategyManager {
  constructor(private config: UploadConfig) {}

  shouldRetry(task: FileTask, error: Error): boolean {
    if (task.retryCount >= (task.options.maxRetries || this.config.maxRetries)) {
      return false;
    }

    const errorMessage = error.message.toLowerCase();
    return CONSTANTS.RETRYABLE_ERROR_KEYWORDS.some(keyword => 
      errorMessage.includes(keyword)
    );
  }

  calculateDelay(retryCount: number, isChunk: boolean = false): number {
    const maxDelay = isChunk ? CONSTANTS.RETRY.CHUNK_MAX_DELAY : CONSTANTS.RETRY.MAX_DELAY;
    const delay = CONSTANTS.RETRY.BASE_DELAY * 
      Math.pow(CONSTANTS.RETRY.BACKOFF_MULTIPLIER, retryCount);
    return Math.min(delay, maxDelay);
  }

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