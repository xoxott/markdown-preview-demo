/** /commit SkillDefinition — Git commit 工作流命令 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { CommitPromptInput } from '../../types/command-result';
import { CommitArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { formatGitLog, formatGitStatus } from '../../utils/format-helpers';
import { DEFAULT_COMMIT_LOG_COUNT, MAX_COMMIT_DIFF_LINES } from '../../constants';

/** 构建 commit prompt — 纯函数 */
export function buildCommitPrompt(input: CommitPromptInput): string {
  const lines: string[] = [];

  // 标题
  lines.push('## Git Commit');
  lines.push('');

  // 自定义指令
  if (input.instruction) {
    lines.push(`### Instruction: ${input.instruction}`);
    lines.push('');
  }

  // Amend 标记
  if (input.amend) {
    lines.push('### Mode: Amend previous commit');
    lines.push('');
  }

  // Git 状态摘要
  lines.push(formatGitStatus(input.status));
  lines.push('');

  // 最近 commit 日志（风格参考）
  lines.push(formatGitLog(input.recentLog));
  lines.push('');

  // Diff 内容
  lines.push('### Staged Changes:');
  const diffLines = input.diff.split('\n');
  if (diffLines.length > MAX_COMMIT_DIFF_LINES) {
    lines.push(diffLines.slice(0, MAX_COMMIT_DIFF_LINES).join('\n'));
    lines.push(
      `\n... (truncated: ${diffLines.length} total lines, showing ${MAX_COMMIT_DIFF_LINES})`
    );
  } else {
    lines.push(input.diff);
  }

  // Commit 生成指令
  lines.push('');
  lines.push('Based on the above changes, generate an appropriate commit message.');
  lines.push('Follow the commit message style shown in the recent commits.');
  lines.push('Format: type(scope): subject — concise, imperative mood.');

  return lines.join('\n');
}

/** /commit SkillDefinition */
export const commitSkill: SkillDefinition = {
  name: 'commit',
  description: 'Generate a git commit message from staged changes and recent history',
  aliases: ['ci'],
  argumentHint: '[instruction]',
  whenToUse: 'Use when you want to commit staged changes with an AI-generated message',
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
        content:
          'Error: commit requires GitProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, CommitArgsSchema);
    const status = await gitProvider.getStatus();
    const diff = await gitProvider.getStagedDiff();
    const log = await gitProvider.getLog(DEFAULT_COMMIT_LOG_COUNT);

    const prompt = buildCommitPrompt({
      status,
      diff,
      recentLog: log,
      instruction: parsed.instruction,
      amend: parsed.amend
    });

    return { content: prompt };
  }
};
