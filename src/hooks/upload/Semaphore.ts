/* eslint-disable no-plusplus */

/**
 * 信号量类 - 控制并发数
 * 
 * 用于限制并发操作数量，例如上传、下载、请求等场景。
 * 内部维护一个可用许可数和等待队列。
 * 当许可用完时，新的请求会被挂起，直到有许可释放。
 */
export default class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  /**
   * 构造函数
   * 
   * @param permits - 最大并发数
   */
  constructor(permits: number) {
    this.permits = permits;
  }

  /**
   * 获取一个许可
   * 
   * 如果当前有可用许可，则立即返回；否则将等待直到有许可释放。
   * 
   * @returns 一个 Promise，在获取到许可时 resolve
   * 
   * @example
   * ```ts
   * await semaphore.acquire();
   * try {
   *   // 执行受限操作
   * } finally {
   *   semaphore.release();
   * }
   * ```
   */
  async acquire(): Promise<void> {
    return new Promise(resolve => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  /**
   * 释放一个许可
   * 
   * 如果有等待队列，则唤醒队列中的第一个请求，否则增加可用许可数。
   */
  release(): void {
    this.permits++;
    const next = this.queue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}
