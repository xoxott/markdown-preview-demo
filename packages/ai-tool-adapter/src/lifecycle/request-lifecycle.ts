/** 请求生命周期钩子 — LLM API 请求的 before/after/error/onRetry 钩子 */

import type { LLMUsageInfo } from '../types/usage';

/** LLM API 请求上下文 */
export interface LLMRequestContext {
  /** 请求 ID（宿主生成） */
  readonly requestId?: string;
  /** 模型名称 */
  readonly model: string;
  /** 消息数量 */
  readonly messageCount: number;
  /** 工具数量 */
  readonly toolCount: number;
  /** 开始时间戳 */
  readonly startTime: number;
  /** 额外元数据（宿主注入） */
  readonly metadata?: Record<string, unknown>;
}

/** LLM API 响应上下文 */
export interface LLMResponseContext {
  /** 对应的请求上下文 */
  readonly request: LLMRequestContext;
  /** 响应时间戳 */
  readonly endTime: number;
  /** 响应耗时 ms */
  readonly durationMs: number;
  /** 用量信息 */
  readonly usage?: LLMUsageInfo;
  /** 是否成功 */
  readonly success: boolean;
  /** 错误信息（失败时） */
  readonly error?: unknown;
  /** 响应状态码 */
  readonly statusCode?: number;
}

/** LLM 请求生命周期钩子 — 宿主注入实现 */
export interface LLMRequestLifecycleHook {
  /** 请求开始前 */
  beforeRequest?(context: LLMRequestContext): void | Promise<void>;
  /** 请求成功后 */
  afterRequest?(context: LLMResponseContext): void | Promise<void>;
  /** 请求失败后 */
  onError?(context: LLMResponseContext): void | Promise<void>;
  /** 重试前 */
  onRetry?(
    context: LLMRequestContext,
    attempt: number,
    error: unknown,
    delayMs: number
  ): void | Promise<void>;
}

/**
 * 组合多个生命周期钩子为一个
 *
 * 所有钩子按顺序执行，任一钩子抛出错误不影响后续钩子。 错误会被捕获并静默忽略（避免钩子错误阻断主流程）。
 *
 * @param hooks 要组合的钩子列表
 * @returns 组合后的单一钩子
 */
export function composeLifecycleHooks(
  hooks: readonly LLMRequestLifecycleHook[]
): LLMRequestLifecycleHook {
  if (hooks.length === 0) return {};
  if (hooks.length === 1) return hooks[0];

  return {
    async beforeRequest(context: LLMRequestContext): Promise<void> {
      for (const hook of hooks) {
        if (hook.beforeRequest) {
          try {
            await hook.beforeRequest(context);
          } catch {
            /* 钩子错误不阻断主流程 */
          }
        }
      }
    },

    async afterRequest(context: LLMResponseContext): Promise<void> {
      for (const hook of hooks) {
        if (hook.afterRequest) {
          try {
            await hook.afterRequest(context);
          } catch {
            /* 钩子错误不阻断主流程 */
          }
        }
      }
    },

    async onError(context: LLMResponseContext): Promise<void> {
      for (const hook of hooks) {
        if (hook.onError) {
          try {
            await hook.onError(context);
          } catch {
            /* 钩子错误不阻断主流程 */
          }
        }
      }
    },

    async onRetry(
      context: LLMRequestContext,
      attempt: number,
      error: unknown,
      delayMs: number
    ): Promise<void> {
      for (const hook of hooks) {
        if (hook.onRetry) {
          try {
            await hook.onRetry(context, attempt, error, delayMs);
          } catch {
            /* 钩子错误不阻断主流程 */
          }
        }
      }
    }
  };
}
