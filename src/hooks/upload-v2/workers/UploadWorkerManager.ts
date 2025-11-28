/**
 * Worker 管理器
 * 负责管理 Web Worker 的生命周期和任务分配
 */
import type { ChunkInfo } from '../types';
import { CONSTANTS } from '../constants';

/** Worker 任务类型 */
export type WorkerTaskType = 'md5' | 'hash' | 'compress';

/** Worker 任务 */
export interface WorkerTask {
  id: string;
  type: WorkerTaskType;
  data: unknown;
  onProgress?: (progress: number) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

/** Worker 管理器配置 */
export interface WorkerManagerConfig {
  maxWorkers?: number;
  workerUrl?: string;
  enableWorker?: boolean;
}

/**
 * Worker 管理器
 * 管理多个 Worker 实例，实现任务队列和负载均衡
 */
export class UploadWorkerManager {
  private workers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, { worker: Worker; task: WorkerTask }>();
  private readonly maxWorkers: number;
  private readonly workerUrl: string;
  private readonly enableWorker: boolean;

  constructor(config: WorkerManagerConfig = {}) {
    this.maxWorkers =
      config.maxWorkers || navigator.hardwareConcurrency || CONSTANTS.WORKER.DEFAULT_COUNT;
    this.workerUrl = config.workerUrl || CONSTANTS.WORKER.DEFAULT_URL;
    this.enableWorker = config.enableWorker ?? true;
  }

  /**
   * 检查是否支持 Worker
   */
  static isSupported(): boolean {
    return typeof Worker !== 'undefined';
  }

  /**
   * 初始化 Worker 池
   */
  private initializeWorkers(): void {
    if (!this.enableWorker || !UploadWorkerManager.isSupported()) {
      return;
    }

    // 创建 Worker 池
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        const worker = new Worker(this.workerUrl, { type: 'module' });
        worker.onmessage = (e) => this.handleWorkerMessage(worker, e);
        worker.onerror = (error) => this.handleWorkerError(worker, error);
        this.workers.push(worker);
      } catch (error) {
        console.warn(`创建 Worker ${i} 失败:`, error);
      }
    }
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(worker: Worker, event: MessageEvent): void {
    // 查找对应的任务
    const activeTask = Array.from(this.activeTasks.entries()).find(
      ([, { worker: w }]) => w === worker
    );

    if (!activeTask) {
      return;
    }

    const [, { task }] = activeTask;

    try {
      const data = event.data;

      if (data.type === 'progress' && task.onProgress) {
        task.onProgress(data.progress);
      } else if (data.type === 'result' && task.onComplete) {
        task.onComplete(data.result);
        this.completeTask(task.id);
      } else if (data.type === 'error' && task.onError) {
        task.onError(new Error(data.error));
        this.completeTask(task.id);
      }
    } catch (error) {
      if (task.onError) {
        task.onError(error instanceof Error ? error : new Error(String(error)));
      }
      this.completeTask(task.id);
    }
  }

  /**
   * 处理 Worker 错误
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    console.error('Worker 错误:', error);

    // 查找对应的任务
    const activeTask = Array.from(this.activeTasks.entries()).find(
      ([, { worker: w }]) => w === worker
    );

    if (activeTask) {
      const [, { task }] = activeTask;
      if (task.onError) {
        task.onError(new Error(error.message || 'Worker 执行失败'));
      }
      this.completeTask(task.id);
    }
  }

  /**
   * 完成任务
   */
  private completeTask(taskId: string): void {
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      this.activeTasks.delete(taskId);
      // 处理下一个任务
      this.processQueue();
    }
  }

  /**
   * 处理任务队列
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) {
      return;
    }

    // 查找空闲的 Worker
    const availableWorker = this.workers.find(
      (worker) => !Array.from(this.activeTasks.values()).some(({ worker: w }) => w === worker)
    );

    if (!availableWorker) {
      return;
    }

    // 获取下一个任务
    const task = this.taskQueue.shift();
    if (!task) {
      return;
    }

    // 分配任务到 Worker
    this.activeTasks.set(task.id, { worker: availableWorker, task });

    // 确保 data 是对象类型才能使用扩展运算符
    const messageData = typeof task.data === 'object' && task.data !== null
      ? { type: task.type, ...(task.data as Record<string, unknown>) }
      : { type: task.type, data: task.data };

    availableWorker.postMessage(messageData);
  }

  /**
   * 提交任务
   */
  submitTask(task: WorkerTask): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // 如果 Worker 不可用，直接拒绝
      if (!this.enableWorker || !UploadWorkerManager.isSupported()) {
        reject(new Error('Worker 不可用'));
        return;
      }

      // 初始化 Worker 池（延迟初始化）
      if (this.workers.length === 0) {
        this.initializeWorkers();
      }

      // 如果没有 Worker 可用，拒绝
      if (this.workers.length === 0) {
        reject(new Error('无法创建 Worker'));
        return;
      }

      // 设置回调
      const originalOnComplete = task.onComplete;
      const originalOnError = task.onError;

      task.onComplete = (result) => {
        if (originalOnComplete) {
          originalOnComplete(result);
        }
        resolve(result);
      };

      task.onError = (error) => {
        if (originalOnError) {
          originalOnError(error);
        }
        reject(error);
      };

      // 添加到队列
      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      // 终止 Worker（如果需要）
      // activeTask.worker.terminate();
      this.activeTasks.delete(taskId);
      return true;
    }

    // 从队列中移除
    const index = this.taskQueue.findIndex((t) => t.id === taskId);
    if (index > -1) {
      this.taskQueue.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): 'pending' | 'running' | 'completed' | 'error' | 'not-found' {
    if (this.activeTasks.has(taskId)) {
      return 'running';
    }

    if (this.taskQueue.some((t) => t.id === taskId)) {
      return 'pending';
    }

    return 'not-found';
  }

  /**
   * 销毁所有 Worker
   */
  destroy(): void {
    // 取消所有任务
    this.activeTasks.forEach(({ task }) => {
      if (task.onError) {
        task.onError(new Error('Worker 管理器已销毁'));
      }
    });

    this.activeTasks.clear();
    this.taskQueue = [];

    // 终止所有 Worker
    this.workers.forEach((worker) => {
      worker.terminate();
    });

    this.workers = [];
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalWorkers: number;
    activeTasks: number;
    queuedTasks: number;
  } {
    return {
      totalWorkers: this.workers.length,
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length
    };
  }
}

