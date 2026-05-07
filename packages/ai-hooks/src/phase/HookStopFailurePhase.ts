/** G17: HookStopFailurePhase — 循环异常终止的 Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { StopFailureInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

export class HookStopFailurePhase implements LoopPhase {
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

    const error = ctx.meta.stopFailureError as string | undefined;
    if (error) {
      const matchingHooks = this.executor.getMatchingHookDefinitions('StopFailure');
      if (matchingHooks.length > 0) {
        const hookContext = this.buildHookContext(ctx);
        const input: StopFailureInput = {
          hookEventName: 'StopFailure',
          error,
          transitionType:
            (ctx.meta.stopFailureTransitionType as StopFailureInput['transitionType']) ??
            'model_error'
        };
        const aggregated = await this.executor.execute('StopFailure', input, hookContext);
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
