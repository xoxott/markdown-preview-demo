/** Mock 交错流式调度器 — P42 StreamingCallModelPhase 测试用 */

import type { ToolExecutor, ToolRegistry, ToolUseContext } from '@suga/ai-tool-core';
import type { InterleavedToolScheduler } from '../../types/scheduler';
import type { ToolResultMessage, ToolUseBlock } from '../../types/messages';

/**
 * MockInterleavedScheduler
 *
 * 模拟 InterleavedToolScheduler 的交错流式行为：
 *
 * - addTool: 记录工具调用，立即标记为完成（测试可控）
 * - getCompletedResults: 同步 yield 已标记完成的结果
 * - getRemainingResults: 异步 yield 所有剩余结果
 * - schedule: batch 模式（兼容 ToolScheduler 接口）
 */
export class MockInterleavedScheduler implements InterleavedToolScheduler {
  private readonly addedTools: {
    toolUse: ToolUseBlock;
    result: ToolResultMessage;
    completed: boolean;
    yielded: boolean;
  }[] = [];

  private readonly addToolCalls: ToolUseBlock[] = [];

  /** 预设工具结果（按工具调用 ID） */
  private readonly presetResults = new Map<string, ToolResultMessage>();

  /** 预设结果延迟完成列表（按 ID，调用 getCompletedResults 时仍为未完成，需等 getRemainingResults） */
  private readonly delayedCompletion = new Set<string>();

  /** 设置预设结果 */
  setPresetResult(toolUseId: string, result: ToolResultMessage): void {
    this.presetResults.set(toolUseId, result);
  }

  /** 设置延迟完成（addTool 后不立即完成，需等 getRemainingResults） */
  setDelayedCompletion(toolUseId: string): void {
    this.delayedCompletion.add(toolUseId);
  }

  /** 获取 addTool 调用记录 */
  getAddToolCalls(): ToolUseBlock[] {
    return this.addToolCalls;
  }

  /** 获取已添加工具数量 */
  getAddedCount(): number {
    return this.addedTools.length;
  }

  addTool(
    toolUse: ToolUseBlock,
    _registry: ToolRegistry,
    _executor: ToolExecutor,
    _context: ToolUseContext,
    _timeout: number
  ): void {
    this.addToolCalls.push(toolUse);

    const preset = this.presetResults.get(toolUse.id);
    const result: ToolResultMessage = preset ?? {
      id: `result_${toolUse.id}`,
      role: 'tool_result',
      toolUseId: toolUse.id,
      toolName: toolUse.name,
      result: `Mock result for ${toolUse.name}`,
      isSuccess: true,
      timestamp: Date.now()
    };

    const isDelayed = this.delayedCompletion.has(toolUse.id);

    this.addedTools.push({
      toolUse,
      result,
      completed: !isDelayed,
      yielded: false
    });
  }

  *getCompletedResults(): Generator<ToolResultMessage> {
    for (const entry of this.addedTools) {
      if (entry.completed && !entry.yielded) {
        entry.yielded = true;
        yield entry.result;
      } else if (!entry.completed) {
        // 未完成 → break（模拟 unsafe 工具正在执行）
        break;
      }
    }
  }

  async *getRemainingResults(): AsyncGenerator<ToolResultMessage> {
    // 标记所有未完成的为已完成
    for (const entry of this.addedTools) {
      if (!entry.completed) {
        entry.completed = true;
      }
    }

    // yield 所有未 yield 的结果
    for (const entry of this.addedTools) {
      if (!entry.yielded) {
        entry.yielded = true;
        yield entry.result;
      }
    }
  }

  async *schedule(
    toolUses: readonly ToolUseBlock[],
    _executor: ToolExecutor,
    _registry: ToolRegistry,
    _context: ToolUseContext,
    _timeout: number
  ): AsyncGenerator<ToolResultMessage> {
    for (const toolUse of toolUses) {
      const preset = this.presetResults.get(toolUse.id);
      yield preset ?? {
        id: `result_${toolUse.id}`,
        role: 'tool_result',
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        result: `Mock result for ${toolUse.name}`,
        isSuccess: true,
        timestamp: Date.now()
      };
    }
  }
}
