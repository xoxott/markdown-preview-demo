/** /theme SkillDefinition — 显示或切换主题 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { ThemePromptInput } from '../../types/command-result';
import { ThemeArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { THEME_TITLE } from '../../constants';

export function buildThemePrompt(input: ThemePromptInput): string {
  const lines: string[] = [THEME_TITLE, ''];
  if (input.switchedTo) {
    lines.push(`Switched theme to "${input.switchedTo.name}".`);
    if (input.switchedTo.description) lines.push(input.switchedTo.description);
    return lines.join('\n');
  }
  lines.push(`Current theme: ${input.current.name}`);
  if (input.current.description) lines.push(input.current.description);
  if (input.available && input.available.length > 0) {
    lines.push('');
    lines.push('Available themes:');
    for (const theme of input.available) {
      const marker = theme.name === input.current.name ? '*' : '-';
      lines.push(`${marker} ${theme.name}${theme.isDark ? ' (dark)' : ''}`);
    }
  }
  return lines.join('\n');
}

export const themeSkill: SkillDefinition = {
  name: 'theme',
  description: 'Show or switch the UI color theme',
  aliases: [],
  argumentHint: '[name]',
  whenToUse: 'Use to change the visual theme used by the CLI/IDE',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.themeProvider;
    if (!provider) {
      return {
        content:
          'Error: /theme requires ThemeProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, ThemeArgsSchema, tokens => ({
      name: tokens[0]
    }));
    const current = await provider.getCurrent();
    if (!parsed.name) {
      const available = await provider.list();
      return { content: buildThemePrompt({ current, available }) };
    }
    const switchedTo = await provider.setTheme(parsed.name);
    return { content: buildThemePrompt({ current: switchedTo, switchedTo }) };
  }
};
