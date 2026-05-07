/** /login SkillDefinition — 启动鉴权流程 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { LoginPromptInput } from '../../types/command-result';
import { LoginArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { LOGIN_TITLE } from '../../constants';

export function buildLoginPrompt(input: LoginPromptInput): string {
  const lines: string[] = [LOGIN_TITLE, ''];
  if (input.identity?.email) {
    lines.push(`Already logged in as ${input.identity.email}.`);
    return lines.join('\n');
  }
  if (input.url) {
    lines.push(`Open the following URL in your browser to complete sign-in:`);
    lines.push(input.url);
    if (input.userCode) {
      lines.push('');
      lines.push(`User code: ${input.userCode}`);
    }
    return lines.join('\n');
  }
  if (input.success) {
    return `${LOGIN_TITLE}\n\nLogin completed successfully.`;
  }
  return `${LOGIN_TITLE}\n\nLogin failed: ${input.error ?? 'unknown error'}`;
}

export const loginSkill: SkillDefinition = {
  name: 'login',
  description: 'Authenticate with the Anthropic API or another provider',
  aliases: [],
  argumentHint: '[provider]',
  whenToUse: 'Use to sign in or refresh authentication credentials',
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
          'Error: /login requires AuthProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, LoginArgsSchema, tokens => ({
      provider: tokens[0]
    }));

    if (await provider.isLoggedIn()) {
      const identity = await provider.whoAmI();
      return { content: buildLoginPrompt({ provider: parsed.provider, success: true, identity }) };
    }

    const result = await provider.login(parsed.provider);
    return {
      content: buildLoginPrompt({
        provider: parsed.provider,
        url: result.url,
        userCode: result.userCode,
        success: result.success,
        error: result.error
      })
    };
  }
};
