/** CronListTool — 列出所有定时任务 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { CronListInput } from '../types/tool-inputs';
import type { CronListOutput } from '../types/tool-outputs';
import { CronListInputSchema } from '../types/tool-inputs';

export const cronListTool = buildTool<CronListInput, CronListOutput>({
  name: 'cron-list',

  inputSchema: CronListInputSchema,

  description: async () => 'List all scheduled cron jobs',

  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'readonly' as SafetyLabel,
  isDestructive: () => false,

  validateInput: () => {
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    _input: CronListInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<CronListOutput>> => {
    const provider = context.cronProvider;
    if (!provider) {
      return { data: [] };
    }

    const entries = await provider.listCrons();
    return { data: entries };
  },

  toAutoClassifierInput: () => ({
    toolName: 'cron_list',
    input: {},
    safetyLabel: 'readonly',
    isReadOnly: true,
    isDestructive: false
  }),

  maxResultSizeChars: 20_000
});
