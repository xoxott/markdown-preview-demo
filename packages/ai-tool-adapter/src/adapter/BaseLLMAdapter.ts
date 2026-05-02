/** 基础 LLM 适配器 — 共享 HTTP 请求基础设施 + 宿主注入扩展 */

import type {
  AgentMessage,
  LLMProvider,
  LLMStreamChunk,
  ToolDefinition
} from '@suga/ai-agent-loop';
import type { AnyBuiltTool } from '@suga/ai-tool-core';
import type { BaseLLMAdapterConfig } from '../types/adapter';
import { DEFAULT_ADAPTER_TIMEOUT } from '../types/adapter';
import type { UsageTracker } from '../types/usage';
import type { RateLimitProvider } from '../types/rate-limit';
import type { SessionIngressProvider } from '../types/session-ingress';
import type { AuthRefreshProvider, RetryContext } from '../types/retry-providers';
import type { LLMRequestLifecycleHook } from '../lifecycle/request-lifecycle';
import type { LLMRetryConfig } from '../retry/retry-strategy';

/**
 * 基础 LLM 适配器（抽象类）
 *
 * 提供共享的 HTTP 请求基础设施：
 *
 * - fetchWithAbort：级联超时 + 外部中断信号
 * - 请求头构建
 * - 宿主注入：UsageTracker / LifecycleHook / RetryConfig
 *
 * 具体 Provider 适配器继承此基类，实现 callModel 和 formatToolDefinition。
 */
export abstract class BaseLLMAdapter implements LLMProvider {
  protected readonly config: BaseLLMAdapterConfig;
  /** 用量追踪器（宿主注入） */
  private usageTracker?: UsageTracker;
  /** 生命周期钩子（宿主注入） */
  private lifecycleHook?: LLMRequestLifecycleHook;
  /** 重试配置（宿主注入） */
  private retryConfig?: LLMRetryConfig;
  /** Rate Limit Provider（宿主注入） */
  private rateLimitProvider?: RateLimitProvider;
  /** Session Ingress Provider（宿主注入） */
  private sessionIngress?: SessionIngressProvider;
  /** Auth Refresh Provider（宿主注入，P32新增） */
  private authRefreshProvider?: AuthRefreshProvider;
  /** Retry Context（P32新增，传递 maxTokensOverride 等调整参数） */
  private retryContext?: RetryContext;

  constructor(config: BaseLLMAdapterConfig) {
    this.config = config;
  }

  /** 设置用量追踪器（宿主注入） */
  setUsageTracker(tracker: UsageTracker): void {
    this.usageTracker = tracker;
  }

  /** 获取用量追踪器 */
  getUsageTracker(): UsageTracker | undefined {
    return this.usageTracker;
  }

  /** 设置生命周期钩子（宿主注入） */
  setLifecycleHook(hook: LLMRequestLifecycleHook): void {
    this.lifecycleHook = hook;
  }

  /** 获取生命周期钩子 */
  getLifecycleHook(): LLMRequestLifecycleHook | undefined {
    return this.lifecycleHook;
  }

  /** 设置重试配置（宿主注入） */
  setRetryConfig(config: LLMRetryConfig): void {
    this.retryConfig = config;
  }

  /** 获取重试配置 */
  getRetryConfig(): LLMRetryConfig | undefined {
    return this.retryConfig;
  }

  /** 设置 Rate Limit Provider（宿主注入） */
  setRateLimitProvider(provider: RateLimitProvider): void {
    this.rateLimitProvider = provider;
  }

  /** 获取 Rate Limit Provider */
  getRateLimitProvider(): RateLimitProvider | undefined {
    return this.rateLimitProvider;
  }

  /** 设置 Session Ingress Provider（宿主注入） */
  setSessionIngress(ingress: SessionIngressProvider): void {
    this.sessionIngress = ingress;
  }

  /** 获取 Session Ingress Provider */
  getSessionIngress(): SessionIngressProvider | undefined {
    return this.sessionIngress;
  }

  /** 设置 Auth Refresh Provider（宿主注入，P32新增） */
  setAuthRefreshProvider(provider: AuthRefreshProvider): void {
    this.authRefreshProvider = provider;
  }

  /** 获取 Auth Refresh Provider */
  getAuthRefreshProvider(): AuthRefreshProvider | undefined {
    return this.authRefreshProvider;
  }

  /** 设置 Retry Context（P32新增） */
  setRetryContext(context: RetryContext): void {
    this.retryContext = context;
  }

  /** 获取 Retry Context */
  getRetryContext(): RetryContext | undefined {
    return this.retryContext;
  }

  abstract callModel(
    messages: readonly AgentMessage[],
    tools?: readonly ToolDefinition[],
    options?: import('@suga/ai-agent-loop').CallModelOptions
  ): AsyncGenerator<LLMStreamChunk>;

  abstract formatToolDefinition(tool: AnyBuiltTool): ToolDefinition;

  /**
   * 发送 HTTP 请求（级联超时 + 外部中断信号）
   *
   * 创建内部 AbortController，级联：
   *
   * 1. 超时 AbortController → timeout ms 后自动 abort
   * 2. 外部 signal → 用户手动 abort 时级联触发
   *
   * @param url 请求 URL
   * @param body 请求体（JSON 可序列化对象）
   * @param signal 外部中断信号
   * @param headers 额外请求头
   * @returns Response 对象
   */
  protected async fetchWithAbort(
    url: string,
    body: unknown,
    signal?: AbortSignal,
    headers?: Record<string, string>
  ): Promise<Response> {
    const timeout = this.config.timeout ?? DEFAULT_ADAPTER_TIMEOUT;

    // 创建超时 AbortController
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    // 创建组合 AbortController，级联超时 + 外部 signal
    const combinedController = new AbortController();

    // 超时 → 级联
    timeoutController.signal.addEventListener('abort', () => combinedController.abort(), {
      once: true
    });

    // 外部 signal → 级联
    if (signal) {
      signal.addEventListener('abort', () => combinedController.abort(), { once: true });
      // 如果外部信号已经 aborted，立即触发
      if (signal.aborted) {
        combinedController.abort();
      }
    }

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
      ...this.config.customHeaders
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(body),
        signal: combinedController.signal
      });

      return response;
    } catch (err) {
      // 区分中断错误和普通错误
      if (combinedController.signal.aborted) {
        if (signal?.aborted) {
          throw new DOMException('请求被中断', 'AbortError');
        }
        throw new Error(`请求超时 (${timeout}ms)`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
