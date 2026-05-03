/** HookSessionEndPhase — 会话结束时的 Hook 拦截阶段 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { SessionEndInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookExecutorDeps } from '../types/runner';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';
import { RunnerRegistryImpl } from '../runner/RunnerRegistry';
import { CallbackRunner } from '../runner/CallbackRunner';

/**
 * HookSessionEndPhase — 会话结束时的 Hook 拦截
 *
 * 在 StopPhase 之后插入（洋葱模型后置逻辑）：
 *
 * 1. yield* next() 先执行 StopPhase
 * 2. 如果 transition 是 terminal → 执行 SessionEnd hooks
 * 3. 聚合结果写入 ctx.meta
 *
 * SessionEnd hooks 在对话循环终止时触发，用于：
 * - 清理资源/连接
 * - 生成会话摘要/报告
 * - 归档审计日志
 */
export class HookSessionEndPhase implements LoopPhase {
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

    // 检查是否为终止过渡 → 执行 SessionEnd hooks
    const transition = ctx.state.transition;
    if (transition.type !== 'next_turn') {
      const matchingHooks = this.executor.getMatchingHookDefinitions('SessionEnd');
      if (matchingHooks.length > 0) {
        const hookContext = this.buildHookContext(ctx);
        const lastAssistantMessage = this.extractLastAssistantMessage(ctx);
        const turnCount = this.countTurns(ctx);

        const input: SessionEndInput = {
          hookEventName: 'SessionEnd',
          lastAssistantMessage,
          transitionType: transition.type,
          turnCount
        };

        const aggregated = await this.executor.execute('SessionEnd', input, hookContext);

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

  /** 计算对话轮数 */
  private countTurns(ctx: MutableAgentContext): number {
    let count = 0;
    for (const msg of ctx.state.messages) {
      if (msg.role === 'assistant') count++;
    }
    return count;
  }
}