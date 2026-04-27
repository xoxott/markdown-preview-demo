/** 任务序列化工具 将 FileTask 转为可 JSON.stringify 的结构，用于调试/UI 展示 */
import type { ChunkInfo, FileTask, MergeResponse } from '../types';
import type { UploadError } from '../types/error';

/** 序列化 Error（支持 plain Error 和 UploadError） */
export function serializeError(error: Error | null | undefined): Record<string, unknown> | null {
  if (!error) return null;
  if ('toJSON' in error && typeof error.toJSON === 'function') {
    return (error as UploadError).toJSON();
  }
  return {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
}

/** 序列化 File（提取可序列化的元数据） */
export function serializeFile(file: File | undefined): Record<string, unknown> | undefined {
  if (!file) return undefined;
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified
  };
}

/** 序列化 Blob（提取元数据，不含内容） */
export function serializeBlob(blob: Blob | null): Record<string, unknown> | null {
  if (!blob) return null;
  return {
    size: blob.size,
    type: blob.type
  };
}

/** 序列化 ChunkInfo */
export function serializeChunk(chunk: ChunkInfo): Record<string, unknown> {
  return {
    index: chunk.index,
    start: chunk.start,
    end: chunk.end,
    size: chunk.size,
    status: chunk.status,
    retryCount: chunk.retryCount,
    uploadTime: chunk.uploadTime,
    etag: chunk.etag,
    hash: chunk.hash,
    result: chunk.result,
    error: serializeError(chunk.error)
  };
}

/** 序列化 MergeResponse（排除 non-serializable 字段） */
export function serializeMergeResponse(response: MergeResponse): Record<string, unknown> {
  return {
    success: response.success,
    fileUrl: response.fileUrl,
    fileId: response.fileId,
    fileName: response.fileName,
    fileSize: response.fileSize,
    mimeType: response.mimeType,
    error: response.error,
    thumbnail: response.thumbnail,
    doc_id: response.doc_id,
    uploadTime: response.uploadTime
  };
}

/** 序列化 FileTask（完整调试视图） */
export function serializeTask(task: FileTask): Record<string, unknown> {
  return {
    id: task.id,
    file: serializeFile(task.file),
    status: task.status,
    progress: task.progress,
    speed: task.speed,
    uploadedSize: task.uploadedSize,
    uploadedChunks: task.uploadedChunks,
    totalChunks: task.totalChunks,
    retryCount: task.retryCount,
    startTime: task.startTime,
    endTime: task.endTime,
    pausedTime: task.pausedTime,
    resumeTime: task.resumeTime,
    fileMD5: task.fileMD5,
    result: task.result ? serializeMergeResponse(task.result) : null,
    error: serializeError(task.error),
    chunkErrors: task.chunkErrors,
    options: task.options,
    metadata: task.metadata,
    chunks: task.chunks.map(serializeChunk)
  };
}
