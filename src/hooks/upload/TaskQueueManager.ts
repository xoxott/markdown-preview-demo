/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:09:49
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:10:00
 * @FilePath: \markdown-preview-demo\src\hooks\upload\TaskQueueManager.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import SmartChunkCalculator from "./SmartChunkCalculator";
import { FileTask, FileUploadOptions, UploadConfig, UploadStatus } from "./type";
import { generateId } from "./utils";

// ==================== 工具类：任务队列管理器 ====================
export default class TaskQueueManager {
  private priorities = { high: 3, normal: 2, low: 1 } as const;

  sort(queue: FileTask[]): void {
    queue.sort((a, b) => {
      const aPriority = this.priorities[a.options.priority || 'normal'];
      const bPriority = this.priorities[b.options.priority || 'normal'];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return a.file.size - b.file.size;
    });
  }

  isDuplicate(file: File, allTasks: FileTask[]): boolean {
    return allTasks.some(task =>
      task.file.name === file.name &&
      task.file.size === file.size &&
      task.file.lastModified === file.lastModified
    );
  }

  createTask(file: File, processedFile: File, options: FileUploadOptions, config: UploadConfig, avgSpeed: number, preview?: string): FileTask {
    return {
      id: generateId(),
      file: processedFile,
      originalFile: file !== processedFile ? file : undefined,
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
      result: null,
      error: null,
      options: {
        maxRetries: config.maxRetries,
        chunkSize: SmartChunkCalculator.calculateOptimalChunkSize(
          processedFile.size,
          avgSpeed,
          config
        ),
        priority: 'normal',
        customParams: {},
        metadata: {
          preview,
          originalSize: file.size,
          compressedSize: processedFile.size,
          compressionRatio: file.size > 0 ? processedFile.size / file.size : 1
        },
        ...options
      }
    };
  }
}
