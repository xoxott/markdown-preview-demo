/** HookPreCompactPhase — 压缩前的 Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { PreCompactInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookPreCompactPhase — 压缩前的 Hook 拦截
 *
 * 在 CompactOrchestrator 执行压缩前插入：
 *
 * 1. 从 ctx.meta 读取 token 预算信息
 * 2. 执行 PreCompact hooks
 * 3. 聚合结果写入 ctx.meta:
 *    - hookPreCompactPrevent → 阻止本次压缩
 *    - hookPreCompactStrategyOverride → 覆盖压缩策略选择
 *
 * PreCompact hooks 在 context 压缩前触发，用于：
 * - 拦截/延迟压缩（如正在执行关键操作）
 * - 选择压缩策略
 * - 保存压缩前的关键信息
 */
export class HookPreCompactPhase implements LoopPhase {
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
    const estimatedTokens = ctx.meta.estimatedTokens as number | undefined;
    const contextWindow = ctx.meta.contextWindow as number | undefined;

    if (estimatedTokens !== undefined && contextWindow !== undefined) {
      const matchingHooks = this.executor.getMatchingHookDefinitions('PreCompact');
      if (matchingHooks.length > 0) {
        const hookContext = this.buildHookContext(ctx);

        const input: PreCompactInput = {
          hookEventName: 'PreCompact',
          estimatedTokens,
          contextWindow
        };

        const aggregated = await this.executor.execute('PreCompact', input, hookContext);

        // 阻止压缩
        if (aggregated.preventContinuation) {
          ctx.meta.hookPreCompactPrevent = true;
        }

        // 覆盖压缩策略
        if (aggregated.updatedInput !== undefined) {
          const strategyOverride = (aggregated.updatedInput as Record<string, unknown>).strategy;
          if (typeof strategyOverride === 'string') {
            ctx.meta.hookPreCompactStrategyOverride = strategyOverride;
          }
        }

        if (aggregated.additionalContexts.length > 0) {
          ctx.meta.hookPreCompactContexts = aggregated.additionalContexts;
        }
      }
    }

    yield* next();
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