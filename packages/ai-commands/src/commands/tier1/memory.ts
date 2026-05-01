/** /memory SkillDefinition — 记忆管理命令 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type {
  MemoryForgetPromptInput,
  MemoryRecallPromptInput,
  MemoryRefreshPromptInput,
  MemorySavePromptInput
} from '../../types/command-result';
import { MemoryArgsSchema } from '../../types/command-args';
import { memoryPositionalParser, parseCommandArgs } from '../../utils/args-parser';
import { formatMemoryEntries, formatRefreshResult } from '../../utils/format-helpers';
import { MEMORY_SAVE_TITLE } from '../../constants';

/** 构建 memory save prompt — 纯函数 */
export function buildMemorySavePrompt(input: MemorySavePromptInput): string {
  const lines: string[] = [];

  lines.push(MEMORY_SAVE_TITLE);
  lines.push('');

  if (input.result.success) {
    lines.push(`Successfully saved memory "${input.name}" (type: ${input.type}).`);
    lines.push(`Path: ${input.result.path}`);
  } else {
    lines.push(`Failed to save memory "${input.name}".`);
    if (input.result.error) {
      lines.push(`Error: ${input.result.error}`);
    }
  }

  return lines.join('\n');
}

/** 构建 memory recall prompt — 纯函数 */
export function buildMemoryRecallPrompt(input: MemoryRecallPromptInput): string {
  return formatMemoryEntries(input.entries, input.query);
}

/** 构建 memory forget prompt — 纯函数 */
export function buildMemoryForgetPrompt(input: MemoryForgetPromptInput): string {
  if (input.success) {
    return `Memory at "${input.path}" has been forgotten (deleted).`;
  }
  return `Failed to forget memory at "${input.path}". It may not exist or could not be removed.`;
}

/** 构建 memory refresh prompt — 纯函数 */
export function buildMemoryRefreshPrompt(input: MemoryRefreshPromptInput): string {
  return formatRefreshResult(input.result);
}

/** /memory SkillDefinition */
export const memorySkill: SkillDefinition = {
  name: 'memory',
  description: 'Manage project memories: save, recall, forget, or refresh',
  aliases: ['mem'],
  argumentHint: '<subcommand> [name|query]',
  whenToUse:
    'Use when you need to persist important information, recall past learnings, or manage memory files',
  allowedTools: ['file-read', 'file-write', 'glob'],
  context: 'inline',
  userInvocable: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const memoryProvider = extContext.memoryProvider;

    if (!memoryProvider) {
      return {
        content:
          'Error: memory requires MemoryCommandProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, MemoryArgsSchema, memoryPositionalParser);

    switch (parsed.subcommand) {
      case 'save': {
        const result = await memoryProvider.save(
          `memory/${parsed.type ?? 'user'}/${parsed.name ?? 'untitled'}.md`,
          parsed.content ?? '',
          {
            name: parsed.name ?? 'untitled',
            description: parsed.content?.slice(0, 100) ?? '',
            type: parsed.type ?? 'user'
          }
        );
        return {
          content: buildMemorySavePrompt({
            result,
            name: parsed.name ?? 'untitled',
            type: parsed.type ?? 'user'
          })
        };
      }
      case 'recall': {
        const entries = await memoryProvider.recall(parsed.query ?? '', 10);
        return {
          content: buildMemoryRecallPrompt({ entries, query: parsed.query ?? '' })
        };
      }
      case 'forget': {
        const path = parsed.name ?? '';
        const success = await memoryProvider.forget(path);
        return {
          content: buildMemoryForgetPrompt({ success, path })
        };
      }
      case 'refresh': {
        const result = await memoryProvider.refresh();
        return {
          content: buildMemoryRefreshPrompt({ result })
        };
      }
    }
  }
};
