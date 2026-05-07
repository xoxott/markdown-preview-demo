/** /clear SkillDefinition — 清空会话上下文 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { ClearPromptInput } from '../../types/command-result';
import { ClearArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { CLEAR_TITLE } from '../../constants';

/** 构建 clear prompt — 纯函数 */
export function buildClearPrompt(input: ClearPromptInput): string {
  if (!input.confirmed) {
    return 'Session clear was not confirmed. Use `/clear` with confirmed=true to proceed.';
  }
  return `${CLEAR_TITLE}\n\nConversation history and context have been cleared. You can start fresh with a new prompt.`;
}

/** /clear SkillDefinition */
export const clearSkill: SkillDefinition = {
  name: 'clear',
  description: 'Clear conversation context and history',
  aliases: ['cl'],
  argumentHint: '',
  whenToUse: 'Use when you want to start a fresh conversation without prior context',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const sessionControl = extContext.sessionControlProvider;

    if (!sessionControl) {
      return {
        content:
          'Error: clear requires SessionControlProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, ClearArgsSchema, () => ({ confirmed: true }));

    if (parsed.confirmed) {
      await sessionControl.clearContext();
    }

    const prompt = buildClearPrompt({ confirmed: parsed.confirmed ?? true });
    return { content: prompt };
  }
};
