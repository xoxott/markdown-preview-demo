/**
 * 缓存读取步骤
 * 职责：读缓存、标记 ctx.state.fromCache
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type { CachePolicy, CacheConfig } from '../policies';
import { createCachePolicy } from '../policies';
import { RequestCacheManager } from '../managers/RequestCacheManager';
import type { CacheReadStepOptions } from '../types/steps';


/**
 * 缓存读取步骤
 */
export class CacheReadStep implements RequestStep {
  private requestCacheManager: RequestCacheManager;
  private policyFactory: (cache?: CacheConfig) => CachePolicy;

  constructor(options: CacheReadStepOptions = {}) {
    this.requestCacheManager = options.requestCacheManager ?? new RequestCacheManager();
    this.policyFactory = options.policyFactory ?? createCachePolicy;
  }

  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 获取缓存配置
    const cacheConfig = ctx.meta.cache as CacheConfig | undefined;

    // 检查缓存配置
    if (cacheConfig === false || cacheConfig === undefined) {
      // 无缓存配置，直接执行下一步
      return next();
    }

    const policy: CachePolicy = this.policyFactory(cacheConfig);

    // 判断是否应该读取缓存
    if (!policy.shouldRead(ctx.config, ctx.meta)) {
      return next();
    }

    // 尝试从缓存读取（直接使用 ctx.id，避免重复计算）
    const cachedData = this.requestCacheManager.getByKey<T>(ctx.id);

    if (cachedData !== null) {
      // 命中缓存
      ctx.result = cachedData;
      ctx.state.fromCache = true;
      // 不再执行后续步骤（包括网络请求）
      return Promise.resolve();
    }

    // 未命中缓存，继续执行
    return next();
  }
}
