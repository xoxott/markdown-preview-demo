/** 工具调度器（Tool Scheduler） 并行和串行调度策略 */

import type { ToolExecutor, ToolRegistry, ToolUseContext } from '@suga/ai-tool-core';
import type { ToolScheduler } from '../types/scheduler';
import type { ToolResultMessage, ToolUseBlock } from '../types/messages';
/** 生成唯一 ID */

/** 生成唯一 ID */
function generateId(): string {
  return `tu_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 并行调度器
 *
 * 并行执行所有工具调用（Promise.allSettled），逐个 yield 结果。 单个工具失败不阻塞其他工具执行。
 */
export class ParallelScheduler implements ToolScheduler {
  async *schedule(
    toolUses: readonly ToolUseBlock[],
    executor: ToolExecutor,
    registry: ToolRegistry,
    context: ToolUseContext,
    timeout: number
  ): AsyncGenerator<ToolResultMessage> {
    // 并行启动所有工具调用
    const promises = toolUses.map(tu =>
      this.executeSingle(tu, executor, registry, context, timeout)
    );

    // 使用 Promise.allSettled 确保所有结果都产出
    const settled = await Promise.allSettled(promises);

    for (const result of settled) {
      if (result.status === 'fulfilled') {
        yield result.value;
      } else {
        // 防御性处理：理论上 executeSingle 总是返回 ToolResultMessage
        yield {
          id: generateId(),
          role: 'tool_result',
          toolUseId: '',
          toolName: '',
          error: result.reason?.message ?? 'Unknown error',
          isSuccess: false,
          timestamp: Date.now()
        };
      }
    }
  }

  /** 执行单个工具调用（通过 ToolExecutor 三阶段管线） */
  private async executeSingle(
    toolUse: ToolUseBlock,
    executor: ToolExecutor,
    registry: ToolRegistry,
    context: ToolUseContext,
    timeout: number
  ): Promise<ToolResultMessage> {
    // 从注册表查找工具
    const tool = registry.get(toolUse.name);
    if (!tool) {
      return {
        id: generateId(),
        role: 'tool_result',
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        error: `工具 "${toolUse.name}" 未注册`,
        isSuccess: false,
        timestamp: Date.now()
      };
    }

    try {
      // 创建超时 AbortController
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

      // 级联：外部中断时也触发超时中断
      context.abortController.signal.addEventListener('abort', () => timeoutController.abort(), {
        once: true
      });

      const result = await executor.execute(tool, toolUse.input, context);

      clearTimeout(timeoutId);

      if (result.result.error) {
        return {
          id: generateId(),
          role: 'tool_result',
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          error: result.result.error,
          isSuccess: false,
          timestamp: Date.now()
        };
      }

      return {
        id: generateId(),
        role: 'tool_result',
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        result: result.result.data,
        isSuccess: true,
        timestamp: Date.now()
      };
    } catch (err) {
      return {
        id: generateId(),
        role: 'tool_result',
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        error: err instanceof Error ? err.message : String(err),
        isSuccess: false,
        timestamp: Date.now()
      };
    }
  }
}

/**
 * 串行调度器
 *
 * 逐个执行工具调用，顺序一致。 前一个工具失败不影响后续执行。
 */
export class SerialScheduler implements ToolScheduler {
  async *schedule(
    toolUses: readonly ToolUseBlock[],
    executor: ToolExecutor,
    registry: ToolRegistry,
    context: ToolUseContext,
    timeout: number
  ): AsyncGenerator<ToolResultMessage> {
    for (const toolUse of toolUses) {
      const resultMsg = await this.executeSingle(toolUse, executor, registry, context, timeout);
      yield resultMsg;
    }
  }

  /** 执行单个工具调用（与 ParallelScheduler 相同） */
  private async executeSingle(
    toolUse: ToolUseBlock,
    executor: ToolExecutor,
    registry: ToolRegistry,
    context: ToolUseContext,
    timeout: number
  ): Promise<ToolResultMessage> {
    const tool = registry.get(toolUse.name);
    if (!tool) {
      return {
        id: generateId(),
        role: 'tool_result',
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        error: `工具 "${toolUse.name}" 未注册`,
        isSuccess: false,
        timestamp: Date.now()
      };
    }

    try {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), timeout);
      context.abortController.signal.addEventListener('abort', () => timeoutController.abort(), {
        once: true
      });

      const result = await executor.execute(tool, toolUse.input, context);
      clearTimeout(timeoutId);

      if (result.result.error) {
        return {
          id: generateId(),
          role: 'tool_result',
          toolUseId: toolUse.id,
          toolName: toolUse.name,
          error: result.result.error,
          isSuccess: false,
          timestamp: Date.now()
        };
      }

      return {
        id: generateId(),
        role: 'tool_result',
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        result: result.result.data,
        isSuccess: true,
        timestamp: Date.now()
      };
    } catch (err) {
      return {
        id: generateId(),
        role: 'tool_result',
        toolUseId: toolUse.id,
        toolName: toolUse.name,
        error: err instanceof Error ? err.message : String(err),
        isSuccess: false,
        timestamp: Date.now()
      };
    }
  }
}
