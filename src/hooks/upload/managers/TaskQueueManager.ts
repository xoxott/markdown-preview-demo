/*
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-21 14:09:49
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-21 14:10:00
 * @FilePath: \markdown-preview-demo\src\hooks\upload\TaskQueueManager.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import SmartChunkCalculator from "../calculators/SmartChunkCalculator";
import { FileTask, FileUploadOptions, UploadConfig, UploadStatus } from "../type";
import { generateUUID } from "../utils";



// ==================== 工具类：任务队列管理器 ====================
/**
 * 任务队列管理器
 * 
 * 负责管理文件上传任务队列，包括：
 *  - 根据优先级和文件大小排序任务
 *  - 判断重复文件
 *  - 创建上传任务对象
 */
export default class TaskQueueManager {
  private priorities = { high: 3, normal: 2, low: 1 } as const;

  /**
   * 对任务队列进行排序
   * 
   * 排序规则：
   *  1. 优先级高的任务排在前面（high > normal > low）
   *  2. 优先级相同按文件大小升序
   * 
   * @param queue - 待排序的任务队列
   */
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

  /**
   * 判断文件是否在已有任务队列中重复
   * 
   * @param file - 待检测文件
   * @param allTasks - 当前所有任务
   * @returns 如果文件名、大小和最后修改时间都匹配，则返回 true
   */
  isDuplicate(file: File, allTasks: FileTask[]): boolean {
    return allTasks.some(task =>
      task.file.name === file.name &&
      task.file.size === file.size &&
      task.file.lastModified === file.lastModified
    );
  }

  /**
   * 创建一个上传任务对象
   * 
   * @param file - 原始文件
   * @param processedFile - 处理后的文件（例如压缩后的文件）
   * @param options - 上传选项
   * @param config - 上传全局配置
   * @param avgSpeed - 当前平均上传速度（用于分片计算）
   * @param preview - 可选预览信息
   * @returns 一个完整的 FileTask 对象
   */
  createTask(
    file: File,
    processedFile: File,
    options: FileUploadOptions,
    config: UploadConfig,
    avgSpeed: number,
    preview?: string
  ): FileTask {
    return {
      // id: generateId(),
      id: generateUUID(),
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
      uploadedSize:0,
      result: null,
      error: null,
      fileMD5:'',
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
