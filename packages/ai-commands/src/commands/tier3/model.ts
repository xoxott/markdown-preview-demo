/** /model SkillDefinition — 查看或切换模型 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { ModelListPromptInput, ModelSwitchPromptInput } from '../../types/command-result';
import { ModelArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { MODEL_TITLE } from '../../constants';

/** 构建 model list prompt — 纯函数 */
export function buildModelListPrompt(input: ModelListPromptInput): string {
  const lines: string[] = [MODEL_TITLE, ''];
  lines.push(`**Current model:** ${input.currentModel}`);
  lines.push('');
  lines.push('Available models:');
  for (const m of input.availableModels) {
    const marker = m.name === input.currentModel ? ' ✓' : '';
    lines.push(`- ${m.name}${marker} — ${m.description}`);
  }
  return lines.join('\n');
}

/** 构建 model switch prompt — 纯函数 */
export function buildModelSwitchPrompt(input: ModelSwitchPromptInput): string {
  return `${MODEL_TITLE}\n\nSwitched from **${input.previousModel}** to **${input.newModel}**.`;
}

/** /model SkillDefinition */
export const modelSkill: SkillDefinition = {
  name: 'model',
  description: 'Show available models or switch to a different model',
  aliases: [],
  argumentHint: '[model_name]',
  whenToUse:
    'Use when you want to see available models or change the active model for this session',
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
          'Error: model requires ModelControlProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, ModelArgsSchema, tokens => ({
      subcommand: tokens[0] === 'list' ? ('list' as const) : undefined,
      model: tokens[0] && tokens[0] !== 'list' ? tokens[0] : undefined
    }));

    // 如果指定了模型名 → 切换
    if (parsed.model) {
      const currentModel = await modelControl.getCurrentModel();
      const newModel = await modelControl.switchModel(parsed.model);
      const prompt = buildModelSwitchPrompt({ previousModel: currentModel, newModel });
      return { content: prompt, contextModifier: { model: newModel } };
    }

    // 默认 → 列出可用模型
    const currentModel = await modelControl.getCurrentModel();
    const availableModels = await modelControl.getAvailableModels();
    const prompt = buildModelListPrompt({ currentModel, availableModels });
    return { content: prompt };
  }
};
