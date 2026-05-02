/** TaskListTool — 列出所有任务 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TaskListInput } from '../types/tool-inputs';
import type { TaskListOutput } from '../types/tool-outputs';
import { TaskListInputSchema } from '../types/tool-inputs';

export const taskListTool = buildTool<TaskListInput, TaskListOutput>({
  name: 'task-list',

  inputSchema: TaskListInputSchema,

  description: async () => 'List all tasks',

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    _input: TaskListInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TaskListOutput>> => {
    const provider = context.taskStoreProvider;
    if (!provider) {
      return { data: { tasks: [] } };
    }

    const tasks = await provider.listTasks();
    return {
      data: {
        tasks: tasks.map(t => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          owner: t.owner,
          blockedBy: t.blockedBy
        }))
      }
    };
  },

  toAutoClassifierInput: () => ({
    toolName: 'task_list',
    input: {},
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
