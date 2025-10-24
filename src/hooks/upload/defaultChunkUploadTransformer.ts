  // ==================== 默认的请求参数转换器 ====================

import { CheckFileTransformer, ChunkUploadTransformer, MergeChunksTransformer } from "./type";

  /**
 * 默认分块上传参数转换器
 */
export const defaultChunkUploadTransformer: ChunkUploadTransformer = ({
  task,
  chunk,
  customParams = {}
}) => {
  const formData = new FormData();
  formData.append('file', chunk.blob, task.file.name);
  formData.append('chunkIndex', String(chunk.index));
  formData.append('chunkSize', String(chunk.size));
  formData.append('totalChunks', String(task.totalChunks));
  formData.append('fileMD5', task.fileMD5);
  formData.append('fileName', task.file.name);
  formData.append('fileSize', String(task.file.size));
  formData.append('taskId', task.id);


  // 添加自定义参数
  Object.entries(customParams).forEach(([key, value]) => {
    formData.append(key, String(value));
  });

  return formData;
};


/**
 * 默认合并分块参数转换器
 */
export const defaultMergeChunksTransformer: MergeChunksTransformer = ({
  task,
  customParams = {}
}) => {
  return {
    fileMD5:task.fileMD5,
    fileName: task.file.name,
    fileSize: task.file.size,
    totalChunks:task.totalChunks,
    taskId:task.id,
    ...customParams
  };
};


/**
 * 默认秒传检查参数转换器
 */
export const defaultCheckFileTransformer: CheckFileTransformer = ({
  task,
  customParams = {}
}) => {
  return {
    fileMD5:task.fileMD5,
    fileName: task.file.name,
    fileSize: task.file.size,
    ...customParams
  };
};

