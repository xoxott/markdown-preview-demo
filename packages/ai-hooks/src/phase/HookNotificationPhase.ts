/** HookNotificationPhase — 模型通知输出的 Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { NotificationInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookNotificationPhase — 模型通知输出的 Hook 拦截
 *
 * 在 PostProcessPhase 之后插入（洋葱模型后置逻辑）：
 *
 * 1. yield* next() 先执行后续阶段
 * 2. 检查 ctx.meta 中的通知信息
 * 3. 执行 Notification hooks
 *
 * Notification hooks 在模型生成通知性输出时触发，用于：
 * - 转发通知到外部系统（Slack/邮件等）
 * - 记录通知日志
 * - 过滤/修改通知内容
 */
export class HookNotificationPhase implements LoopPhase {
  private readonly executor: HookExecutor;

  constructor(registryOrDeps: HookRegistry | HookExecutorDeps) {
    if ('registry' in registryOrDeps && 'runnerRegistry' in registryOrDeps) {
      const deps = registryOrDeps as HookExecutorDeps;
      this.executor = new HookExecutor(deps.registry, deps.runnerRegistry, deps.sessionStore);
    } else {
      const registry = registryOrDeps as HookRegistry;
      const runnerRegistry = new RunnerRegistryImpl();
      runnerRegistry.register(new CallbackRunner());
      this.executor = new HookExecutor(registry, runnerRegistry);
    }
  }

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    yield* next();

    // 检查是否有通知信息 → 执行 Notification hooks
    const notificationMessage = ctx.meta.notificationMessage as string | undefined;
    const notificationToolName = ctx.meta.notificationToolName as string | undefined;

    if (notificationMessage) {
      const matchingHooks = this.executor.getMatchingHookDefinitions('Notification');
      if (matchingHooks.length > 0) {
        const hookContext = this.buildHookContext(ctx);

        const input: NotificationInput = {
          hookEventName: 'Notification',
          message: notificationMessage,
          toolName: notificationToolName
        };

        const aggregated = await this.executor.execute('Notification', input, hookContext);

        if (aggregated.additionalContexts.length > 0) {
          const existing = (ctx.meta.hookAdditionalContexts as string[]) ?? [];
          ctx.meta.hookAdditionalContexts = [...existing, ...aggregated.additionalContexts];
        }
      }
    }
  }

  /** 构建 HookExecutionContext */
  private buildHookContext(ctx: MutableAgentContext): HookExecutionContext {
    const state = ctx.state;
    const abortController = state.toolUseContext.abortController;

    return {
      sessionId: state.sessionId,
      abortSignal: abortController.signal,
      toolRegistry: state.toolUseContext.tools,
      meta: ctx.meta
    };
  }
}