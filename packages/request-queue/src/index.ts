/**
 * @suga/request-queue
 * Request queue and concurrency control for @suga/request-core
 */

import { QueueManager } from './managers/QueueManager';
import type { QueueConfig } from './types';

// 导出队列步骤
export { QueueStep } from './steps/QueueStep';
export type { QueueStepOptions } from './steps/QueueStep';

// 导出队列管理器
export { QueueManager } from './managers/QueueManager';

// 导出类型
export type * from './types';

// 导出常量
export { DEFAULT_QUEUE_CONFIG } from './constants';

/**
 * 创建请求队列管理器（工厂函数）
 */
export function createRequestQueue(config: QueueConfig): QueueManager {
  return new QueueManager(config);
}

