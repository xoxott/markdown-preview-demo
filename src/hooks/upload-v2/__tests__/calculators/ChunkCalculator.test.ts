/**
 * ChunkCalculator 测试
 */
import { describe, expect, it } from 'vitest';
import { ChunkCalculator } from '../../calculators/ChunkCalculator';
import { CONSTANTS } from '../../constants';
import type { UploadConfig } from '../../types';

describe('ChunkCalculator', () => {
  const config: UploadConfig = {
    maxConcurrentFiles: 10,
    maxConcurrentChunks: 10,
    chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE,
    minChunkSize: CONSTANTS.UPLOAD.MIN_CHUNK_SIZE,
    maxChunkSize: CONSTANTS.UPLOAD.MAX_CHUNK_SIZE,
    maxRetries: CONSTANTS.RETRY.MAX_RETRIES,
    retryDelay: CONSTANTS.RETRY.BASE_DELAY,
    retryBackoff: CONSTANTS.RETRY.BACKOFF_MULTIPLIER,
    uploadChunkUrl: '',
    mergeChunksUrl: '',
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
    previewMaxHeight: CONSTANTS.PREVIEW.PREVIEW_MAX_HEIGHT
  };

  describe('calculateOptimalChunkSize', () => {
    it('应该计算最优分片大小', () => {
      const chunkSize = ChunkCalculator.calculateOptimalChunkSize(10 * 1024 * 1024, 1000, config);
      expect(chunkSize).toBeGreaterThanOrEqual(config.minChunkSize);
      expect(chunkSize).toBeLessThanOrEqual(config.maxChunkSize);
    });

    it('应该根据文件大小调整', () => {
      const smallFile = ChunkCalculator.calculateOptimalChunkSize(5 * 1024 * 1024, 1000, config);
      const largeFile = ChunkCalculator.calculateOptimalChunkSize(2 * 1024 * 1024 * 1024, 1000, config);
      expect(largeFile).toBeGreaterThanOrEqual(smallFile);
    });

    it('应该根据网络速度调整', () => {
      const slowNetwork = ChunkCalculator.calculateOptimalChunkSize(10 * 1024 * 1024, 100, config);
      const fastNetwork = ChunkCalculator.calculateOptimalChunkSize(10 * 1024 * 1024, 5000, config);
      expect(fastNetwork).toBeGreaterThanOrEqual(slowNetwork);
    });

    it('应该确保在允许范围内', () => {
      const chunkSize = ChunkCalculator.calculateOptimalChunkSize(10 * 1024 * 1024, 1000, config);
      expect(chunkSize).toBeGreaterThanOrEqual(config.minChunkSize);
      expect(chunkSize).toBeLessThanOrEqual(config.maxChunkSize);
    });
  });
});

