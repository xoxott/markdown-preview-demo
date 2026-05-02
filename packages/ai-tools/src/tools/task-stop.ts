/** TaskStopTool — 停止后台任务工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TaskStopInput } from '../types/tool-inputs';
import type { TaskStopOutput } from '../types/tool-outputs';
import { TaskStopInputSchema } from '../types/tool-inputs';

/**
 * TaskStopTool — 停止后台任务
 *
 * - isReadOnly: false — 修改任务状态
 * - isConcurrencySafe: false — 停止任务可能影响其他操作
 * - safetyLabel: 'system' — 操作系统级任务
 * - isDestructive: true — 终止运行中的任务不可恢复
 * - 依赖TaskStoreProvider（宿主注入）
 */
export const taskStopTool = buildTool<TaskStopInput, TaskStopOutput>({
  name: 'task-stop',

  inputSchema: TaskStopInputSchema,

  description: async input => `Stop task ${input.taskId}`,

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'system' as SafetyLabel,
  isDestructive: () => true,

  validateInput: (input: TaskStopInput): ValidationResult => {
    if (input.taskId.trim().length === 0) {
      return {
        behavior: 'deny',
        message: 'Task ID cannot be empty',
        reason: 'invalid_task_id'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'ask', message: 'Stop running task?' };
  },

  call: async (
    input: TaskStopInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TaskStopOutput>> => {
    const provider = context.taskStoreProvider;

    if (!provider) {
      return {
        data: {
          success: false,
          taskId: input.taskId,
          message: 'TaskStoreProvider not available'
        }
      };
    }

    const result = await provider.stopTask(input.taskId);
    return { data: result };
  },

  toAutoClassifierInput: (input: TaskStopInput) => ({
    toolName: 'task_stop',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: true
  }),

  maxResultSizeChars: 5_000
});