/** 后处理阶段（PostProcess Phase） 过渡判定 + 恢复 transition 尊重 + 安全网 + G13结构化输出强制 */

import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import type { StructuredOutputEnforcementConfig } from '../types/state';
import type { LoopPhase } from './LoopPhase';

/** G13: 结构化输出重试计数器（跨轮次持久化） */
let structuredOutputRetryCount = 0;

/**
 * G13: 注册结构化输出强制 — 重置重试计数器
 *
 * 在新会话开始时调用，重置跨轮次的重试计数器。
 */
export function registerStructuredOutputEnforcement(): void {
  structuredOutputRetryCount = 0;
}

/**
 * 后处理阶段
 *
 * 决定循环过渡类型（继续或终止）：
 *
 * - RecoveryPhase 已设非 next_turn transition → 尊重它（不覆盖）
 * - ctx.meta.apiError 已设但 transition 仍 next_turn → 安全网：设 ctx.error
 * - G13: 结构化输出强制 — LLM 应返回 tool_use 但返回纯文本时注入 nudge 重试
 * - 无错误 + 无 tool_use → completed（对话结束）
 * - 无错误 + 有 tool_use + 未超限 → next_turn（继续循环）
 * - 无错误 + 有 tool_use + 已超限 → max_turns（达到上限）
 * - AbortError → aborted（用户中断）
 * - 其他错误 → model_error（LLM/API 错误）
 */
export class PostProcessPhase implements LoopPhase {
  constructor(
    private readonly maxTurns: number,
    private readonly structuredOutputConfig?: StructuredOutputEnforcementConfig
  ) {}

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 产出轮次结束事件
    yield { type: 'turn_end', turnCount: ctx.state.turnCount };

    // 安全网：ctx.meta.apiError 已设但 RecoveryPhase 未处理 → 设 ctx.error 防止提前 completed
    if (ctx.meta.apiError && ctx.state.transition.type === 'next_turn' && !ctx.error) {
      const apiError = ctx.meta.apiError as { statusCode?: number; message?: string };
      ctx.setError(
        new Error(
          `Unhandled API overflow: ${apiError.statusCode ?? 'unknown'} — ${apiError.message ?? 'no message'}`
        )
      );
    }

    // RecoveryPhase 已设非 next_turn transition → 尊重它，不覆盖
    const currentTransition = ctx.state.transition;
    if (currentTransition.type !== 'next_turn' && !ctx.error) {
      yield* next();
      return;
    }

    // 正常过渡判定逻辑
    if (ctx.error) {
      if (ctx.error instanceof DOMException && ctx.error.name === 'AbortError') {
        ctx.state.transition = { type: 'aborted', reason: 'Agent loop 被中断' };
      } else {
        ctx.state.transition = { type: 'model_error', error: ctx.error as Error };
      }
    } else if (ctx.needsToolExecution && ctx.state.turnCount + 1 > this.maxTurns) {
      // 注意：turnCount + 1 因为当前轮即将结束，下一轮才会超出限制
      ctx.state.transition = { type: 'max_turns', maxTurns: this.maxTurns };
    } else if (ctx.needsToolExecution) {
      ctx.state.transition = { type: 'next_turn' };
    } else {
      // G13: 结构化输出强制检测
      const enforcementResult = this.checkStructuredOutputEnforcement(ctx);
      if (enforcementResult) {
        ctx.state.transition = enforcementResult;
      } else {
        ctx.state.transition = { type: 'completed', reason: 'LLM 无工具调用，对话结束' };
      }
    }

    yield* next();
  }

  /**
   * G13: 结构化输出强制检测
   *
   * 当 LLM 应返回结构化输出（tool_use）但返回了纯文本时， 注入 nudge 消息提示 LLM 使用正确的工具格式，并触发重试。
   *
   * 条件：
   *
   * - structuredOutputEnforcement.enabled = true
   * - stopReason 为 end_turn（非 max_tokens）
   * - 无 tool_use（LLM 返回了纯文本而非工具调用）
   * - 重试次数未超限
   */
  private checkStructuredOutputEnforcement(ctx: MutableAgentContext): {
    type: 'structured_output_retry';
    retryCount: number;
    nudgeMessage: import('../types/messages').AgentMessage;
  } | null {
    if (!this.structuredOutputConfig?.enabled) return null;

    const maxRetries = this.structuredOutputConfig.maxRetries ?? 3;
    if (structuredOutputRetryCount >= maxRetries) return null;

    // stopReason 不是 end_turn → 不触发（如 max_tokens、tool_use 等）
    const stopReason = ctx.meta.stopReason as string | undefined;
    if (stopReason && stopReason !== 'end_turn') return null;

    // LLM 没有返回任何 tool_use → 应返回结构化输出但返回了纯文本
    if (ctx.toolUses.length > 0) return null;

    // 期望的工具名称 → 构造 nudge 消息
    const expectedTools = this.structuredOutputConfig.expectedTools ?? [];
    const toolNames = expectedTools.length > 0 ? expectedTools.join(', ') : 'appropriate tool';

    structuredOutputRetryCount++;

    const nudgeMessage = {
      id: `nudge_${Date.now()}`,
      role: 'user' as const,
      content: `Please use ${toolNames} to respond in the required structured format. Do not respond with plain text when a tool call is expected.`,
      timestamp: Date.now()
    };

    return {
      type: 'structured_output_retry',
      retryCount: structuredOutputRetryCount,
      nudgeMessage
    };
  }
}
