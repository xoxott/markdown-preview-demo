/** TaskOutputTool — 后台任务输出查询工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TaskOutputInput } from '../types/tool-inputs';
import type { TaskOutputOutput } from '../types/tool-outputs';
import { TaskOutputInputSchema } from '../types/tool-inputs';

/**
 * TaskOutputTool — 后台任务输出查询
 *
 * - isReadOnly: true — 只读查询
 * - isConcurrencySafe: true — 不影响其他操作
 * - safetyLabel: 'readonly' — 无破坏性
 * - 依赖TaskStoreProvider（宿主注入）
 */
export const taskOutputTool = buildTool<TaskOutputInput, TaskOutputOutput>({
  name: 'task-output',

  inputSchema: TaskOutputInputSchema,

  description: async input => `Get output from task ${input.taskId}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: TaskOutputInput): ValidationResult => {
    if (input.taskId.trim().length === 0) {
      return {
        behavior: 'deny',
        message: 'Task ID cannot be empty',
        reason: 'invalid_task_id'
      };
    }
    if (input.timeout !== undefined && input.timeout < 0) {
      return {
        behavior: 'deny',
        message: 'Timeout must be positive',
        reason: 'invalid_timeout'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: TaskOutputInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TaskOutputOutput>> => {
    const provider = context.taskStoreProvider;

    if (!provider) {
      return {
        data: {
          taskId: input.taskId,
          status: 'not_found',
          output: undefined
        }
      };
    }

    const result = await provider.getTaskOutput(input.taskId);
    return { data: result };
  },

  toAutoClassifierInput: (input: TaskOutputInput) => ({
    toolName: 'task_output',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});