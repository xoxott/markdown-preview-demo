/** CronCreateTool — 创建定时任务 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { CronCreateInput } from '../types/tool-inputs';
import type { CronCreateOutput } from '../types/tool-outputs';
import { CronCreateInputSchema } from '../types/tool-inputs';

export const cronCreateTool = buildTool<CronCreateInput, CronCreateOutput>({
  name: 'cron-create',

  inputSchema: CronCreateInputSchema,

  description: async input =>
    `Schedule prompt "${input.prompt}" on cron "${input.cron}" (recurring=${input.recurring})`,

  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  safetyLabel: () => 'system' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: CronCreateInput) => {
    if (!input.cron) {
      return { behavior: 'deny', message: 'cron expression is required', reason: 'missing_cron' };
    }
    if (!input.prompt) {
      return { behavior: 'deny', message: 'prompt is required', reason: 'missing_prompt' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: CronCreateInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<CronCreateOutput>> => {
    const provider = context.cronProvider;
    if (!provider) {
      return { data: { id: '', cron: input.cron, recurring: input.recurring } };
    }

    const result = await provider.createCron(
      input.cron,
      input.prompt,
      input.recurring,
      input.durable
    );
    return { data: result };
  },

  toAutoClassifierInput: (input: CronCreateInput) => ({
    toolName: 'cron_create',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 5_000
});
