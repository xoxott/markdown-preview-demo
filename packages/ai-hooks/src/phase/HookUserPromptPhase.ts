/** HookUserPromptPhase — 用户消息提交前的 Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { UserPromptSubmitInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookUserPromptPhase — 用户消息提交前的 Hook 拦截
 *
 * 在 PreProcessPhase 之前插入（洋葱模型前置逻辑）：
 *
 * 1. 提取用户消息文本
 * 2. 执行 UserPromptSubmit hooks
 * 3. 聚合结果写入 ctx.meta:
 *
 *    - hookUserPromptPrevent → 阻止消息提交（拦截/修改）
 *    - hookUserPromptModifiedMessage → 修改后的消息文本
 *
 * UserPromptSubmit hooks 在用户消息提交前触发，用于：
 *
 * - 拦截不当内容
 * - 注入系统提示/上下文
 * - 修改用户消息格式
 */
export class HookUserPromptPhase implements LoopPhase {
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
    const matchingHooks = this.executor.getMatchingHookDefinitions('UserPromptSubmit');
    if (matchingHooks.length > 0) {
      const hookContext = this.buildHookContext(ctx);
      const userMessage = this.extractUserMessage(ctx);

      const input: UserPromptSubmitInput = {
        hookEventName: 'UserPromptSubmit',
        userMessage,
        sessionId: ctx.state.sessionId
      };

      const aggregated = await this.executor.execute('UserPromptSubmit', input, hookContext);

      // 阻止消息提交
      if (aggregated.preventContinuation) {
        ctx.setError(new Error(aggregated.stopReason ?? 'UserPromptSubmit hook 拦截了消息'));
        ctx.meta.hookUserPromptPrevent = true;
      }

      // 修改后的消息文本
      if (aggregated.updatedInput !== undefined) {
        const modified = (aggregated.updatedInput as Record<string, unknown>).userMessage;
        if (typeof modified === 'string') {
          ctx.meta.hookUserPromptModifiedMessage = modified;
        }
      }

      if (aggregated.additionalContexts.length > 0) {
        ctx.meta.hookUserPromptContexts = aggregated.additionalContexts;
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

  /** 提取用户消息 */
  private extractUserMessage(ctx: MutableAgentContext): string {
    const messages = ctx.state.messages;
    for (const msg of messages) {
      if (msg.role === 'user') {
        return msg.content;
      }
    }
    return '';
  }
}
