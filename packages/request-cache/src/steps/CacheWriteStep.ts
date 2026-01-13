/**
 * 缓存写入步骤
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type { CachePolicy, CacheConfig } from '../policies';
import { createCachePolicy } from '../policies';
import { RequestCacheManager } from '../managers/RequestCacheManager';
import type { CacheWriteStepOptions } from '../types/steps';


/**
 * 缓存写入步骤
 */
export class CacheWriteStep implements RequestStep {
  private requestCacheManager: RequestCacheManager;
  private policyFactory: (cache?: CacheConfig) => CachePolicy;

  constructor(options: CacheWriteStepOptions = {}) {
    this.requestCacheManager = options.requestCacheManager ?? new RequestCacheManager();
    this.policyFactory = options.policyFactory ?? createCachePolicy;
  }

  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 先执行下一步（通常是网络请求）
    return next().then(() => {
      // 请求成功后，尝试写入缓存
      if (ctx.error || ctx.result === undefined) {
        // 有错误或没有结果，不写入缓存
        return;
      }

      // 获取缓存配置
      const cacheConfig = ctx.meta.cache as CacheConfig | undefined;

      // 检查缓存配置
      if (cacheConfig === false || cacheConfig === undefined) {
        return;
      }

      const policy: CachePolicy = this.policyFactory(cacheConfig);

      // 判断是否应该写入缓存
      if (!policy.shouldWrite(ctx.config, ctx.result, ctx.meta)) {
        return;
      }

      // 写入缓存
      const ttl = policy.getTTL(ctx.config, ctx.meta);
      this.requestCacheManager.set(ctx.config, ctx.result, ttl);
    });
  }
}
