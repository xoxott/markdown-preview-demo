/** HookStopPhase — 对话循环结束时的 Stop Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { StopInput } from '../types/input';
import type { HookBlockingError, HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookStopPhase — 对话循环结束时的 Stop Hook
 *
 * 在 PostProcessPhase 后插入（洋葱模型后置逻辑）：
 *
 * 1. yield* next() 先执行 PostProcessPhase
 * 2. 如果 transition 是 terminal → 执行 Stop hooks
 * 3. 如果 Stop hook 返回 preventContinuation → 可修改过渡类型
 *
 * Stop hooks 在对话循环结束时触发，用于:
 *
 * - 生成摘要/日志
 * - 执行清理操作
 * - 反馈最终结果给外部系统
 */
export class HookStopPhase implements LoopPhase {
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
    // 先执行后续阶段（PostProcessPhase）
    yield* next();

    // 检查是否为终止过渡 → 执行 Stop hooks
    const transition = ctx.state.transition;
    if (transition.type !== 'next_turn') {
      const matchingHooks = this.executor.getMatchingHookDefinitions('Stop');
      if (matchingHooks.length > 0) {
        const hookContext = this.buildHookContext(ctx);

        // 提取最后一条助手消息文本
        const lastAssistantMessage = this.extractLastAssistantMessage(ctx);

        const input: StopInput = {
          hookEventName: 'Stop',
          lastAssistantMessage
        };

        const aggregated = await this.executor.execute('Stop', input, hookContext);

        // Stop hook 的 preventContinuation 可阻止后续（但循环已终止，主要影响 team/scheduling 等上层逻辑）
        if (aggregated.preventContinuation) {
          ctx.meta.hookStopPreventContinuation = true;
          if (aggregated.stopReason !== undefined) {
            ctx.meta.hookStopReason = aggregated.stopReason;
          }
        }

        // 附加上下文
        if (aggregated.additionalContexts.length > 0) {
          const existing = (ctx.meta.hookAdditionalContexts as string[]) ?? [];
          ctx.meta.hookAdditionalContexts = [...existing, ...aggregated.additionalContexts];
        }

        // 记录 Stop hook 的错误
        if (aggregated.errors.length > 0) {
          ctx.meta.hookStopErrors = aggregated.errors;
        }

        // ★ Stop hook 有错误但 preventContinuation=false → stop_hook_blocking
        // 场景：Stop hook 执行失败（如 lint 警告）但不阻止循环继续
        // 保留 hasAttemptedReactiveCompact 防止无限循环
        if (aggregated.errors.length > 0 && !aggregated.preventContinuation) {
          const blockingErrors: HookBlockingError[] = aggregated.errors.map(err => ({
            hookName: 'Stop',
            message: err
          }));
          ctx.state.transition = {
            type: 'stop_hook_blocking',
            blockingErrors
          };
          ctx.meta.recoveryStrategy = 'stop_hook_blocking';
          ctx.meta.recovered = true;
          ctx.meta.hasAttemptedReactiveCompact = true;
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

  /** 提取最后一条助手消息文本 */
  private extractLastAssistantMessage(ctx: MutableAgentContext): string | undefined {
    const messages = ctx.state.messages;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant') {
        return msg.content;
      }
    }
    return undefined;
  }
}
