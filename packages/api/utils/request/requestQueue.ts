/**
 * 请求队列和并发控制
 * 支持控制并发请求数量，避免服务器压力过大
 */

import type { RequestConfig } from '../../types';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '../../types';
import { internalError } from '../common/internalLogger';

/**
 * 队列策略类型
 */
export type QueueStrategy = 'fifo' | 'priority';

/**
 * 请求优先级
 */
export type RequestPriority = 'high' | 'normal' | 'low';

/**
 * 队列配置
 */
export interface QueueConfig {
  /** 最大并发数 */
  maxConcurrent: number;
  /** 队列策略 */
  queueStrategy?: QueueStrategy;
}

/**
 * 队列中的请求项
 */
interface QueuedRequest {
  /** 请求配置 */
  config: RequestConfig;
  /** 请求函数 */
  requestFn: () => Promise<AxiosResponse<ApiResponse>>;
  /** 优先级 */
  priority: RequestPriority;
  /** 解析 Promise */
  resolve: (value: AxiosResponse<ApiResponse>) => void;
  /** 拒绝 Promise */
  reject: (error: unknown) => void;
  /** 创建时间 */
  createdAt: number;
}

/**
 * 请求队列管理器
 */
export class RequestQueueManager {
  private queue: QueuedRequest[] = [];
  private running: Set<QueuedRequest> = new Set();
  private maxConcurrent: number;
  private queueStrategy: QueueStrategy;

  constructor(config: QueueConfig) {
    this.maxConcurrent = config.maxConcurrent;
    this.queueStrategy = config.queueStrategy || 'fifo';
  }

  /**
   * 获取请求优先级数值（用于排序）
   */
  private getPriorityValue(priority: RequestPriority): number {
    switch (priority) {
      case 'high':
        return 3;
      case 'normal':
        return 2;
      case 'low':
        return 1;
      default:
        return 2;
    }
  }

  /**
   * 排序队列（根据策略）
   */
  private sortQueue(): void {
    if (this.queueStrategy === 'priority') {
      this.queue.sort((a, b) => {
        const priorityDiff = this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        // 优先级相同时，按创建时间排序（FIFO）
        return a.createdAt - b.createdAt;
      });
    }
    // FIFO 策略不需要排序，保持插入顺序
  }

  /**
   * 处理请求完成后的清理和后续处理
   * @param queuedRequest 队列请求
   */
  private handleRequestComplete(queuedRequest: QueuedRequest): void {
    // 从运行中集合移除
    this.running.delete(queuedRequest);
    // 处理下一个请求（添加错误处理，避免队列停止）
    try {
      this.processNext();
    } catch (error) {
      // 如果 processNext 出错，记录错误但继续处理，避免队列停止
      internalError('处理队列请求时出错:', error);
      // 尝试继续处理下一个请求
      try {
        this.processNext();
      } catch {
        // 如果再次失败，静默处理，避免无限递归
      }
    }
  }

  /**
   * 处理队列中的下一个请求
   */
  private async processNext(): Promise<void> {
    // 如果已达到最大并发数，不处理
    if (this.running.size >= this.maxConcurrent) {
      return;
    }

    // 如果没有待处理的请求，返回
    if (this.queue.length === 0) {
      return;
    }

    // 排序队列
    this.sortQueue();

    // 取出队列中的第一个请求
    const queuedRequest = this.queue.shift();
    if (!queuedRequest) {
      return;
    }

    // 添加到运行中集合
    this.running.add(queuedRequest);

    // 执行请求
    queuedRequest
      .requestFn()
      .then(response => {
        queuedRequest.resolve(response);
      })
      .catch(error => {
        queuedRequest.reject(error);
      })
      .finally(() => {
        this.handleRequestComplete(queuedRequest);
      });
  }

  /**
   * 添加请求到队列
   * @param config 请求配置
   * @param requestFn 请求函数
   * @param priority 优先级
   * @returns Promise<AxiosResponse<ApiResponse>>
   */
  async enqueue<T>(
    config: RequestConfig,
    requestFn: () => Promise<AxiosResponse<ApiResponse<T>>>,
    priority: RequestPriority = 'normal',
  ): Promise<AxiosResponse<ApiResponse<T>>> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        config,
        requestFn: requestFn as () => Promise<AxiosResponse<ApiResponse>>,
        priority,
        resolve: resolve as (value: AxiosResponse<ApiResponse>) => void,
        reject,
        createdAt: Date.now(),
      };

      // 添加到队列
      this.queue.push(queuedRequest);

      // 尝试处理下一个请求
      this.processNext();
    });
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 获取运行中的请求数量
   */
  getRunningCount(): number {
    return this.running.size;
  }

  /**
   * 清空队列
   */
  clear(): void {
    // 取消所有待处理的请求
    this.queue.forEach(queuedRequest => {
      queuedRequest.reject(new Error('请求队列已清空'));
    });
    this.queue = [];
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<QueueConfig>): void {
    if (config.maxConcurrent !== undefined) {
      this.maxConcurrent = config.maxConcurrent;
    }
    if (config.queueStrategy !== undefined) {
      this.queueStrategy = config.queueStrategy;
    }
  }
}

/**
 * 创建请求队列管理器
 */
export function createRequestQueue(config: QueueConfig): RequestQueueManager {
  return new RequestQueueManager(config);
}
