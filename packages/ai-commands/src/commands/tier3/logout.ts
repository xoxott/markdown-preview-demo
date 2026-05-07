/** /logout SkillDefinition — 退出登录 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { LogoutPromptInput } from '../../types/command-result';
import { LogoutArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { LOGOUT_TITLE } from '../../constants';

export function buildLogoutPrompt(input: LogoutPromptInput): string {
  if (!input.success) {
    return `${LOGOUT_TITLE}\n\nLogout failed.`;
  }
  if (input.identity?.email) {
    return `${LOGOUT_TITLE}\n\nLogged out from ${input.identity.email}.`;
  }
  return `${LOGOUT_TITLE}\n\nLogged out.`;
}

export const logoutSkill: SkillDefinition = {
  name: 'logout',
  description: 'Sign out and clear cached credentials',
  aliases: [],
  argumentHint: '',
  whenToUse: 'Use to remove stored authentication tokens',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.authProvider;
    if (!provider) {
      return {
        content:
          'Error: /logout requires AuthProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    parseCommandArgs(args, LogoutArgsSchema, () => ({}));
    const identity = await provider.whoAmI();
    await provider.logout();
    return { content: buildLogoutPrompt({ success: true, identity }) };
  }
};
