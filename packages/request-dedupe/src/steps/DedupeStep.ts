/**
 * 去重步骤
 * 职责：防止重复请求，相同请求在时间窗口内只发送一次
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type { DedupeOptions, DedupeMeta } from '../types';
import { DedupeManager } from '../managers/DedupeManager';

/**
 * 去重步骤配置
 */
export interface DedupeStepOptions {
  /** 去重管理器实例 */
  dedupeManager?: DedupeManager;
  /** 默认去重配置 */
  defaultOptions?: DedupeOptions;
}

/**
 * 类型守卫：判断 meta 是否包含 DedupeMeta
 */
function isDedupeMeta(meta: Record<string, unknown>): meta is DedupeMeta {
  return typeof meta === 'object' && meta !== null;
}

/**
 * 解析去重配置
 */
function parseDedupeConfig(
  config: boolean | DedupeOptions | undefined,
  defaultOptions?: DedupeOptions,
): DedupeOptions | undefined {
  if (config === undefined || config === false) {
    return undefined;
  }

  if (typeof config === 'boolean') {
    return config ? defaultOptions ?? {} : undefined;
  }

  if (typeof config === 'object' && config !== null) {
    return { ...defaultOptions, ...config };
  }

  return undefined;
}

/**
 * 去重步骤
 */
export class DedupeStep implements RequestStep {
  private dedupeManager: DedupeManager;
  private defaultOptions?: DedupeOptions;

  constructor(options: DedupeStepOptions = {}) {
    this.dedupeManager = options.dedupeManager ?? new DedupeManager();
    this.defaultOptions = options.defaultOptions;
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    if (!isDedupeMeta(ctx.meta)) {
      return next();
    }

    const dedupeConfig = ctx.meta.dedupe;
    const parsedConfig = parseDedupeConfig(dedupeConfig, this.defaultOptions);

    if (!parsedConfig) {
      return next();
    }

    // 如果配置了自定义选项，创建临时管理器
    let manager = this.dedupeManager;
    if (
      parsedConfig.dedupeWindow ||
      parsedConfig.strategy ||
      parsedConfig.ignoreParams ||
      parsedConfig.customKeyGenerator
    ) {
      // 创建临时管理器，合并配置
      manager = new DedupeManager(parsedConfig);
    }

    // 使用去重管理器执行请求
    await manager.getOrCreateRequest(ctx.config, async () => {
      await next();
      if (ctx.error) {
        throw ctx.error;
      }
      return ctx.result;
    });
  }
}

