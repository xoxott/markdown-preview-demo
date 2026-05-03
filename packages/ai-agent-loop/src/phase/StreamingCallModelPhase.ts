/**
 * 交错流式阶段（StreamingCallModel Phase） — P42
 *
 * 合并 CallModelPhase + ExecuteToolsPhase 的交错流式 Phase。 在 LLM 流式输出循环中，tool_use 到达即通过
 * InterleavedToolScheduler.addTool() 启动执行， 每轮 chunk 后轮询 scheduler.getCompletedResults() 交错 yield
 * 已完成工具结果。 LLM 流结束后调用 scheduler.getRemainingResults() 等待所有剩余工具完成。
 *
 * 数据流:
 *
 * for await (chunk of stream) { text/thinking → yield delta toolUse → scheduler.addTool() → yield
 * tool_use_start // 轮询已完成结果 for (result of scheduler.getCompletedResults()) yield tool_result } //
 * LLM流结束 → 等待剩余 for await (result of scheduler.getRemainingResults()) yield tool_result
 * ctx.meta.toolResults = allResults
 */

import type { ToolExecutor, ToolRegistry } from '@suga/ai-tool-core';
import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import type { AgentMessage, ToolResultMessage } from '../types/messages';
import type { InterleavedToolScheduler } from '../types/scheduler';
import type { LLMProvider, SystemPrompt, ToolDefinition } from '../types/provider';
import type { LoopPhase } from './LoopPhase';
import { classifyLLMError } from './classifyLLMError';

/**
 * 交错流式阶段 — LLM 流式输出 + 工具执行交错进行
 *
 * 当 AgentLoop 检测到 scheduler 支持 InterleavedToolScheduler 接口时， 使用此 Phase 替代 CallModelPhase +
 * ExecuteToolsPhase 的分离模式。
 *
 * 核心差异（vs batch 模式）:
 *
 * 1. tool_use 到达即启动执行（addTool），而非等LLM流全部结束后才 schedule
 * 2. 已完成的 safe 工具结果在 LLM 还在输出时即可 yield（getCompletedResults）
 * 3. unsafe 工具执行时后续工具结果必须等待（getCompletedResults break on executing unsafe）
 * 4. LLM 流结束后等待所有剩余工具（getRemainingResults）
 */
export class StreamingCallModelPhase implements LoopPhase {
  constructor(
    private readonly provider: LLMProvider,
    private readonly scheduler: InterleavedToolScheduler,
    private readonly executor: ToolExecutor,
    private readonly registry: ToolRegistry,
    private readonly timeout: number,
    private readonly tools?: readonly ToolDefinition[],
    private readonly systemPrompt?: SystemPrompt
  ) {}

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 产出轮次开始事件
    yield { type: 'turn_start', turnCount: ctx.state.turnCount };

    // 收集所有工具结果（LLM流期间 + 流结束后）
    const allResults: ToolResultMessage[] = [];

    try {
      // 优先使用压缩后的消息（P8 CompressPhase 写入 ctx.meta.compressedMessages）
      const messages: readonly AgentMessage[] =
        (ctx.meta.compressedMessages as readonly AgentMessage[] | undefined) ?? ctx.state.messages;

      const stream = this.provider.callModel(messages, this.tools, {
        signal: ctx.state.toolUseContext.abortController.signal,
        systemPrompt: this.systemPrompt
      });

      for await (const chunk of stream) {
        // 文本增量
        if (chunk.textDelta) {
          ctx.appendText(chunk.textDelta);
          yield { type: 'text_delta', delta: chunk.textDelta };
        }

        // 思考增量
        if (chunk.thinkingDelta) {
          ctx.appendThinking(chunk.thinkingDelta);
          yield { type: 'thinking_delta', delta: chunk.thinkingDelta };
        }

        // ★ 流式核心: tool_use 到达 → 立即 addTool + 启动执行
        if (chunk.toolUse) {
          ctx.pushToolUse(chunk.toolUse);
          this.scheduler.addTool(
            chunk.toolUse,
            this.registry,
            this.executor,
            ctx.state.toolUseContext,
            this.timeout
          );
          yield { type: 'tool_use_start', toolUse: chunk.toolUse };
        }

        // ★ 流式核心: 轮询已完成工具结果，交错 yield
        for (const completedResult of this.scheduler.getCompletedResults()) {
          allResults.push(completedResult);
          yield { type: 'tool_result', result: completedResult };
        }

        // stopReason → ctx.meta（RecoveryPhase 检测 max_output_tokens）
        if (chunk.stopReason) {
          ctx.meta.stopReason = chunk.stopReason;
          if (chunk.stopReason === 'max_tokens') {
            ctx.meta.maxOutputTokensReached = true;
          }
        }

        // usage → ctx.meta（RecoveryPhase token budget 检测）
        if (chunk.usage) {
          ctx.meta.usage = chunk.usage;
          ctx.meta.tokenBudgetUsed = chunk.usage.outputTokens;
        }

        // 流结束标记
        if (chunk.done) {
          ctx.setNeedsToolExecution(ctx.toolUses.length > 0);
        }
      }

      // ★ LLM 流结束 → 等待所有剩余工具完成
      for await (const remainingResult of this.scheduler.getRemainingResults()) {
        allResults.push(remainingResult);
        yield { type: 'tool_result', result: remainingResult };
      }

      // 存储工具结果到 meta（供 advanceState 使用）
      ctx.meta.toolResults = allResults;
    } catch (err) {
      // 如果有已完成的工具结果（LLM流中途失败但部分工具已执行），仍收集
      // 尝试收集可能已完成的工具结果
      for (const completedResult of this.scheduler.getCompletedResults()) {
        allResults.push(completedResult);
      }

      const classification = classifyLLMError(err);

      if (
        classification.kind === 'recoverable_overflow' ||
        classification.kind === 'recoverable_overloaded'
      ) {
        // 可恢复错误：写 ctx.meta.apiError + 保留已收集工具结果，不设 ctx.error → composePhases 不短路
        ctx.meta.apiError = classification.apiError;
        ctx.meta.toolResults = allResults;
        yield* next();
        return;
      }

      // 不可恢复错误：设 ctx.error → composePhases 短路终止
      ctx.setError(err);
      return;
    }

    yield* next();
  }
}
