/** Mock 工具调度器 — 用于测试的可控调度模拟 */

import type { ToolExecutor, ToolRegistry, ToolUseContext } from '@suga/ai-tool-core';
import type { ToolScheduler } from '../../types/scheduler';
import type { ToolResultMessage, ToolUseBlock } from '../../types/messages';

/** Mock 工具调度器 */
export class MockToolScheduler implements ToolScheduler {
  private presetResults: Map<string, ToolResultMessage> = new Map();
  private callHistory: { toolUses: readonly ToolUseBlock[] }[] = [];

  /** 预设工具结果（按工具调用 ID） */
  setPresetResult(toolUseId: string, result: ToolResultMessage): void {
    this.presetResults.set(toolUseId, result);
  }

  /** 获取调用历史 */
  getCallHistory() {
    return this.callHistory;
  }

  async *schedule(
    toolUses: readonly ToolUseBlock[],
    _executor: ToolExecutor,
    _registry: ToolRegistry,
    _context: ToolUseContext,
    _timeout: number
  ): AsyncGenerator<ToolResultMessage> {
    this.callHistory.push({ toolUses });

    for (const toolUse of toolUses) {
      const preset = this.presetResults.get(toolUse.id);
      if (preset) {
        yield preset;
      } else {
        // 默认返回成功结果
        yield {
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
}
