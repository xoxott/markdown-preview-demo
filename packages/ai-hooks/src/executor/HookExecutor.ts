/** HookExecutor — Hook 执行引擎 */

import type { HookRegistry } from '../registry/HookRegistry';
import type {
  AggregatedHookResult,
  HookDefinition,
  HookEvent,
  HookExecutionContext,
  HookResult
} from '../types/hooks';
import type {
  HookInput,
  NotificationInput,
  PostCompactInput,
  PostToolUseFailureInput,
  PostToolUseInput,
  PreCompactInput,
  PreToolUseInput,
  SessionEndInput,
  SessionStartInput,
  StopFailureInput,
  StopInput,
  UserPromptSubmitInput
} from '../types/input';
import { DEFAULT_HOOK_TIMEOUT } from '../constants';
import { aggregateHookResults } from '../utils/aggregate';

/**
 * Hook 执行引擎
 *
 * 执行策略:
 *
 * - 并行: 所有匹配的 hooks 同时启动，独立超时
 * - 聚合: deny > ask > allow > passthrough 优先级
 * - 超时: 每个 hook 有独立 AbortSignal（timeout + 外部 signal 级联）
 * - once: 执行后自动从 registry 移除
 * - 空匹配: 无匹配 hooks 时立即返回快速路径
 */
export class HookExecutor {
  constructor(private readonly registry: HookRegistry) {}

  /** 获取匹配的 Hook 定义列表（用于 Phase 的快速路径判断） */
  getMatchingHookDefinitions(event: HookEvent, matchQuery?: string): HookDefinition[] {
    return this.registry.getMatchingHooks(event, matchQuery);
  }

  /** 通用执行入口 — 根据事件类型自动路由 */
  async execute(
    event: HookExecutorEventType,
    input: HookInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    const matchQuery = this.extractMatchQuery(input);
    const matchingHooks = this.registry.getMatchingHooks(event, matchQuery);

    // 快速路径: 无匹配 hooks
    if (matchingHooks.length === 0) {
      return {
        outcome: 'success',
        preventContinuation: false,
        additionalContexts: [],
        errors: []
      };
    }

    // 并行执行所有匹配 hooks
    const results = await this.executeHooksParallel(matchingHooks, input, context);

    // 聚合结果
    const aggregated = aggregateHookResults(results);

    // once hooks 执行后自动移除
    for (const hook of matchingHooks) {
      if (hook.once === true) {
        this.registry.markOnceHookExecuted(hook.name);
      }
    }

    return aggregated;
  }

  /** PreToolUse 专用方法 */
  async executePreToolUse(
    input: PreToolUseInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('PreToolUse', input, context);
  }

  /** PostToolUse 专用方法 */
  async executePostToolUse(
    input: PostToolUseInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('PostToolUse', input, context);
  }

  /** PostToolUseFailure 专用方法 */
  async executePostToolUseFailure(
    input: PostToolUseFailureInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('PostToolUseFailure', input, context);
  }

  /** Stop 专用方法 */
  async executeStop(
    input: StopInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('Stop', input, context);
  }

  /** StopFailure 专用方法 — 循环异常终止 */
  async executeStopFailure(
    input: StopFailureInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('StopFailure', input, context);
  }

  /** SessionStart 专用方法 — 循环开始 */
  async executeSessionStart(
    input: SessionStartInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('SessionStart', input, context);
  }

  /** SessionEnd 专用方法 — 循环结束 */
  async executeSessionEnd(
    input: SessionEndInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('SessionEnd', input, context);
  }

  /** UserPromptSubmit 专用方法 — 用户消息提交前 */
  async executeUserPromptSubmit(
    input: UserPromptSubmitInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('UserPromptSubmit', input, context);
  }

  /** Notification 专用方法 — 模型通知输出 */
  async executeNotification(
    input: NotificationInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('Notification', input, context);
  }

  /** PreCompact 专用方法 — 压缩前拦截 */
  async executePreCompact(
    input: PreCompactInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('PreCompact', input, context);
  }

  /** PostCompact 专用方法 — 压缩后通知 */
  async executePostCompact(
    input: PostCompactInput,
    context: HookExecutionContext
  ): Promise<AggregatedHookResult> {
    return this.execute('PostCompact', input, context);
  }

  /** 并行执行所有匹配 hooks — 每个 hook 有独立超时 */
  private async executeHooksParallel(
    hooks: HookDefinition[],
    input: HookInput,
    context: HookExecutionContext
  ): Promise<HookResult[]> {
    const promises = hooks.map(async (hook): Promise<HookResult> => {
      const timeout = hook.timeout ?? DEFAULT_HOOK_TIMEOUT;

      // 创建级联 AbortSignal: timeout + 外部 signal
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

      const combinedController = new AbortController();

      // 超时 → 级联
      timeoutController.signal.addEventListener('abort', () => combinedController.abort(), {
        once: true
      });

      // 外部 signal → 级联
      context.abortSignal.addEventListener('abort', () => combinedController.abort(), {
        once: true
      });
      if (context.abortSignal.aborted) {
        combinedController.abort();
      }

      const hookContext: HookExecutionContext = {
        ...context,
        abortSignal: combinedController.signal
      };

      try {
        const result = await hook.handler(input, hookContext);

        // 已被中断 → 标记 cancelled
        if (combinedController.signal.aborted) {
          return {
            outcome: 'cancelled',
            preventContinuation: false,
            stopReason: context.abortSignal.aborted
              ? '外部中断'
              : `Hook "${hook.name}" 超时 (${timeout}ms)`
          };
        }

        return result;
      } catch (err) {
        // 中断 → cancelled
        if (combinedController.signal.aborted) {
          return {
            outcome: 'cancelled',
            preventContinuation: false,
            stopReason: context.abortSignal.aborted
              ? '外部中断'
              : `Hook "${hook.name}" 超时 (${timeout}ms)`
          };
        }

        // 其他错误 → non_blocking_error（不影响其他 hooks 执行）
        return {
          outcome: 'non_blocking_error',
          error: err instanceof Error ? err.message : String(err),
          preventContinuation: false
        };
      } finally {
        clearTimeout(timeoutId);
      }
    });

    return Promise.all(promises);
  }

  /**
   * 从 HookInput 提取 matchQuery
   *
   * - PreToolUse/PostToolUse/PostToolUseFailure → toolName
   * - Notification → toolName (可选)
   * - 其他事件 → 无 matcher
   */
  private extractMatchQuery(input: HookInput): string | undefined {
    if (
      input.hookEventName === 'PreToolUse' ||
      input.hookEventName === 'PostToolUse' ||
      input.hookEventName === 'PostToolUseFailure'
    ) {
      return input.toolName;
    }
    if (input.hookEventName === 'Notification') {
      return input.toolName;
    }
    // 其他事件无 matcher
    return undefined;
  }
}

/** HookExecutorEventType — 与 HookEvent 一致，用于类型约束 */
type HookExecutorEventType = HookEvent;
