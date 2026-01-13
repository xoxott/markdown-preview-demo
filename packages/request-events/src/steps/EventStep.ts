/**
 * 事件步骤
 * 职责：触发请求生命周期事件
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import { EventManager } from '../managers/EventManager';

/**
 * 事件步骤配置
 */
export interface EventStepOptions {
  /** 事件管理器实例 */
  eventManager?: EventManager;
}

/**
 * 事件步骤
 */
export class EventStep implements RequestStep {
  private eventManager: EventManager;
  private startTimes = new Map<string, number>();

  constructor(options: EventStepOptions = {}) {
    this.eventManager = options.eventManager ?? new EventManager();
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    const requestId = ctx.id;
    const startTime = Date.now();
    this.startTimes.set(requestId, startTime);

    // 触发请求开始事件
    this.eventManager.emit('request:start', {
      config: ctx.config,
      timestamp: startTime,
    });

    try {
      await next();

      const duration = Date.now() - startTime;
      this.startTimes.delete(requestId);

      if (ctx.error) {
        // 触发请求错误事件
        this.eventManager.emit('request:error', {
          config: ctx.config,
          error: ctx.error,
          timestamp: Date.now(),
          duration,
        });
      } else if (ctx.result !== undefined) {
        // 触发请求成功事件
        this.eventManager.emit('request:success', {
          config: ctx.config,
          result: ctx.result,
          timestamp: Date.now(),
          duration,
        });
      }

      // 触发请求完成事件
      this.eventManager.emit('request:complete', {
        config: ctx.config,
        timestamp: Date.now(),
        duration,
        success: ctx.error === undefined,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.startTimes.delete(requestId);

      // 触发请求错误事件
      this.eventManager.emit('request:error', {
        config: ctx.config,
        error,
        timestamp: Date.now(),
        duration,
      });

      // 触发请求完成事件
      this.eventManager.emit('request:complete', {
        config: ctx.config,
        timestamp: Date.now(),
        duration,
        success: false,
      });

      throw error;
    }
  }
}

