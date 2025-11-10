import type { ChunkInfo, ChunkUploadResponse, FileTask, IChunkManager, MergeResponse, UploadConfig } from '../type';
import { ChunkStatus } from '../type';
import SmartChunkCalculator from '../calculators/SmartChunkCalculator';
import { calculateFileMD5 } from '../utils';
import { CONSTANTS } from '../constants';

/** 分片管理器 */
export class ChunkManager implements IChunkManager {
  constructor(
    private config: UploadConfig,
    private progressCallback: (chunk: ChunkInfo, size: number, uploadTime: number) => void
  ) {}

  async createChunks(task: FileTask, chunkSize: number): Promise<ChunkInfo[]> {
    const totalChunks = Math.ceil(task.file.size / chunkSize);
    const chunks: ChunkInfo[] = [];

    // 计算文件MD5（如果还没有）
    if (!task.fileMD5 && this.config.enableDeduplication) {
      task.fileMD5 = await calculateFileMD5(task.file);
    }

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, task.file.size);

      chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        blob: task.file.slice(start, end),
        status: ChunkStatus.PENDING,
        retryCount: 0,
        uploadTime: 0,
        etag: undefined,
        result: undefined,
        error: undefined,
        hash: undefined
      });
    }

    task.chunks = chunks;
    task.totalChunks = totalChunks;
    task.uploadedChunks = 0;

    return chunks;
  }

  async uploadChunk(task: FileTask, chunk: ChunkInfo, abortSignal: AbortSignal): Promise<ChunkUploadResponse> {
    const startTime = performance.now();

    try {
      chunk.status = ChunkStatus.UPLOADING;

      const requestData = this.config.chunkUploadTransformer!({
        task,
        chunk,
        customParams: this.config.customParams
      });

      const isFormData = requestData instanceof FormData;
      const headers = {
        ...this.config.headers,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' })
      };

      const response = await fetch(this.config.uploadChunkUrl, {
        method: 'POST',
        headers,
        body: isFormData ? requestData : JSON.stringify(requestData),
        signal: abortSignal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ChunkUploadResponse = await response.json();

      chunk.status = ChunkStatus.SUCCESS;
      chunk.result = result;
      chunk.uploadTime = performance.now() - startTime;

      // 更新进度
      this.progressCallback(chunk, chunk.size, chunk.uploadTime);

      return result;
    } catch (error: any) {
      chunk.status = ChunkStatus.ERROR;
      chunk.error = error;
      throw error;
    }
  }

  async mergeChunks(task: FileTask, abortSignal: AbortSignal): Promise<MergeResponse> {
    const requestData = this.config.mergeChunksTransformer!({
      task,
      customParams: this.config.customParams
    });

    const isFormData = requestData instanceof FormData;
    const headers = {
      ...this.config.headers,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' })
    };

    const response = await fetch(this.config.mergeChunksUrl, {
      method: 'POST',
      headers,
      body: isFormData ? requestData : JSON.stringify(requestData),
      signal: abortSignal
    });

    if (!response.ok) {
      throw new Error(`合并分块失败: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  calculateOptimalChunkSize(fileSize: number, averageSpeed: number): number {
    return SmartChunkCalculator.calculateOptimalChunkSize(fileSize, averageSpeed, this.config);
  }
}
