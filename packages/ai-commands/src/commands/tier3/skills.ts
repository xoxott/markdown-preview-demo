/** /skills SkillDefinition — 列出/启用/禁用 skill */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { SkillsPromptInput } from '../../types/command-result';
import { SkillsArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { SKILLS_TITLE } from '../../constants';

export function buildSkillsPrompt(input: SkillsPromptInput): string {
  const lines: string[] = [SKILLS_TITLE, ''];
  switch (input.action) {
    case 'list':
      if (!input.summaries || input.summaries.length === 0) {
        lines.push('No skills registered.');
        return lines.join('\n');
      }
      for (const skill of input.summaries) {
        const status = skill.enabled ? '[on]' : '[off]';
        lines.push(`- ${status} ${skill.name} (${skill.source}) — ${skill.description}`);
      }
      return lines.join('\n');
    case 'enable':
      return `${SKILLS_TITLE}\n\n${input.success ? `Enabled skill ${input.name ?? ''}.` : `Failed to enable skill ${input.name ?? ''}.`}`;
    case 'disable':
      return `${SKILLS_TITLE}\n\n${input.success ? `Disabled skill ${input.name ?? ''}.` : `Failed to disable skill ${input.name ?? ''}.`}`;
    default:
      return lines.join('\n');
  }
}

export const skillsSkill: SkillDefinition = {
  name: 'skills',
  description: 'List or toggle bundled and custom skills',
  aliases: [],
  argumentHint: '[list|enable|disable] [name]',
  whenToUse: 'Use to inspect or manage available skills',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.skillsProvider;
    if (!provider) {
      return {
        content:
          'Error: /skills requires SkillsProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, SkillsArgsSchema, tokens => {
      if (tokens.length === 0) return { subcommand: 'list' };
      return { subcommand: tokens[0], name: tokens[1] };
    });
    const action = parsed.subcommand ?? 'list';
    if (action === 'list') {
      const summaries = await provider.list();
      return { content: buildSkillsPrompt({ action, summaries }) };
    }
    if (!parsed.name) {
      return { content: `${SKILLS_TITLE}\n\n${action} requires a skill name.` };
    }
    const success =
      action === 'enable'
        ? await provider.enable(parsed.name)
        : await provider.disable(parsed.name);
    return { content: buildSkillsPrompt({ action, name: parsed.name, success }) };
  }
};
