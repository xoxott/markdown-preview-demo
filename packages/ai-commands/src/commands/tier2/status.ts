/** /status SkillDefinition — 会话状态 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { StatusPromptInput } from '../../types/command-result';
import { StatusArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { formatSessionStatus } from '../../utils/format-helpers';

/** 构建 status prompt — 纯函数 */
export function buildStatusPrompt(input: StatusPromptInput): string {
  return formatSessionStatus(
    input.sessionStatus,
    input.tokenUsage,
    input.cost,
    input.durationMs,
    input.model,
    input.verbose
  );
}

/** /status SkillDefinition */
export const statusSkill: SkillDefinition = {
  name: 'status',
  description: 'Show current session status: tokens, cost, duration, model',
  aliases: ['st'],
  argumentHint: '[verbose]',
  whenToUse: 'Use when you want to check the current session statistics',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const sessionInfoProvider = extContext.sessionInfoProvider;

    if (!sessionInfoProvider) {
      return {
        content:
          'Error: status requires SessionInfoProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, StatusArgsSchema, tokens => ({
      verbose: tokens.includes('verbose') || tokens.includes('v')
    }));

    const sessionStatus = await sessionInfoProvider.getStatus();
    const tokenUsage = await sessionInfoProvider.getTokenUsage();
    const cost = await sessionInfoProvider.getCost();
    const durationMs = await sessionInfoProvider.getDuration();
    const model = await sessionInfoProvider.getCurrentModel();

    const prompt = buildStatusPrompt({
      sessionStatus,
      tokenUsage,
      cost,
      durationMs,
      model,
      verbose: parsed.verbose
    });

    return { content: prompt };
  }
};
