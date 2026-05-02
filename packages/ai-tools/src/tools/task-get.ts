/** TaskGetTool — 查询任务详情 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TaskGetInput } from '../types/tool-inputs';
import type { TaskGetOutput } from '../types/tool-outputs';
import { TaskGetInputSchema } from '../types/tool-inputs';

export const taskGetTool = buildTool<TaskGetInput, TaskGetOutput>({
  name: 'task-get',

  inputSchema: TaskGetInputSchema,

  description: async input => `Get task ${input.taskId}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: TaskGetInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TaskGetOutput>> => {
    const provider = context.taskStoreProvider;
    if (!provider) {
      return { data: { task: null } };
    }

    const task = await provider.getTask(input.taskId);
    return { data: { task } };
  },

  toAutoClassifierInput: (input: TaskGetInput) => ({
    toolName: 'task_get',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 50_000
});
