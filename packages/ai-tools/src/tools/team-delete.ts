/** TeamDeleteTool — 删除团队 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TeamDeleteInput } from '../types/tool-inputs';
import type { TeamDeleteOutput } from '../types/tool-outputs';
import { TeamDeleteInputSchema } from '../types/tool-inputs';

export const teamDeleteTool = buildTool<TeamDeleteInput, TeamDeleteOutput>({
  name: 'team-delete',

  inputSchema: TeamDeleteInputSchema,

  description: async () => 'Delete current team',

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'destructive' as SafetyLabel,
  isDestructive: () => true,

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    _input: TeamDeleteInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TeamDeleteOutput>> => {
    const provider = context.teamProvider;
    if (!provider) {
      return { data: { success: false, message: 'No TeamProvider' } };
    }

    const result = await provider.deleteTeam();
    return { data: result };
  },

  toAutoClassifierInput: () => ({
    toolName: 'team_delete',
    input: {},
    safetyLabel: 'destructive',
    isReadOnly: false,
    isDestructive: true
  }),

  maxResultSizeChars: 10_000
});
