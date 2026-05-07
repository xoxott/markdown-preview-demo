/** G17: HookElicitationResultPhase — 用户回答结果的 Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { ElicitationResultInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

export class HookElicitationResultPhase implements LoopPhase {
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

    const toolUseId = ctx.meta.elicitationResultToolUseId as string | undefined;
    if (toolUseId) {
      const matchingHooks = this.executor.getMatchingHookDefinitions('ElicitationResult');
      if (matchingHooks.length > 0) {
        const hookContext = this.buildHookContext(ctx);
        const input: ElicitationResultInput = {
          hookEventName: 'ElicitationResult',
          toolUseId,
          answers: (ctx.meta.elicitationResultAnswers as Record<string, string>) ?? {},
          annotations: ctx.meta
            .elicitationResultAnnotations as ElicitationResultInput['annotations']
        };
        const aggregated = await this.executor.execute('ElicitationResult', input, hookContext);
        if (aggregated.additionalContexts.length > 0) {
          const existing = (ctx.meta.hookAdditionalContexts as string[]) ?? [];
          ctx.meta.hookAdditionalContexts = [...existing, ...aggregated.additionalContexts];
        }
      }
    }
  }

  private buildHookContext(ctx: MutableAgentContext): HookExecutionContext {
    const state = ctx.state;
    return {
      sessionId: state.sessionId,
      abortSignal: state.toolUseContext.abortController.signal,
      toolRegistry: state.toolUseContext.tools,
      meta: ctx.meta
    };
  }
}
