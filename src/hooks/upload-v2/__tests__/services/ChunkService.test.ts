/**
 * ChunkService 测试
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ChunkService } from '../../services/ChunkService';
import { CONSTANTS } from '../../constants';
import type { UploadConfig, FileTask } from '../../types';
import { UploadStatus } from '../../types';

describe('ChunkService', () => {
  let service: ChunkService;
  let config: UploadConfig;
  let progressCallback: (chunk: any, size: number, time: number) => void;

  beforeEach(() => {
    config = {
      maxConcurrentFiles: 10,
      maxConcurrentChunks: 10,
      chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE,
      minChunkSize: CONSTANTS.UPLOAD.MIN_CHUNK_SIZE,
      maxChunkSize: CONSTANTS.UPLOAD.MAX_CHUNK_SIZE,
      maxRetries: CONSTANTS.RETRY.MAX_RETRIES,
      retryDelay: CONSTANTS.RETRY.BASE_DELAY,
      retryBackoff: CONSTANTS.RETRY.BACKOFF_MULTIPLIER,
      uploadChunkUrl: 'http://test.com/upload',
      mergeChunksUrl: 'http://test.com/merge',
      headers: {},
      timeout: CONSTANTS.UPLOAD.TIMEOUT,
      customParams: {},
      enableResume: true,
      enableDeduplication: false,
      enablePreview: false,
      enableCompression: false,
      useWorker: false,
      enableCache: false,
      enableNetworkAdaptation: false,
      enableSmartRetry: false,
      compressionQuality: CONSTANTS.COMPRESSION.COMPRESSION_QUALITY,
      previewMaxWidth: CONSTANTS.PREVIEW.PREVIEW_MAX_WIDTH,
      previewMaxHeight: CONSTANTS.PREVIEW.PREVIEW_MAX_HEIGHT,
      chunkUploadTransformer: ({ task, chunk }) => {
        const formData = new FormData();
        if (chunk.blob) {
          formData.append('file', chunk.blob);
        }
        formData.append('chunkIndex', String(chunk.index));
        return formData;
      },
      mergeChunksTransformer: ({ task }) => ({
        taskId: task.id,
        totalChunks: task.totalChunks
      })
    };
    progressCallback = vi.fn();
    service = new ChunkService(config, progressCallback);
  });

  describe('createChunks', () => {
    it('应该创建分片', async () => {
      const file = new File(['x'.repeat(5 * 1024 * 1024)], 'test.txt', { type: 'text/plain' });
      const task: FileTask = {
        id: 'test-id',
        file,
        originalFile: undefined,
        status: UploadStatus.PENDING,
        progress: 0,
        speed: 0,
        chunks: [],
        uploadedChunks: 0,
        totalChunks: 0,
        retryCount: 0,
        startTime: null,
        endTime: null,
        pausedTime: 0,
        resumeTime: 0,
        uploadedSize: 0,
        result: null,
        error: null,
        fileMD5: '',
        options: {
          chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE
        }
      };

      const chunks = await service.createChunks(task, CONSTANTS.UPLOAD.CHUNK_SIZE);
      expect(chunks.length).toBeGreaterThan(0);
      expect(task.totalChunks).toBe(chunks.length);
      expect(task.chunks.length).toBe(chunks.length);
    });

    it('应该为每个分片设置正确的属性', async () => {
      const file = new File(['x'.repeat(3 * 1024 * 1024)], 'test.txt', { type: 'text/plain' });
      const task: FileTask = {
        id: 'test-id',
        file,
        originalFile: undefined,
        status: UploadStatus.PENDING,
        progress: 0,
        speed: 0,
        chunks: [],
        uploadedChunks: 0,
        totalChunks: 0,
        retryCount: 0,
        startTime: null,
        endTime: null,
        pausedTime: 0,
        resumeTime: 0,
        uploadedSize: 0,
        result: null,
        error: null,
        fileMD5: '',
        options: {
          chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE
        }
      };

      const chunks = await service.createChunks(task, CONSTANTS.UPLOAD.CHUNK_SIZE);
      expect(chunks[0].index).toBe(0);
      expect(chunks[0].start).toBe(0);
      expect(chunks[0].size).toBeGreaterThan(0);
      // blob 是延迟创建的，初始为 null
      expect(chunks[0].blob).toBeNull();
      // 获取 blob 后应该存在
      const blob = service.getChunkBlob(task, chunks[0]);
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});

