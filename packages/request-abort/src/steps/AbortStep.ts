/**
 * 中止步骤
 * 职责：管理请求中止，使用 AbortController 支持按条件中止请求
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type { AbortOptions, AbortMeta } from '../types';
import { AbortControllerManager } from '../managers/AbortControllerManager';

/**
 * 中止步骤配置
 */
export interface AbortStepOptions {
  /** AbortController 管理器实例 */
  abortControllerManager?: AbortControllerManager;
  /** 默认中止配置 */
  defaultOptions?: AbortOptions;
}

/**
 * 类型守卫：判断 meta 是否包含 AbortMeta
 */
function isAbortMeta(meta: Record<string, unknown>): meta is AbortMeta {
  return typeof meta === 'object' && meta !== null;
}

/**
 * 解析中止配置
 */
function parseAbortConfig(
  config: boolean | AbortOptions | undefined,
  defaultOptions?: AbortOptions,
): AbortOptions | undefined {
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
 * 中止步骤
 */
export class AbortStep implements RequestStep {
  private abortControllerManager: AbortControllerManager;
  private defaultOptions?: AbortOptions;

  constructor(options: AbortStepOptions = {}) {
    this.abortControllerManager = options.abortControllerManager ?? new AbortControllerManager();
    this.defaultOptions = options.defaultOptions;
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    if (!isAbortMeta(ctx.meta)) {
      return next();
    }

    // 如果未设置，默认启用中止功能
    const abortConfig = ctx.meta.abortable ?? true;
    const parsedConfig = parseAbortConfig(abortConfig, this.defaultOptions);

    // 如果明确禁用中止功能，直接执行下一步
    if (!parsedConfig) {
      return next();
    }

    // 使用 ctx.id 作为 requestId（ctx.id 在 core 中已经生成好了）
    const requestId = ctx.id;

    // 创建 AbortController
    const abortController = this.abortControllerManager.createAbortController(
      requestId,
      {
        url: ctx.config.url,
        method: ctx.config.method,
      },
    );

    ctx.meta.signal = abortController.signal;

    try {
      await next();

      // 请求成功，清理 AbortController
      this.abortControllerManager.remove(requestId);
    } catch (error) {
      // 请求失败，清理 AbortController（除非是中止错误，abort 方法已清理）
      if (this.abortControllerManager.has(requestId)) {
        this.abortControllerManager.remove(requestId);
      }

      throw error;
    }
  }

  /**
   * 获取 AbortController 管理器（用于外部中止请求）
   */
  getAbortControllerManager(): AbortControllerManager {
    return this.abortControllerManager;
  }
}

