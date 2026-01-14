/**
 * 去重步骤
 * 职责：防止重复请求，相同请求在时间窗口内只发送一次
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type { DedupeOptions, DedupeMeta } from '../types';
import { DedupeManager } from '../managers/DedupeManager';
import { generateRequestKey } from '../utils/key-generator';

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

    // 判断是否需要自定义键生成（ignore-params 或 custom 策略）
    const needsCustomKey =
      parsedConfig.strategy === 'ignore-params' || parsedConfig.strategy === 'custom';

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

    let key: string;
    if (needsCustomKey) {
      // 自定义策略，需要重新计算键
      key = generateRequestKey(ctx.config, {
        strategy: parsedConfig.strategy ?? 'exact',
        ignoreParams: parsedConfig.ignoreParams ?? [],
        customKeyGenerator: parsedConfig.customKeyGenerator,
      });
    } else {
      // 精确匹配，直接使用 ctx.id
      key = ctx.id;
    }

    await manager.getOrCreateRequestByKey(key, async () => {
      await next();
      if (ctx.error) {
        throw ctx.error;
      }
      return ctx.result;
    });
  }
}

