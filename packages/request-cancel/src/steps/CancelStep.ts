/**
 * 取消步骤
 * 职责：管理请求取消Token，支持按条件取消请求
 */

import type { RequestStep, RequestContext } from '@suga/request-core';
import type { CancelOptions, CancelMeta } from '../types';
import { CancelTokenManager } from '../managers/CancelTokenManager';

/**
 * 取消步骤配置
 */
export interface CancelStepOptions {
  /** 取消Token管理器实例 */
  cancelTokenManager?: CancelTokenManager;
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
 * 取消步骤
 */
export class CancelStep implements RequestStep {
  private cancelTokenManager: CancelTokenManager;
  private defaultOptions?: CancelOptions;

  constructor(options: CancelStepOptions = {}) {
    this.cancelTokenManager = options.cancelTokenManager ?? new CancelTokenManager();
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

    // 创建 cancel token
    const cancelTokenSource = this.cancelTokenManager.createCancelToken(
      requestId,
      {
        url: ctx.config.url,
        method: ctx.config.method,
      },
    );

    // 将 cancel token 存储到 meta 中，供 TransportStep 使用
    // TransportStep 会从 meta 读取 cancelToken 并添加到请求配置中
    ctx.meta._cancelTokenSource = cancelTokenSource;
    ctx.meta._cancelToken = cancelTokenSource.token;

    try {
      await next();

      // 请求成功，清理 cancel token
      this.cancelTokenManager.remove(requestId);
    } catch (error) {
      // 请求失败，清理 cancel token（除非是取消错误，cancel 方法已清理）
      if (this.cancelTokenManager.has(requestId)) {
        this.cancelTokenManager.remove(requestId);
      }

      throw error;
    }
  }

  /**
   * 获取取消Token管理器（用于外部取消请求）
   */
  getCancelTokenManager(): CancelTokenManager {
    return this.cancelTokenManager;
  }
}

