/** HookPostCompactPhase — 压缩后的 Hook 通知阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { PostCompactInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookPostCompactPhase — 压缩后的 Hook 通知
 *
 * 在 CompactOrchestrator 执行压缩后插入（洋葱模型后置逻辑）：
 *
 * 1. yield* next() 先执行压缩阶段
 * 2. 从 ctx.meta 读取压缩结果信息
 * 3. 执行 PostCompact hooks
 *
 * PostCompact hooks 在 context 压缩完成后触发，用于：
 *
 * - 记录压缩指标/日志
 * - 通知外部系统压缩完成
 * - 执行压缩后的状态恢复
 */
export class HookPostCompactPhase implements LoopPhase {
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

    // 从 ctx.meta 读取压缩结果 → 执行 PostCompact hooks
    const originalTokenCount = ctx.meta.originalTokenCount as number | undefined;
    const compressedTokenCount = ctx.meta.compressedTokenCount as number | undefined;
    const compressionMethod = ctx.meta.compressionMethod as string | undefined;

    if (originalTokenCount !== undefined && compressedTokenCount !== undefined) {
      const matchingHooks = this.executor.getMatchingHookDefinitions('PostCompact');
      if (matchingHooks.length > 0) {
        const hookContext = this.buildHookContext(ctx);

        const input: PostCompactInput = {
          hookEventName: 'PostCompact',
          originalTokenCount,
          compressedTokenCount,
          compressionMethod: compressionMethod ?? 'unknown'
        };

        const aggregated = await this.executor.execute('PostCompact', input, hookContext);

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
