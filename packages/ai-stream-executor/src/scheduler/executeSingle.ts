/** executeSingle — 单工具执行公共逻辑 */

import type { ToolExecutor, ToolRegistry, ToolUseContext } from '@suga/ai-tool-core';
import type { ToolResultMessage, ToolUseBlock } from '@suga/ai-agent-loop';

/** 生成唯一 ID */
function generateId(): string {
  return `tu_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 执行单个工具调用（通过 ToolExecutor 三阶段管线）
 *
 * 与 P1 ParallelScheduler/SerialScheduler 的 executeSingle 逻辑一致, 但提取为独立函数避免代码重复。
 *
 * 特性:
 *
 * - 工具未注册 → 返回错误 ToolResultMessage
 * - 超时 AbortController + 外部 signal 级联
 * - 执行异常 → 返回错误 ToolResultMessage（永不抛出）
 */
export async function executeSingle(
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

    // 级联: 外部中断时也触发超时中断
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
