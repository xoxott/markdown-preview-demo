/** /plan SkillDefinition — 切换 Plan Mode */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { PlanPromptInput } from '../../types/command-result';
import { PlanArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { PLAN_TITLE } from '../../constants';

export function buildPlanPrompt(input: PlanPromptInput): string {
  const lines: string[] = [PLAN_TITLE, ''];
  if (input.action === 'status') {
    lines.push(`Plan Mode is currently ${input.state.enabled ? 'ON' : 'OFF'}.`);
    return lines.join('\n');
  }
  const transition =
    input.previousEnabled === input.state.enabled
      ? `remains ${input.state.enabled ? 'ON' : 'OFF'}`
      : `${input.state.enabled ? 'ENABLED' : 'DISABLED'}`;
  lines.push(`Plan Mode ${transition}.`);
  return lines.join('\n');
}

export const planSkill: SkillDefinition = {
  name: 'plan',
  description: 'Toggle Plan Mode (read-only collaborative planning)',
  aliases: [],
  argumentHint: '[on|off|toggle|status]',
  whenToUse: 'Use to enable/disable Plan Mode for safer multi-step exploration',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.planModeProvider;
    if (!provider) {
      return {
        content:
          'Error: /plan requires PlanModeProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, PlanArgsSchema, tokens => ({
      subcommand: tokens[0]
    }));
    const action = parsed.subcommand ?? 'toggle';
    const before = await provider.getState();
    if (action === 'status') {
      return { content: buildPlanPrompt({ action, state: before }) };
    }
    let target: boolean;
    if (action === 'on') target = true;
    else if (action === 'off') target = false;
    else target = !before.enabled;
    const after = await provider.setEnabled(target);
    return {
      content: buildPlanPrompt({
        action,
        state: after,
        previousEnabled: before.enabled
      })
    };
  }
};
