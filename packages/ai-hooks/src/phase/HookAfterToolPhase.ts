/** HookAfterToolPhase — 工具执行后的 Hook 拦截阶段 */

import type {
  AgentEvent,
  LoopPhase,
  MutableAgentContext,
  ToolResultMessage
} from '@suga/ai-agent-loop';
import type { PostToolUseFailureInput, PostToolUseInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookAfterToolPhase — 工具执行后的 Hook 拦截
 *
 * 在 ExecuteToolsPhase 后插入（洋葱模型后置逻辑）：
 *
 * 1. yield* next() 先执行 ExecuteToolsPhase
 * 2. 从 ctx.meta.toolResults 获取工具结果列表
 * 3. 对每个结果执行 PostToolUse 或 PostToolUseFailure hooks
 * 4. 聚合结果 → 修改 ctx.meta:
 *
 *    - updatedOutputs → 修改后的输出（Map<toolUseId, updatedOutput>）
 *    - hookAdditionalContexts → 附加上下文
 */
export class HookAfterToolPhase implements LoopPhase {
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
    // 先执行后续阶段（ExecuteToolsPhase），收集所有事件
    const events: AgentEvent[] = [];
    for await (const event of next()) {
      events.push(event);
    }

    // 从事件流中收集 tool_result 消息
    const toolResults = events
      .filter(e => e.type === 'tool_result')
      .map(e => (e as { type: 'tool_result'; result: ToolResultMessage }).result);

    if (toolResults.length > 0) {
      const hookContext = this.buildHookContext(ctx);
      const updatedOutputs = new Map<string, unknown>();
      const additionalContexts: string[] = [];

      for (const toolResult of toolResults) {
        const matchingHooks = this.executor.getMatchingHookDefinitions(
          toolResult.isSuccess ? 'PostToolUse' : 'PostToolUseFailure',
          toolResult.toolName
        );
        if (matchingHooks.length === 0) {
          continue;
        }

        if (toolResult.isSuccess) {
          // 成功 → PostToolUse
          const input: PostToolUseInput = {
            hookEventName: 'PostToolUse',
            toolName: toolResult.toolName,
            toolInput: {}, // 工具输入在 toolUseBlock 中，不在 toolResult 中
            toolOutput: toolResult.result,
            toolUseId: toolResult.toolUseId
          };

          const aggregated = await this.executor.execute('PostToolUse', input, hookContext);

          if (aggregated.updatedOutput !== undefined) {
            updatedOutputs.set(toolResult.toolUseId, aggregated.updatedOutput);
          }

          for (const ctxStr of aggregated.additionalContexts) {
            additionalContexts.push(ctxStr);
          }

          if (aggregated.preventContinuation) {
            ctx.setError(new Error(aggregated.stopReason ?? 'PostToolUse hook 阻止了执行'));
          }
        } else {
          // 失败 → PostToolUseFailure
          const input: PostToolUseFailureInput = {
            hookEventName: 'PostToolUseFailure',
            toolName: toolResult.toolName,
            toolInput: {},
            toolUseId: toolResult.toolUseId,
            error: toolResult.error ?? 'unknown error'
          };

          const aggregated = await this.executor.execute('PostToolUseFailure', input, hookContext);

          for (const ctxStr of aggregated.additionalContexts) {
            additionalContexts.push(ctxStr);
          }

          if (aggregated.preventContinuation) {
            ctx.setError(new Error(aggregated.stopReason ?? 'PostToolUseFailure hook 阻止了执行'));
          }
        }
      }

      // 写入 ctx.meta
      ctx.meta.hookUpdatedOutputs = updatedOutputs;
      if (additionalContexts.length > 0) {
        const existing = (ctx.meta.hookAdditionalContexts as string[]) ?? [];
        ctx.meta.hookAdditionalContexts = [...existing, ...additionalContexts];
      }
    }

    // 重新产出收集的事件
    for (const event of events) {
      yield event;
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
