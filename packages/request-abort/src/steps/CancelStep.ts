/**
 * 中止步骤
 * 职责：管理请求中止，使用 AbortController 支持按条件中止请求
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type { CancelOptions, CancelMeta } from '../types';
import { AbortControllerManager } from '../managers/AbortControllerManager';

/**
 * 中止步骤配置
 */
export interface CancelStepOptions {
  /** AbortController 管理器实例 */
  abortControllerManager?: AbortControllerManager;
  /** 默认取消配置 */
  defaultOptions?: CancelOptions;
}

/**
 * 类型守卫：判断 meta 是否包含 CancelMeta
 */
function isCancelMeta(meta: Record<string, unknown>): meta is CancelMeta {
  return typeof meta === 'object' && meta !== null;
}

/**
 * 解析取消配置
 */
function parseCancelConfig(
  config: boolean | CancelOptions | undefined,
  defaultOptions?: CancelOptions,
): CancelOptions | undefined {
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
export class CancelStep implements RequestStep {
  private abortControllerManager: AbortControllerManager;
  private defaultOptions?: CancelOptions;

  constructor(options: CancelStepOptions = {}) {
    this.abortControllerManager = options.abortControllerManager ?? new AbortControllerManager();
    this.defaultOptions = options.defaultOptions;
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    if (!isCancelMeta(ctx.meta)) {
      return next();
    }

    // 如果未设置，默认启用取消功能
    const cancelConfig = ctx.meta.cancelable ?? true;
    const parsedConfig = parseCancelConfig(cancelConfig, this.defaultOptions);

    // 如果明确禁用取消功能，直接执行下一步
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

    // 将 AbortController 和 signal 存储到 meta 中，供 TransportStep 使用
    // TransportStep 会从 meta.signal 读取并添加到请求配置中
    ctx.meta._abortController = abortController;
    ctx.meta.signal = abortController.signal;

    try {
      await next();

      // 请求成功，清理 AbortController
      this.abortControllerManager.remove(requestId);
    } catch (error) {
      // 请求失败，清理 AbortController（除非是取消错误，cancel 方法已清理）
      if (this.abortControllerManager.has(requestId)) {
        this.abortControllerManager.remove(requestId);
      }

      throw error;
    }
  }

  /**
   * 获取 AbortController 管理器（用于外部取消请求）
   */
  getAbortControllerManager(): AbortControllerManager {
    return this.abortControllerManager;
  }
}

