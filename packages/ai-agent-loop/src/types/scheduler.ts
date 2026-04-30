/** 工具调度器接口定义（Tool Scheduler Types） 工具执行的并发/串行调度抽象 */

import type { ToolExecutor, ToolRegistry, ToolUseContext } from '@suga/ai-tool-core';
import type { ToolResultMessage, ToolUseBlock } from './messages';

/**
 * 工具调度器接口
 *
 * 负责将 LLM 产出的 tool_use blocks 分发到 ToolExecutor 执行。 不同调度器实现提供不同的并发策略：
 *
 * - ParallelScheduler: 并行执行所有工具（安全并行）
 * - SerialScheduler: 逐个执行（适用于非并发安全场景）
 */
export interface ToolScheduler {
  /**
   * 调度执行工具调用
   *
   * @param toolUses LLM 产出的 tool_use blocks
   * @param executor 工具执行器
   * @param registry 工具注册表（用于查找工具）
   * @param context 工具使用上下文
   * @param timeout 单个工具超时时间（ms）
   * @returns AsyncGenerator<ToolResultMessage> 流式产出工具结果
   */
  schedule(
    toolUses: readonly ToolUseBlock[],
    executor: ToolExecutor,
    registry: ToolRegistry,
    context: ToolUseContext,
    timeout: number
  ): AsyncGenerator<ToolResultMessage>;
}
