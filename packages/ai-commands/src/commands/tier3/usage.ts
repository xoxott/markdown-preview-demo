/** /usage SkillDefinition — token / cost 使用统计（侧重当前会话） */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { UsagePromptInput } from '../../types/command-result';
import { UsageArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { USAGE_TITLE } from '../../constants';

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function buildUsagePrompt(input: UsagePromptInput): string {
  const { snapshot } = input;
  const lines: string[] = [USAGE_TITLE, ''];
  lines.push(`Scope: ${input.scope}`);
  lines.push(`Requests: ${formatNumber(snapshot.totalRequests)}`);
  lines.push(`Input tokens: ${formatNumber(snapshot.totalInputTokens)}`);
  lines.push(`Output tokens: ${formatNumber(snapshot.totalOutputTokens)}`);
  if (snapshot.totalCacheCreationTokens !== undefined) {
    lines.push(`Cache creation tokens: ${formatNumber(snapshot.totalCacheCreationTokens)}`);
  }
  if (snapshot.totalCacheReadTokens !== undefined) {
    lines.push(`Cache read tokens: ${formatNumber(snapshot.totalCacheReadTokens)}`);
  }
  lines.push(`Cost: $${snapshot.totalCostUsd.toFixed(4)}`);
  return lines.join('\n');
}

export const usageSkill: SkillDefinition = {
  name: 'usage',
  description: 'Show token and cost usage for the current session or a wider scope',
  aliases: [],
  argumentHint: '[session|day|week|month|all]',
  whenToUse: 'Use to monitor token consumption and API spend',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.statsProvider;
    if (!provider) {
      return {
        content:
          'Error: /usage requires StatsProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, UsageArgsSchema, tokens => ({
      scope: tokens[0]
    }));
    const scope = parsed.scope ?? 'session';
    const snapshot =
      scope === 'session'
        ? await provider.getSessionUsage()
        : await provider.getAggregateUsage(scope);
    return { content: buildUsagePrompt({ snapshot, scope }) };
  }
};
