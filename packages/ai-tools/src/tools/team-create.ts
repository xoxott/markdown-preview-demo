/** TeamCreateTool — 创建swarm团队 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { TeamCreateInput } from '../types/tool-inputs';
import type { TeamCreateOutput } from '../types/tool-outputs';
import { TeamCreateInputSchema } from '../types/tool-inputs';

export const teamCreateTool = buildTool<TeamCreateInput, TeamCreateOutput>({
  name: 'team-create',

  inputSchema: TeamCreateInputSchema,

  description: async input => `Create team: ${input.team_name}`,

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'destructive' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: TeamCreateInput) => {
    if (!input.team_name) {
      return { behavior: 'deny', message: 'team_name is required', reason: 'missing_team_name' };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: TeamCreateInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<TeamCreateOutput>> => {
    const provider = context.teamProvider;
    if (!provider) {
      return { data: { teamName: '', teamFilePath: '', leadAgentId: '' } };
    }

    const result = await provider.createTeam(input.team_name, input.description);
    return { data: result };
  },

  toAutoClassifierInput: (input: TeamCreateInput) => ({
    toolName: 'team_create',
    input,
    safetyLabel: 'destructive',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 10_000
});
