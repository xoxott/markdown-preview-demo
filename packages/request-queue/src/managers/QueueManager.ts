/**
 * 请求队列管理器
 */

import type { NormalizedRequestConfig } from '@suga/request-core';
import type { QueueConfig, QueuedRequest, RequestPriority } from '../types';
import { DEFAULT_QUEUE_CONFIG } from '../constants';

/**
 * 请求队列管理器
 */
export class QueueManager {
  private queue: QueuedRequest[] = [];
  private running: Set<QueuedRequest> = new Set();
  private maxConcurrent: number;
  private queueStrategy: QueueConfig['queueStrategy'];

  constructor(config: QueueConfig) {
    this.maxConcurrent = config.maxConcurrent;
    this.queueStrategy = config.queueStrategy ?? DEFAULT_QUEUE_CONFIG.DEFAULT_STRATEGY;
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
   */
  private handleRequestComplete(queuedRequest: QueuedRequest): void {
    // 从运行中集合移除
    this.running.delete(queuedRequest);
    // 处理下一个请求
    this.processNext();
  }

  /**
   * 处理队列中的下一个请求
   */
  private processNext(): void {
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
   */
  async enqueue<T>(
    config: NormalizedRequestConfig,
    requestFn: () => Promise<T>,
    priority: RequestPriority = DEFAULT_QUEUE_CONFIG.DEFAULT_PRIORITY,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest<T> = {
        config,
        requestFn,
        priority,
        resolve,
        reject,
        createdAt: Date.now(),
      };

      // 添加到队列
      this.queue.push(queuedRequest as QueuedRequest);

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

