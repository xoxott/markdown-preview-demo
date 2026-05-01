/** /diff SkillDefinition — Git diff 显示 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { DiffPromptInput } from '../../types/command-result';
import { DiffArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { DIFF_TITLE } from '../../constants';

/** 构建 diff prompt — 纯函数 */
export function buildDiffPrompt(input: DiffPromptInput): string {
  const lines: string[] = [];

  lines.push(DIFF_TITLE);
  lines.push(`Branch: ${input.branch}`);
  if (input.stagedOnly) {
    lines.push('(staged changes only)');
  }
  lines.push('');

  // 过滤 diff 行
  if (input.filter) {
    const filteredLines = input.diff
      .split('\n')
      .filter(
        line =>
          (line.startsWith('diff --git') && line.includes(input.filter!)) ||
          !line.startsWith('diff --git')
      );
    lines.push(filteredLines.join('\n'));
  } else {
    lines.push(input.diff);
  }

  return lines.join('\n');
}

/** /diff SkillDefinition */
export const diffSkill: SkillDefinition = {
  name: 'diff',
  description: 'Show git diff of current changes',
  aliases: ['d'],
  argumentHint: '[filter] [stagedOnly]',
  whenToUse: 'Use when you want to see the current changes before committing',
  allowedTools: ['bash', 'file-read'],
  context: 'inline',
  userInvocable: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const gitProvider = extContext.gitProvider;

    if (!gitProvider) {
      return {
        content: 'Error: diff requires GitProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, DiffArgsSchema, tokens => ({
      filter: tokens[0],
      stagedOnly: tokens.includes('staged')
    }));

    const status = await gitProvider.getStatus();
    const diff = parsed.stagedOnly
      ? await gitProvider.getStagedDiff()
      : await gitProvider.getFullDiff();

    const prompt = buildDiffPrompt({
      diff,
      stagedOnly: parsed.stagedOnly,
      branch: status.branch,
      filter: parsed.filter
    });

    return { content: prompt };
  }
};
