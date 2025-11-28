/**
 * 分片操作辅助函数
 */
import type { ChunkInfo } from '../types';
import { ChunkStatus } from '../types';

/**
 * 获取待上传的分片
 */
export function getPendingChunks(chunks: ChunkInfo[]): ChunkInfo[] {
  return chunks.filter(
    c => c.status === ChunkStatus.PENDING ||
         c.status === ChunkStatus.ERROR ||
         c.status === ChunkStatus.RETRYING
  );
}

/**
 * 获取成功上传的分片
 */
export function getSuccessChunks(chunks: ChunkInfo[]): ChunkInfo[] {
  return chunks.filter(c => c.status === ChunkStatus.SUCCESS);
}

/**
 * 获取失败的分片
 */
export function getFailedChunks(chunks: ChunkInfo[]): ChunkInfo[] {
  return chunks.filter(c => c.status === ChunkStatus.ERROR);
}

/**
 * 计算已上传的分片大小
 */
export function calculateUploadedSize(chunks: ChunkInfo[]): number {
  return getSuccessChunks(chunks).reduce((sum, chunk) => sum + chunk.size, 0);
}

/**
 * 重置分片状态用于重试
 */
export function resetChunkForRetry(chunk: ChunkInfo, enableResume: boolean): void {
  if (chunk.status !== ChunkStatus.SUCCESS || !enableResume) {
    chunk.status = ChunkStatus.PENDING;
    chunk.retryCount = 0;
    chunk.error = undefined;
    chunk.uploadTime = 0;
  }
}

