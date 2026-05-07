/** /hooks SkillDefinition — 列出/启用/禁用/重载钩子 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { HooksPromptInput } from '../../types/command-result';
import { HooksArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { HOOKS_TITLE } from '../../constants';

export function buildHooksPrompt(input: HooksPromptInput): string {
  const lines: string[] = [HOOKS_TITLE, ''];
  switch (input.action) {
    case 'list':
      if (!input.entries || input.entries.length === 0) {
        lines.push('No hooks configured.');
        return lines.join('\n');
      }
      for (const hook of input.entries) {
        const status = hook.enabled ? '[on]' : '[off]';
        lines.push(
          `- ${status} [${hook.id}] ${hook.event} (${hook.source})${hook.command ? ` — ${hook.command}` : ''}`
        );
      }
      return lines.join('\n');
    case 'enable':
      return `${HOOKS_TITLE}\n\n${input.success ? `Enabled hook ${input.id ?? ''}.` : `Failed to enable hook ${input.id ?? ''}.`}`;
    case 'disable':
      return `${HOOKS_TITLE}\n\n${input.success ? `Disabled hook ${input.id ?? ''}.` : `Failed to disable hook ${input.id ?? ''}.`}`;
    case 'reload': {
      const errs =
        input.errors && input.errors.length > 0
          ? `\nErrors:\n${input.errors.map(e => `  - ${e}`).join('\n')}`
          : '';
      return `${HOOKS_TITLE}\n\nReloaded hooks. Loaded: ${input.loaded ?? 0}.${errs}`;
    }
    default:
      return lines.join('\n');
  }
}

export const hooksSkill: SkillDefinition = {
  name: 'hooks',
  description: 'List, toggle, or reload event hooks',
  aliases: [],
  argumentHint: '[list|enable|disable|reload] [id]',
  whenToUse: 'Use to inspect or manage hooks that fire on agent events',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.hooksProvider;
    if (!provider) {
      return {
        content:
          'Error: /hooks requires HooksProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, HooksArgsSchema, tokens => {
      if (tokens.length === 0) return { subcommand: 'list' };
      return { subcommand: tokens[0], id: tokens[1] };
    });
    const action = parsed.subcommand ?? 'list';

    if (action === 'list') {
      const entries = await provider.list();
      return { content: buildHooksPrompt({ action, entries }) };
    }
    if (action === 'reload') {
      const result = await provider.reload();
      return {
        content: buildHooksPrompt({
          action,
          loaded: result.loaded,
          errors: result.errors,
          success: result.errors.length === 0
        })
      };
    }
    if (!parsed.id) {
      return { content: `${HOOKS_TITLE}\n\n${action} requires a hook id.` };
    }
    const success = await provider.setEnabled(parsed.id, action === 'enable');
    return { content: buildHooksPrompt({ action, id: parsed.id, success }) };
  }
};
