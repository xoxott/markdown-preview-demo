/** TaskUpdateTool — 更新任务(状态/字段/依赖/删除) */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TaskUpdateInput } from '../types/tool-inputs';
import type { TaskUpdateOutput } from '../types/tool-outputs';
import { TaskUpdateInputSchema } from '../types/tool-inputs';

export const taskUpdateTool = buildTool<TaskUpdateInput, TaskUpdateOutput>({
  name: 'task-update',

  inputSchema: TaskUpdateInputSchema,

  description: async input =>
    `Update task ${input.taskId}${input.status ? ` → ${input.status}` : ''}`,

  isReadOnly: input => input.status === 'deleted',
  isConcurrencySafe: () => true,
  safetyLabel: input =>
    input.status === 'deleted' ? ('destructive' as SafetyLabel) : ('readonly' as SafetyLabel),
  isDestructive: input => input.status === 'deleted',

  validateInput: (input: TaskUpdateInput) => {
    if (!input.taskId) {
      return { behavior: 'deny', message: 'taskId is required', reason: 'missing_task_id' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: TaskUpdateInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TaskUpdateOutput>> => {
    const provider = context.taskStoreProvider;
    if (!provider) {
      return {
        data: {
          success: false,
          taskId: input.taskId,
          updatedFields: [],
          error: 'No TaskStoreProvider'
        }
      };
    }

    // 删除操作：直接调用deleteTask
    if (input.status === 'deleted') {
      await provider.deleteTask(input.taskId);
      return {
        data: {
          success: true,
          taskId: input.taskId,
          updatedFields: ['status'],
          statusChange: { from: 'unknown', to: 'deleted' }
        }
      };
    }

    // 更新操作
    const result = await provider.updateTask(input.taskId, {
      subject: input.subject,
      description: input.description,
      activeForm: input.activeForm,
      status: input.status,
      owner: input.owner,
      addBlocks: input.addBlocks,
      addBlockedBy: input.addBlockedBy,
      metadata: input.metadata
    });

    return { data: result };
  },

  toAutoClassifierInput: (input: TaskUpdateInput) => ({
    toolName: 'task_update',
    input,
    safetyLabel: input.status === 'deleted' ? 'destructive' : 'readonly',
    isReadOnly: input.status === 'deleted',
    isDestructive: input.status === 'deleted'
  }),

  maxResultSizeChars: 10_000
});
