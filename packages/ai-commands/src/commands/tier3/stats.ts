/** /stats SkillDefinition — 详细统计（侧重跨会话累计） */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { StatsPromptInput } from '../../types/command-result';
import { StatsArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { STATS_TITLE } from '../../constants';

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function buildStatsPrompt(input: StatsPromptInput): string {
  const { snapshot } = input;
  const lines: string[] = [STATS_TITLE, ''];
  lines.push(`Scope: ${input.scope}`);
  if (snapshot.windowStart && snapshot.windowEnd) {
    lines.push(
      `Window: ${new Date(snapshot.windowStart).toISOString()} → ${new Date(snapshot.windowEnd).toISOString()}`
    );
  }
  lines.push('');
  lines.push(`Total requests: ${fmt(snapshot.totalRequests)}`);
  lines.push(`Input tokens: ${fmt(snapshot.totalInputTokens)}`);
  lines.push(`Output tokens: ${fmt(snapshot.totalOutputTokens)}`);
  if (snapshot.totalCacheCreationTokens !== undefined) {
    lines.push(`Cache creation tokens: ${fmt(snapshot.totalCacheCreationTokens)}`);
  }
  if (snapshot.totalCacheReadTokens !== undefined) {
    lines.push(`Cache read tokens: ${fmt(snapshot.totalCacheReadTokens)}`);
  }
  lines.push(`Total cost: $${snapshot.totalCostUsd.toFixed(4)}`);

  if (input.detailed && snapshot.totalRequests > 0) {
    const avgIn = Math.round(snapshot.totalInputTokens / snapshot.totalRequests);
    const avgOut = Math.round(snapshot.totalOutputTokens / snapshot.totalRequests);
    const avgCost = snapshot.totalCostUsd / snapshot.totalRequests;
    lines.push('');
    lines.push('Per-request averages:');
    lines.push(`  Input tokens: ${fmt(avgIn)}`);
    lines.push(`  Output tokens: ${fmt(avgOut)}`);
    lines.push(`  Cost: $${avgCost.toFixed(4)}`);
  }
  return lines.join('\n');
}

export const statsSkill: SkillDefinition = {
  name: 'stats',
  description: 'Show aggregated usage statistics across sessions',
  aliases: [],
  argumentHint: '[session|day|week|month|all] [detailed]',
  whenToUse: 'Use to analyze long-term token consumption and cost trends',
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
          'Error: /stats requires StatsProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, StatsArgsSchema, tokens => ({
      scope: tokens[0],
      detailed: tokens.includes('detailed')
    }));
    const scope = parsed.scope ?? 'all';
    const snapshot =
      scope === 'session'
        ? await provider.getSessionUsage()
        : await provider.getAggregateUsage(scope);
    return { content: buildStatsPrompt({ snapshot, scope, detailed: parsed.detailed }) };
  }
};
