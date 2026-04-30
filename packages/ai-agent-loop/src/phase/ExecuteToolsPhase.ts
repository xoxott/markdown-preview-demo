/** 工具执行阶段（ExecuteTools Phase） 通过 ToolScheduler 调度 + ToolExecutor 执行 */

import type { ToolExecutor, ToolRegistry } from '@suga/ai-tool-core';
import type { MutableAgentContext } from '../context/AgentContext';
import type { AgentEvent } from '../types/events';
import type { ToolScheduler } from '../types/scheduler';
import type { ToolResultMessage } from '../types/messages';
import type { LoopPhase } from './LoopPhase';

/**
 * 工具执行阶段
 *
 * 核心逻辑：
 *
 * 1. 如果 needsToolExecution=false，跳过执行直接传递
 * 2. 通过 ToolScheduler 调度所有 tool_use blocks
 * 3. 流式产出每个 ToolResultMessage
 * 4. 调度器内部使用 ToolExecutor 三阶段管线执行每个工具
 */
export class ExecuteToolsPhase implements LoopPhase {
  constructor(
    private readonly scheduler: ToolScheduler,
    private readonly executor: ToolExecutor,
    private readonly registry: ToolRegistry,
    private readonly timeout: number
  ) {}

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 无工具调用时跳过执行
    if (!ctx.needsToolExecution) {
      yield* next();
      return;
    }

    // 通过调度器执行所有 tool_use blocks
    const results = this.scheduler.schedule(
      ctx.toolUses,
      this.executor,
      this.registry,
      ctx.state.toolUseContext,
      this.timeout
    );

    // 收集工具结果到 ctx.meta（供 advanceState 使用）
    const toolResultMessages: ToolResultMessage[] = [];

    for await (const resultMsg of results) {
      toolResultMessages.push(resultMsg);
      yield { type: 'tool_result', result: resultMsg };
    }

    // 存储工具结果到 meta
    ctx.meta.toolResults = toolResultMessages;

    yield* next();
  }
}
