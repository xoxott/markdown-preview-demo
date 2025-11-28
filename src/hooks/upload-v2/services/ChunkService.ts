/**
 * 分片服务
 * 负责分片的创建、上传和合并
 */
import type { FileTask, ChunkInfo, ChunkUploadResponse, MergeResponse, UploadConfig } from '../types';
import { ChunkStatus } from '../types';
import { calculateFileMD5 } from '../utils/hash';
import { calculateFileMD5Smart } from '../utils/hash-worker';
import { withRetry, classifyError, ErrorType } from '../utils/retry';
import { fetchWithTimeout, buildRequestBody } from '../utils/fetch-with-timeout';
import { CONSTANTS } from '../constants';
import { logger } from '../utils/logger';
import { UploadError, NetworkError, TimeoutError, ServerError } from '../types/error';
import { performanceMonitor } from '../utils/performance-monitor';

/**
 * 分片服务
 */
export class ChunkService {
  constructor(
    private config: UploadConfig,
    private progressCallback: (chunk: ChunkInfo, size: number, uploadTime: number) => void
  ) {}

  /**
   * 创建分片（延迟创建 blob，只在需要时创建）
   * 如果分片已存在且部分已成功，则保留已成功的分片状态
   */
  async createChunks(task: FileTask, chunkSize: number): Promise<ChunkInfo[]> {
    const totalChunks = Math.ceil(task.file.size / chunkSize);

    // 如果分片已存在，检查是否需要保留已成功的分片
    if (task.chunks && task.chunks.length > 0) {
      const existingChunks = new Map<number, ChunkInfo>();
      task.chunks.forEach((chunk: ChunkInfo) => {
        existingChunks.set(chunk.index, chunk);
      });

      // 检查是否有已成功的分片
      const hasSuccessChunks = Array.from(existingChunks.values()).some(
        (chunk: ChunkInfo) => chunk.status === ChunkStatus.SUCCESS
      );

      if (hasSuccessChunks && task.totalChunks === totalChunks) {
        // 分片已存在且数量匹配，保留已成功的分片状态，只更新缺失或需要重置的分片
        const chunks: ChunkInfo[] = [];

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize;
          const end = Math.min(start + chunkSize, task.file.size);
          const existingChunk = existingChunks.get(i);

          if (existingChunk && existingChunk.status === ChunkStatus.SUCCESS) {
            // 保留已成功的分片状态
            chunks.push({
              ...existingChunk,
              start, // 确保范围正确
              end,
              size: end - start
            });
          } else {
            // 创建新分片或重置失败的分片
            chunks.push({
              index: i,
              start,
              end,
              size: end - start,
              blob: existingChunk?.blob || null, // 保留已有的 blob（如果有）
              status: existingChunk?.status === ChunkStatus.ERROR
                ? ChunkStatus.ERROR
                : ChunkStatus.PENDING,
              retryCount: existingChunk?.retryCount || 0,
              uploadTime: existingChunk?.uploadTime || 0,
              etag: existingChunk?.etag,
              result: existingChunk?.result,
              error: existingChunk?.error,
              hash: existingChunk?.hash
            });
          }
        }

        task.chunks = chunks;
        task.totalChunks = totalChunks;
        // 保留已上传的分片计数
        task.uploadedChunks = chunks.filter((c: ChunkInfo) => c.status === ChunkStatus.SUCCESS).length;

        return chunks;
      }
    }

    // 分片不存在或需要重新创建，创建全新的分片
    const chunks: ChunkInfo[] = [];

    // 计算文件MD5（如果还没有，支持 Worker）
    if (!task.fileMD5 && this.config.enableDeduplication) {
      if (this.config.useWorker) {
        task.fileMD5 = await calculateFileMD5Smart(task.file, true);
      } else {
        task.fileMD5 = await calculateFileMD5(task.file);
      }
    }

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, task.file.size);

      chunks.push({
        index: i,
        start,
        end,
        size: end - start,
        blob: null, // 延迟创建，不立即创建 blob
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

  /**
   * 获取分片的 blob（延迟创建）
   */
  getChunkBlob(task: FileTask, chunk: ChunkInfo): Blob {
    if (!chunk.blob) {
      chunk.blob = task.file.slice(chunk.start, chunk.end);
    }
    return chunk.blob;
  }

  /**
   * 上传单个分片（带重试机制）
   */
  async uploadChunk(task: FileTask, chunk: ChunkInfo, abortSignal: AbortSignal): Promise<ChunkUploadResponse> {
    const startTime = performance.now();
    const maxRetries = chunk.retryCount >= (this.config.maxRetries || CONSTANTS.RETRY.MAX_RETRIES)
      ? 0
      : (this.config.maxRetries || CONSTANTS.RETRY.MAX_RETRIES) - chunk.retryCount;

    try {
      // 延迟创建 blob
      const blob = this.getChunkBlob(task, chunk);

      // 使用重试机制上传
      const result = await withRetry(
        async () => {
          if (chunk.status === ChunkStatus.PENDING || chunk.status === ChunkStatus.ERROR) {
            chunk.status = ChunkStatus.UPLOADING;
          } else if (chunk.status === ChunkStatus.UPLOADING && chunk.retryCount > 0) {
            chunk.status = ChunkStatus.RETRYING;
          }

          const requestData = this.config.chunkUploadTransformer!({
            task,
            chunk: { ...chunk, blob }, // 传入 blob
            customParams: this.config.customParams
          });

          const { body, headers: bodyHeaders } = buildRequestBody(requestData);
          const headers = {
            ...this.config.headers,
            ...bodyHeaders
          };

          const response = await fetchWithTimeout(this.config.uploadChunkUrl, {
            method: 'POST',
            headers,
            body,
            signal: abortSignal,
            timeout: this.config.timeout || CONSTANTS.UPLOAD.TIMEOUT
          });

          if (!response.ok) {
            const error = new ServerError(
              `HTTP ${response.status}: ${response.statusText}`,
              response.status,
              response.statusText
            );
            throw error;
          }

          const result: ChunkUploadResponse = await response.json();
          return result;
        },
        {
          maxRetries,
          baseDelay: this.config.retryDelay || CONSTANTS.RETRY.BASE_DELAY,
          maxDelay: CONSTANTS.RETRY.CHUNK_MAX_DELAY,
          backoffMultiplier: this.config.retryBackoff || CONSTANTS.RETRY.BACKOFF_MULTIPLIER,
          onRetry: (error, retryCount) => {
            chunk.retryCount = retryCount;
            const errorInfo = classifyError(error);
            logger.warn(
              `分片 ${chunk.index} 上传失败，正在重试`,
              {
                chunkIndex: chunk.index,
                retryCount,
                maxRetries,
                errorType: errorInfo.type,
                taskId: task.id
              },
              errorInfo.originalError
            );
          }
        }
      );

      chunk.status = ChunkStatus.SUCCESS;
      chunk.result = result;
      chunk.uploadTime = performance.now() - startTime;
      chunk.error = undefined;

      // 记录性能指标
      performanceMonitor.recordChunkUploadTime(chunk.uploadTime);
      performanceMonitor.recordNetworkRequest();

      // 上传成功后释放 blob 引用以节省内存
      // 如果不需要断点续传，可以立即释放
      if (!this.config.enableResume || !this.config.enableCache) {
        chunk.blob = null;
      }

      // 更新进度
      this.progressCallback(chunk, chunk.size, chunk.uploadTime);

      return result;
    } catch (error: unknown) {
      const errorInfo = classifyError(error);

      chunk.status = ChunkStatus.ERROR;
      // 确保 error 是 Error 类型
      chunk.error = errorInfo.originalError || (error instanceof Error ? error : new Error(String(error)));

      // 如果是中止错误，不抛出，让调用者处理
      if (errorInfo.type === ErrorType.ABORT_ERROR) {
        throw error;
      }

      // 如果不可重试或已达到最大重试次数，抛出详细错误
      if (!errorInfo.retryable || chunk.retryCount >= maxRetries) {
        let detailedError: UploadError;

        switch (errorInfo.type) {
          case ErrorType.NETWORK_ERROR:
            detailedError = new NetworkError(
              `分片 ${chunk.index} 上传失败: ${errorInfo.message}`,
              { chunkIndex: chunk.index, taskId: task.id, retryCount: chunk.retryCount },
              errorInfo.originalError
            );
            break;
          case ErrorType.TIMEOUT_ERROR:
            detailedError = new TimeoutError(
              `分片 ${chunk.index} 上传超时: ${errorInfo.message}`,
              this.config.timeout,
              errorInfo.originalError
            );
            break;
          case ErrorType.SERVER_ERROR:
            detailedError = new ServerError(
              `分片 ${chunk.index} 服务器错误: ${errorInfo.message}`,
              errorInfo.code as number,
              undefined,
              errorInfo.originalError
            );
            break;
          default:
            detailedError = new UploadError(
              `分片 ${chunk.index} 上传失败: ${errorInfo.message}${errorInfo.code ? ` (${errorInfo.code})` : ''}`,
              errorInfo.type,
              {
                code: errorInfo.code,
                context: { chunkIndex: chunk.index, taskId: task.id },
                retryable: errorInfo.retryable,
                cause: errorInfo.originalError
              }
            );
        }

        logger.error(
          `分片 ${chunk.index} 上传最终失败`,
          {
            chunkIndex: chunk.index,
            taskId: task.id,
            retryCount: chunk.retryCount,
            errorType: errorInfo.type
          },
          detailedError
        );

        throw detailedError;
      }

      throw error;
    }
  }

  /**
   * 合并分片（带超时和错误处理）
   */
  async mergeChunks(task: FileTask, abortSignal: AbortSignal): Promise<MergeResponse> {
    try {
      const requestData = this.config.mergeChunksTransformer!({
        task,
        customParams: this.config.customParams
      });

      const { body, headers: bodyHeaders } = buildRequestBody(requestData);
      const headers = {
        ...this.config.headers,
        ...bodyHeaders
      };

      const response = await fetchWithTimeout(this.config.mergeChunksUrl, {
        method: 'POST',
        headers,
        body,
        signal: abortSignal,
        timeout: this.config.timeout || CONSTANTS.UPLOAD.TIMEOUT
      });

      if (!response.ok) {
        throw new ServerError(
          `合并分块失败: ${response.status} ${response.statusText}`,
          response.status,
          response.statusText
        );
      }

      return await response.json();
    } catch (error: unknown) {
      const errorInfo = classifyError(error);
      let detailedError: UploadError;

      switch (errorInfo.type) {
        case ErrorType.NETWORK_ERROR:
          detailedError = new NetworkError(
            `合并分片失败: ${errorInfo.message}`,
            { taskId: task.id },
            errorInfo.originalError
          );
          break;
        case ErrorType.TIMEOUT_ERROR:
          detailedError = new TimeoutError(
            `合并分片超时: ${errorInfo.message}`,
            this.config.timeout,
            errorInfo.originalError
          );
          break;
        case ErrorType.SERVER_ERROR:
          detailedError = new ServerError(
            `合并分片服务器错误: ${errorInfo.message}`,
            errorInfo.code as number,
            undefined,
            errorInfo.originalError
          );
          break;
        default:
          detailedError = new UploadError(
            `合并分片失败: ${errorInfo.message}${errorInfo.code ? ` (${errorInfo.code})` : ''}`,
            errorInfo.type,
            {
              code: errorInfo.code,
              context: { taskId: task.id },
              retryable: errorInfo.retryable,
              cause: errorInfo.originalError
            }
          );
      }

      logger.error(
        '合并分片失败',
        { taskId: task.id, errorType: errorInfo.type },
        detailedError
      );

      throw detailedError;
    }
  }
}

