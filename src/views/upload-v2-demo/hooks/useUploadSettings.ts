import { reactive, type Ref } from 'vue';
import { CONSTANTS } from '@/hooks/upload-v2';
import type { UploadConfig } from '@/hooks/upload-v2';
import type { ChunkSizeOption } from '../types';

/**
 * 上传配置管理 Hook
 */
export function useUploadSettings() {
  const settings = reactive<Partial<UploadConfig>>({
    maxConcurrentFiles: CONSTANTS.CONCURRENT.DEFAULT_FILES,
    maxConcurrentChunks: CONSTANTS.CONCURRENT.DEFAULT_CHUNKS,
    chunkSize: CONSTANTS.UPLOAD.CHUNK_SIZE,
    minChunkSize: CONSTANTS.UPLOAD.MIN_CHUNK_SIZE,
    maxChunkSize: CONSTANTS.UPLOAD.MAX_CHUNK_SIZE,
    maxRetries: CONSTANTS.RETRY.MAX_RETRIES,
    retryDelay: CONSTANTS.RETRY.BASE_DELAY,
    retryBackoff: CONSTANTS.RETRY.BACKOFF_MULTIPLIER,
    timeout: CONSTANTS.UPLOAD.TIMEOUT,
    enableResume: true,
    enableDeduplication: false,
    enablePreview: CONSTANTS.PREVIEW.ENABLE_PREVIEW,
    enableCompression: CONSTANTS.COMPRESSION.ENABLE_COMPRESSION,
    useWorker: false,
    enableCache: true,
    enableNetworkAdaptation: true,
    enableSmartRetry: true,
    compressionQuality: CONSTANTS.COMPRESSION.COMPRESSION_QUALITY,
    previewMaxWidth: CONSTANTS.PREVIEW.PREVIEW_MAX_WIDTH,
    previewMaxHeight: CONSTANTS.PREVIEW.PREVIEW_MAX_HEIGHT,
    maxFileSize: CONSTANTS.UPLOAD.MAX_FILESIZE,
    maxFiles: CONSTANTS.UPLOAD.MAX_FILES,
    headers: {},
    customParams: {},
    uploadChunkUrl: 'https://testaest-v1.umi6.com/proxy-minio/upload/chunk',
    mergeChunksUrl: 'https://testaest-v1.umi6.com/proxy-minio/upload/complete',
    checkFileUrl: undefined,
    cancelUploadUrl: undefined
  });

  // 分片大小选项
  const chunkSizeOptions: ChunkSizeOption[] = [
    { label: '512 KB', value: 512 * 1024 },
    { label: '1 MB', value: 1024 * 1024 },
    { label: '2 MB', value: 2 * 1024 * 1024 },
    { label: '5 MB', value: 5 * 1024 * 1024 },
    { label: '10 MB', value: 10 * 1024 * 1024 },
    { label: '20 MB', value: 20 * 1024 * 1024 }
  ];

  return {
    settings,
    chunkSizeOptions
  };
}

