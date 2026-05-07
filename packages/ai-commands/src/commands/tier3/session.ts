/** /session SkillDefinition — 列出/重命名/删除已保存会话 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { SessionListPromptInput, SessionMutatePromptInput } from '../../types/command-result';
import { SessionArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { SESSION_TITLE } from '../../constants';

export function buildSessionListPrompt(input: SessionListPromptInput): string {
  const lines: string[] = [SESSION_TITLE, ''];
  if (input.entries.length === 0) {
    lines.push('No saved sessions yet.');
    return lines.join('\n');
  }
  for (const entry of input.entries) {
    const isCurrent = entry.id === input.currentSessionId ? ' (current)' : '';
    const title = entry.title ?? entry.preview ?? '(untitled)';
    const updated = new Date(entry.updatedAt).toISOString();
    lines.push(`- [${entry.id}]${isCurrent} ${title} — ${entry.turnCount} turns · ${updated}`);
  }
  return lines.join('\n');
}

export function buildSessionMutatePrompt(input: SessionMutatePromptInput): string {
  if (!input.success) {
    return `${SESSION_TITLE}\n\nFailed to ${input.action} session ${input.sessionId}: ${input.error ?? 'unknown error'}`;
  }
  switch (input.action) {
    case 'rename':
      return `${SESSION_TITLE}\n\nRenamed session ${input.sessionId} → "${input.newTitle ?? ''}".`;
    case 'delete':
      return `${SESSION_TITLE}\n\nDeleted session ${input.sessionId}.`;
    case 'show':
      if (!input.entry) return `${SESSION_TITLE}\n\nSession ${input.sessionId} not found.`;
      return `${SESSION_TITLE}\n\n${input.entry.title ?? '(untitled)'} — ${input.entry.turnCount} turns\nstartedAt: ${new Date(input.entry.startedAt).toISOString()}\nupdatedAt: ${new Date(input.entry.updatedAt).toISOString()}\ncwd: ${input.entry.cwd}`;
    default:
      return `${SESSION_TITLE}\n\nAction completed.`;
  }
}

export const sessionSkill: SkillDefinition = {
  name: 'session',
  description: 'List, show, rename, or delete saved sessions',
  aliases: ['sessions'],
  argumentHint: '<list|show|rename|delete> [sessionId] [title]',
  whenToUse: 'Use to manage prior conversations from the session store',
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
          'Error: /session requires SessionStoreProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, SessionArgsSchema, tokens => {
      if (tokens.length === 0) return { subcommand: 'list' };
      const sub = tokens[0];
      switch (sub) {
        case 'list':
          return { subcommand: 'list' };
        case 'show':
          return { subcommand: 'show', sessionId: tokens[1] };
        case 'rename':
          return {
            subcommand: 'rename',
            sessionId: tokens[1],
            title: tokens.slice(2).join(' ')
          };
        case 'delete':
          return { subcommand: 'delete', sessionId: tokens[1] };
        default:
          return { subcommand: 'list' };
      }
    });

    const subcommand = parsed.subcommand ?? 'list';

    if (subcommand === 'list') {
      const entries = await provider.list(parsed.limit);
      const currentSessionId = await provider.getCurrentSessionId();
      return { content: buildSessionListPrompt({ entries, currentSessionId }) };
    }

    if (!parsed.sessionId) {
      return { content: `${SESSION_TITLE}\n\n${subcommand} requires a sessionId.` };
    }

    if (subcommand === 'rename') {
      if (!parsed.title) {
        return { content: `${SESSION_TITLE}\n\nrename requires a title.` };
      }
      const success = await provider.rename(parsed.sessionId, parsed.title);
      return {
        content: buildSessionMutatePrompt({
          action: 'rename',
          sessionId: parsed.sessionId,
          newTitle: parsed.title,
          success
        })
      };
    }

    if (subcommand === 'delete') {
      const success = await provider.delete(parsed.sessionId);
      return {
        content: buildSessionMutatePrompt({
          action: 'delete',
          sessionId: parsed.sessionId,
          success
        })
      };
    }

    if (subcommand === 'show') {
      const entries = await provider.list();
      const entry = entries.find(e => e.id === parsed.sessionId);
      return {
        content: buildSessionMutatePrompt({
          action: 'show',
          sessionId: parsed.sessionId,
          entry,
          success: Boolean(entry)
        })
      };
    }

    return { content: `${SESSION_TITLE}\n\nUnknown subcommand: ${String(subcommand)}` };
  }
};
