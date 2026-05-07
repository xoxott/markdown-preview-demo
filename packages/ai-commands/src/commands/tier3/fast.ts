/** /fast SkillDefinition — 快速切换模型 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { FastPromptInput } from '../../types/command-result';
import { FastArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { FAST_TITLE } from '../../constants';

/** 构建 fast prompt — 纯函数 */
export function buildFastPrompt(input: FastPromptInput): string {
  return `${FAST_TITLE}\n\nSwitched from **${input.currentModel}** to **${input.targetModel}** for faster responses.\nUse /model to switch back or pick another model.`;
}

/** /fast SkillDefinition */
export const fastSkill: SkillDefinition = {
  name: 'fast',
  description: 'Switch to a faster/cheaper model (defaults to Haiku)',
  aliases: [],
  argumentHint: '[model]',
  whenToUse: 'Use when you want faster responses at lower cost, switching to a smaller model',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: false,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const modelControl = extContext.modelControlProvider;

    if (!modelControl) {
      return {
        content:
          'Error: fast requires ModelControlProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, FastArgsSchema, tokens => ({
      model: tokens[0]
    }));

    const currentModel = await modelControl.getCurrentModel();
    const targetModel = parsed.model ?? 'claude-haiku-4-5';
    const newModel = await modelControl.switchModel(targetModel);

    const prompt = buildFastPrompt({ currentModel, targetModel: newModel });
    return {
      content: prompt,
      contextModifier: { model: newModel }
    };
  }
};
