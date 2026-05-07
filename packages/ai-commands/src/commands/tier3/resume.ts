/** /resume SkillDefinition — 恢复指定会话或列出可恢复会话 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { ResumePromptInput } from '../../types/command-result';
import { ResumeArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { RESUME_TITLE } from '../../constants';

export function buildResumePrompt(input: ResumePromptInput): string {
  if (input.entries) {
    const lines: string[] = [RESUME_TITLE, '', 'Pick a session to resume:'];
    if (input.entries.length === 0) {
      lines.push('No resumable sessions found.');
      return lines.join('\n');
    }
    for (const entry of input.entries) {
      const title = entry.title ?? entry.preview ?? '(untitled)';
      const updated = new Date(entry.updatedAt).toISOString();
      lines.push(`- [${entry.id}] ${title} · ${updated} (${entry.turnCount} turns)`);
    }
    return lines.join('\n');
  }
  if (input.success) {
    return `${RESUME_TITLE}\n\nResumed session ${input.sessionId}.`;
  }
  return `${RESUME_TITLE}\n\nFailed to resume session ${input.sessionId ?? '<unknown>'}: ${input.error ?? 'unknown error'}`;
}

export const resumeSkill: SkillDefinition = {
  name: 'resume',
  description: 'Resume a previously saved session',
  aliases: ['continue'],
  argumentHint: '[sessionId]',
  whenToUse: 'Use to load a saved conversation and continue from where you left off',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.sessionStoreProvider;
    if (!provider) {
      return {
        content:
          'Error: /resume requires SessionStoreProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, ResumeArgsSchema, tokens => ({
      sessionId: tokens[0]
    }));

    if (!parsed.sessionId) {
      const entries = await provider.list();
      return { content: buildResumePrompt({ entries, success: true }) };
    }
    const result = await provider.resume(parsed.sessionId);
    return {
      content: buildResumePrompt({
        sessionId: parsed.sessionId,
        success: result.success,
        error: result.error
      })
    };
  }
};
