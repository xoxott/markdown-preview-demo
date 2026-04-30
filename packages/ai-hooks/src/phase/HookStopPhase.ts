/** HookStopPhase — 对话循环结束时的 Stop Hook 拦截阶段 */

import type { LoopPhase } from '@suga/ai-agent-loop';
import type { MutableAgentContext } from '@suga/ai-agent-loop';
import type { AgentEvent } from '@suga/ai-agent-loop';
import type { StopInput } from '../types/input';
import type { HookExecutionContext } from '../types/hooks';
import type { HookRegistry } from '../registry/HookRegistry';
import { HookExecutor } from '../executor/HookExecutor';

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
 * - 生成摘要/日志
 * - 执行清理操作
 * - 反馈最终结果给外部系统
 */
export class HookStopPhase implements LoopPhase {
  private readonly executor: HookExecutor;

  constructor(registry: HookRegistry) {
    this.executor = new HookExecutor(registry);
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