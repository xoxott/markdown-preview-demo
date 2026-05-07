/** /tasks SkillDefinition — 管理后台/定时任务 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { TasksPromptInput } from '../../types/command-result';
import { TasksArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { TASKS_TITLE } from '../../constants';

export function buildTasksPrompt(input: TasksPromptInput): string {
  const lines: string[] = [TASKS_TITLE, ''];
  switch (input.action) {
    case 'list':
      if (!input.entries || input.entries.length === 0) {
        lines.push('No scheduled tasks.');
        return lines.join('\n');
      }
      for (const task of input.entries) {
        const next = task.nextRun ? new Date(task.nextRun).toISOString() : '—';
        const last = task.lastRun ? new Date(task.lastRun).toISOString() : '—';
        const sched = task.schedule ? ` (${task.schedule})` : '';
        lines.push(
          `- [${task.id}] ${task.title}${sched} — status=${task.status}, next=${next}, last=${last}`
        );
      }
      return lines.join('\n');
    case 'cancel':
      return `${TASKS_TITLE}\n\n${input.success ? `Cancelled task ${input.id ?? ''}.` : `Failed to cancel task ${input.id ?? ''}.`}`;
    case 'trigger':
      return `${TASKS_TITLE}\n\n${input.success ? `Triggered task ${input.id ?? ''}.` : `Failed to trigger task ${input.id ?? ''}.`}`;
    default:
      return lines.join('\n');
  }
}

export const tasksSkill: SkillDefinition = {
  name: 'tasks',
  description: 'List, cancel, or trigger scheduled background tasks',
  aliases: [],
  argumentHint: '[list|cancel|trigger] [id]',
  whenToUse: 'Use to manage cron-like or background work scheduled by the agent',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.tasksProvider;
    if (!provider) {
      return {
        content:
          'Error: /tasks requires TasksProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, TasksArgsSchema, tokens => {
      if (tokens.length === 0) return { subcommand: 'list' };
      return { subcommand: tokens[0], id: tokens[1] };
    });
    const action = parsed.subcommand ?? 'list';

    if (action === 'list') {
      const entries = await provider.list();
      return { content: buildTasksPrompt({ action, entries }) };
    }
    if (!parsed.id) {
      return { content: `${TASKS_TITLE}\n\n${action} requires a task id.` };
    }
    const success =
      action === 'cancel' ? await provider.cancel(parsed.id) : await provider.trigger(parsed.id);
    return { content: buildTasksPrompt({ action, id: parsed.id, success }) };
  }
};
