/** HookSessionStartPhase — 会话开始时的 Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { SessionStartInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookSessionStartPhase — 会话开始时的 Hook 拦截
 *
 * 在 PreProcessPhase 之前插入（洋葱模型前置逻辑）：
 *
 * 1. 提取用户消息
 * 2. 执行 SessionStart hooks
 * 3. 聚合结果写入 ctx.meta
 *
 * SessionStart hooks 在对话循环启动时触发，用于：
 *
 * - 初始化环境变量/配置
 * - 记录会话元数据
 * - 设置监控/审计
 */
export class HookSessionStartPhase implements LoopPhase {
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
    const matchingHooks = this.executor.getMatchingHookDefinitions('SessionStart');
    if (matchingHooks.length > 0) {
      const hookContext = this.buildHookContext(ctx);
      const userMessage = this.extractUserMessage(ctx);

      const input: SessionStartInput = {
        hookEventName: 'SessionStart',
        userMessage
      };

      const aggregated = await this.executor.execute('SessionStart', input, hookContext);

      if (aggregated.preventContinuation) {
        ctx.setError(new Error(aggregated.stopReason ?? 'SessionStart hook 阻止了执行'));
      }

      if (aggregated.additionalContexts.length > 0) {
        ctx.meta.hookSessionStartContexts = aggregated.additionalContexts;
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

  /** 提取第一条用户消息（仅提取文本内容） */
  private extractUserMessage(ctx: MutableAgentContext): string {
    const messages = ctx.state.messages;
    for (const msg of messages) {
      if (msg.role === 'user') {
        return typeof msg.content === 'string' ? msg.content : '';
      }
    }
    return '';
  }
}
