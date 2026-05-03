/** 工具调度器接口定义（Tool Scheduler Types） 工具执行的并发/串行调度抽象 */

import type { ToolExecutor, ToolRegistry, ToolUseContext } from '@suga/ai-tool-core';
import type { ToolResultMessage, ToolUseBlock } from './messages';

/**
 * 工具调度器接口（batch 模式）
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

/**
 * 交错流式调度器接口 — P42 StreamingToolExecutor 使用
 *
 * 扩展 ToolScheduler，新增流式模式 API：
 *
 * - addTool: LLM 流式输出期间，tool_use 到达即启动执行
 * - getCompletedResults: 同步轮询已完成结果（按序yield，遇到executing unsafe则break）
 * - getRemainingResults: 异步等待所有剩余工具完成并按序yield
 *
 * StreamingToolScheduler 实现此接口。AgentLoop 根据 scheduler 是否支持 InterleavedToolScheduler 决定使用
 * StreamingCallModelPhase 或 batch 模式。
 */
export interface InterleavedToolScheduler extends ToolScheduler {
  /** 流式添加工具（tool_use 到达即启动执行） */
  addTool(
    toolUse: ToolUseBlock,
    registry: ToolRegistry,
    executor: ToolExecutor,
    context: ToolUseContext,
    timeout: number
  ): void;

  /** 获取已完成的结果（同步，按序yield，遇到executing unsafe则break） */
  getCompletedResults(): Generator<ToolResultMessage>;

  /** 获取所有剩余结果（异步等待所有工具完成） */
  getRemainingResults(): AsyncGenerator<ToolResultMessage>;
}

/**
 * 判断 scheduler 是否为交错流式调度器
 *
 * 使用 duck typing 检查 addTool 方法是否存在。 用于 AgentLoop.buildPhases 决定使用哪种模式。
 */
export function isInterleavedScheduler(scheduler?: ToolScheduler): boolean {
  return (
    scheduler !== null &&
    scheduler !== undefined &&
    'addTool' in scheduler &&
    typeof (scheduler as unknown as Record<string, unknown>).addTool === 'function'
  );
}
