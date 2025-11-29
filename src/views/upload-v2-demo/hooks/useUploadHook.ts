import { useChunkUpload } from '@/hooks/upload-v2';
import type { UploadConfig } from '@/hooks/upload-v2';
import type { UploadHookReturn } from '../types';

const TOKEN = `WGz4LlZ0W8P3+HOaQlLRkcdCuTsJGVrvvTZfdJYY3otxprBxscciMf+yoDBGJ+9f1bA5c+xXMNCkSzTr1aflzW0TcOXtrKagFj0ZvBk//rdHwQUzXVmVkiWN+5LR2wi/oqAnl5o5KmFP5tuTifyd1CUTZdG6aUPvnnHKbYZfevBbpvmuhKqC9Ks2v/NrfBGZ`;

/**
 * 上传 Hook 封装
 */
export function useUploadHook(config: Partial<UploadConfig>): UploadHookReturn {
  const uploadHook = useChunkUpload({
    ...config,
    chunkUploadTransformer: ({ task, chunk }) => {
      const formData = new FormData();
      if (chunk.blob) {
        formData.append('file', chunk.blob);
      }
      formData.append('chunk_number', chunk.index.toString());
      formData.append('upload_id', task.id);
      formData.append('Authorization', TOKEN);
      return formData;
    },
    mergeChunksTransformer: ({ task }) => {
      return {
        upload_id: task.id,
        filename: task.file.name,
        folder: task.file.webkitRelativePath,
        total_chunks: task.totalChunks,
        Authorization: TOKEN
      };
    }
  });

  // 类型安全的返回值 - 使用类型断言，因为 useChunkUpload 返回的类型与我们的接口匹配
  return uploadHook as unknown as UploadHookReturn;
}

