/** /vim SkillDefinition — 切换 vim 模式 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { VimPromptInput } from '../../types/command-result';
import { VimArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { VIM_TITLE } from '../../constants';

/** 构建 vim prompt — 纯函数 */
export function buildVimPrompt(input: VimPromptInput): string {
  const state = input.enabled ? 'enabled' : 'disabled';
  const prev = input.previousState ? 'enabled' : 'disabled';
  return `${VIM_TITLE}\n\nVim keybindings: **${state}** (previously: ${prev}).`;
}

/** /vim SkillDefinition */
export const vimSkill: SkillDefinition = {
  name: 'vim',
  description: 'Toggle vim keybindings mode for CLI input',
  aliases: [],
  argumentHint: '[on|off]',
  whenToUse: 'Use when you want to switch between vim and default editing mode',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const config = extContext.configProvider;

    if (!config) {
      return {
        content:
          'Error: vim requires ConfigProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, VimArgsSchema, tokens => ({
      enabled: tokens.includes('on') ? true : tokens.includes('off') ? false : undefined
    }));

    // 读取当前状态
    const currentVal = await config.get('vimMode');
    const previousState = currentVal?.value === true;

    // 计算新状态: 如果指定了 enabled 则用它，否则 toggle
    const enabled = parsed.enabled ?? !previousState;

    // 写入新状态
    await config.set('vimMode', enabled);

    const prompt = buildVimPrompt({ enabled, previousState });
    return { content: prompt };
  }
};
