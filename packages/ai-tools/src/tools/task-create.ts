/** TaskCreateTool — 创建任务 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TaskCreateInput } from '../types/tool-inputs';
import type { TaskCreateOutput } from '../types/tool-outputs';
import { TaskCreateInputSchema } from '../types/tool-inputs';

export const taskCreateTool = buildTool<TaskCreateInput, TaskCreateOutput>({
  name: 'task-create',

  inputSchema: TaskCreateInputSchema,

  description: async input => `Create task: ${input.subject}`,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: TaskCreateInput) => {
    if (!input.subject) {
      return { behavior: 'deny', message: 'subject is required', reason: 'missing_subject' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: TaskCreateInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TaskCreateOutput>> => {
    const provider = context.taskStoreProvider;
    if (!provider) {
      return { data: { task: { id: '', subject: '' } } };
    }

    const task = await provider.createTask(input);
    return { data: { task: { id: task.id, subject: task.subject } } };
  },

  toAutoClassifierInput: (input: TaskCreateInput) => ({
    toolName: 'task_create',
    input,
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 10_000
});
