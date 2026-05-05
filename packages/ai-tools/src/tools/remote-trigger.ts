/** RemoteTriggerTool — 调用 claude.ai remote-trigger API */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { RemoteTriggerInput } from '../types/tool-inputs';
import type { RemoteTriggerOutput } from '../types/tool-outputs';
import { RemoteTriggerInputSchema } from '../types/tool-inputs';

export const remoteTriggerTool = buildTool<RemoteTriggerInput, RemoteTriggerOutput>({
  name: 'remote-trigger',

  inputSchema: RemoteTriggerInputSchema,

  description: async input =>
    `Remote trigger: ${input.action}${input.trigger_id ? ` "${input.trigger_id}"` : ''}`,

  isReadOnly: (input: RemoteTriggerInput) => {
    return input.action === 'list' || input.action === 'get';
  },
  isConcurrencySafe: () => true,
  safetyLabel: () => 'system' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: RemoteTriggerInput) => {
    // action=get/update/run 必须有 triggerId
    if (
      (input.action === 'get' || input.action === 'update' || input.action === 'run') &&
      !input.trigger_id
    ) {
      return {
        behavior: 'deny',
        message: `trigger_id is required for action "${input.action}"`,
        reason: 'missing_trigger_id'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: RemoteTriggerInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<RemoteTriggerOutput>> => {
    const provider = context.remoteTriggerProvider;
    if (!provider) {
      return { data: { id: input.trigger_id ?? '', action: input.action } };
    }

    const result = await provider.trigger(input.action, input.trigger_id, input.body);
    return { data: result };
  },

  toAutoClassifierInput: (input: RemoteTriggerInput) => ({
    toolName: 'remote_trigger',
    input,
    safetyLabel: 'system',
    isReadOnly: input.action === 'list' || input.action === 'get',
    isDestructive: false
  }),

  maxResultSizeChars: 20_000
});
