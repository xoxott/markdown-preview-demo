/** /cost SkillDefinition — 会话成本详情 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { CostPromptInput } from '../../types/command-result';
import { CostArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { COST_TITLE } from '../../constants';

/** 构建 cost prompt — 纯函数 */
export function buildCostPrompt(input: CostPromptInput): string {
  const lines: string[] = [COST_TITLE, ''];

  lines.push(
    `**Tokens:** ${input.tokenUsage.inputTokens} input + ${input.tokenUsage.outputTokens} output = ${input.tokenUsage.totalTokens} total`
  );
  lines.push(`**Cost:** $${input.cost.totalCost.toFixed(4)}`);
  if (input.cost.inputCost > 0) {
    lines.push(`  - Input: $${input.cost.inputCost.toFixed(4)}`);
  }
  if (input.cost.outputCost > 0) {
    lines.push(`  - Output: $${input.cost.outputCost.toFixed(4)}`);
  }

  if (input.detailed) {
    lines.push('');
    lines.push('_(Per-turn breakdown requires host implementation)_');
  }

  return lines.join('\n');
}

/** /cost SkillDefinition */
export const costSkill: SkillDefinition = {
  name: 'cost',
  description: 'Show detailed cost breakdown for the current session',
  aliases: [],
  argumentHint: '[detailed]',
  whenToUse: 'Use when you want to see token usage and cost details for this session',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const sessionInfo = extContext.sessionInfoProvider;

    if (!sessionInfo) {
      return {
        content:
          'Error: cost requires SessionInfoProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, CostArgsSchema, tokens => ({
      detailed: tokens.includes('detailed') || tokens.includes('d')
    }));

    const tokenUsage = await sessionInfo.getTokenUsage();
    const cost = await sessionInfo.getCost();

    const prompt = buildCostPrompt({ tokenUsage, cost, detailed: parsed.detailed });
    return { content: prompt };
  }
};
