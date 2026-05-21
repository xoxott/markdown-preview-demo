/** 缓存写入步骤 */

import { type RequestContext, type RequestStep, resolveStepMetaFlag } from '@suga/request-core';
import type { CacheConfig, CachePolicy } from '../policies';
import { createCachePolicy } from '../policies';
import { RequestCacheManager } from '../managers/RequestCacheManager';
import type { CacheWriteStepOptions } from '../types/steps';

/** 缓存写入步骤 */
export class CacheWriteStep implements RequestStep {
  private requestCacheManager: RequestCacheManager;
  private policyFactory: (cache?: CacheConfig) => CachePolicy;
  private enabledByDefault: boolean;

  constructor(options: CacheWriteStepOptions = {}) {
    this.requestCacheManager = options.requestCacheManager ?? new RequestCacheManager();
    this.policyFactory = options.policyFactory ?? createCachePolicy;
    this.enabledByDefault = options.enabledByDefault ?? false;
  }

  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 先执行下一步（通常是网络请求）
    return next().then(() => {
      // 请求成功后，尝试写入缓存
      if (ctx.error || ctx.result === undefined) {
        // 有错误或没有结果，不写入缓存
        return;
      }

      const cacheConfig = resolveStepMetaFlag(
        ctx.meta.cache as CacheConfig | false | undefined,
        this.enabledByDefault
      );

      if (cacheConfig === undefined) {
        return;
      }

      const policy: CachePolicy = this.policyFactory(cacheConfig);
      const metaForPolicy = { ...ctx.meta, cache: cacheConfig };

      // 判断是否应该写入缓存
      if (!policy.shouldWrite(ctx.config, ctx.result, metaForPolicy)) {
        return;
      }

      // 写入缓存（直接使用 ctx.id，避免重复计算）
      const ttl = policy.getTTL(ctx.config, metaForPolicy);
      this.requestCacheManager.setByKey(ctx.id, ctx.result, ttl);
    });
  }
}
