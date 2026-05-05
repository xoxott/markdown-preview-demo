/** CronDeleteTool — 删除定时任务 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { CronDeleteInput } from '../types/tool-inputs';
import type { CronDeleteOutput } from '../types/tool-outputs';
import { CronDeleteInputSchema } from '../types/tool-inputs';

export const cronDeleteTool = buildTool<CronDeleteInput, CronDeleteOutput>({
  name: 'cron-delete',

  inputSchema: CronDeleteInputSchema,

  description: async input => `Delete scheduled job "${input.id}"`,

  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'system' as SafetyLabel,
  isDestructive: () => true,

  validateInput: (input: CronDeleteInput) => {
    if (!input.id) {
      return { behavior: 'deny', message: 'id is required', reason: 'missing_id' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: CronDeleteInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<CronDeleteOutput>> => {
    const provider = context.cronProvider;
    if (!provider) {
      return { data: { id: input.id, deleted: false } };
    }

    const result = await provider.deleteCron(input.id);
    return { data: result };
  },

  toAutoClassifierInput: (input: CronDeleteInput) => ({
    toolName: 'cron_delete',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: true
  }),

  maxResultSizeChars: 5_000
});
