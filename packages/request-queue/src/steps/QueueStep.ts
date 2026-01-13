/**
 * 队列步骤
 * 职责：控制请求并发数量，支持队列和优先级
 */

import type { RequestContext, RequestStep } from '@suga/request-core';
import { DEFAULT_QUEUE_CONFIG } from '../constants';
import { QueueManager } from '../managers/QueueManager';
import type { QueueConfig, QueueMeta } from '../types';

/**
 * 队列步骤配置
 */
export interface QueueStepOptions {
  /** 队列管理器实例 */
  queueManager?: QueueManager;
  /** 默认队列配置 */
  defaultConfig?: QueueConfig;
}

/**
 * 类型守卫：判断 meta 是否包含 QueueMeta
 */
function isQueueMeta(meta: Record<string, unknown>): meta is QueueMeta {
  return typeof meta === 'object' && meta !== null;
}

/**
 * 解析队列配置
 */
function parseQueueConfig(
  config: boolean | QueueConfig | undefined,
  defaultConfig?: QueueConfig,
): QueueConfig | undefined {
  if (config === undefined || config === false) {
    return undefined;
  }

  if (typeof config === 'boolean') {
    return config ? defaultConfig : undefined;
  }

  if (typeof config === 'object' && config !== null) {
    return { ...defaultConfig, ...config };
  }

  return undefined;
}

/**
 * 队列步骤
 */
export class QueueStep implements RequestStep {
  private queueManager: QueueManager;
  private defaultConfig?: QueueConfig;

  constructor(options: QueueStepOptions = {}) {
    if (options.queueManager) {
      this.queueManager = options.queueManager;
    } else if (options.defaultConfig) {
      this.queueManager = new QueueManager(options.defaultConfig);
    } else {
      // 使用默认配置创建管理器
      this.queueManager = new QueueManager({
        maxConcurrent: DEFAULT_QUEUE_CONFIG.DEFAULT_MAX_CONCURRENT,
        queueStrategy: DEFAULT_QUEUE_CONFIG.DEFAULT_STRATEGY,
      });
    }
    this.defaultConfig = options.defaultConfig;
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    if (!isQueueMeta(ctx.meta)) {
      return next();
    }

    const queueConfig = ctx.meta.queue;
    const parsedConfig = parseQueueConfig(queueConfig, this.defaultConfig);

    if (!parsedConfig) {
      return next();
    }

    // 如果配置了自定义选项，创建临时管理器
    // 否则使用默认管理器
    const manager =
      parsedConfig.maxConcurrent !== this.defaultConfig?.maxConcurrent ||
      parsedConfig.queueStrategy !== this.defaultConfig?.queueStrategy
        ? new QueueManager(parsedConfig)
        : this.queueManager;

    // 获取优先级
    const priority = ctx.meta.priority ?? DEFAULT_QUEUE_CONFIG.DEFAULT_PRIORITY;

    // 使用队列管理器执行请求
    await manager.enqueue(ctx.config, async () => {
      await next();
      if (ctx.error) {
        throw ctx.error;
      }
      if (ctx.result === undefined) {
        throw new Error('Request completed but no result');
      }
      return ctx.result;
    }, priority);
  }
}

