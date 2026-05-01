/** /add-dir SkillDefinition — 添加目录到上下文 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { AddDirPromptInput } from '../../types/command-result';
import { AddDirArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';

/** 构建 add-dir prompt — 纯函数 */
export function buildAddDirPrompt(input: AddDirPromptInput): string {
  const lines: string[] = [];

  if (input.success) {
    lines.push(`## Directory Added`);
    lines.push(`Directory "${input.path}" has been added to the context.`);
  } else {
    lines.push(`## Directory Not Found`);
    lines.push(`Directory "${input.path}" does not exist or could not be accessed.`);
  }

  return lines.join('\n');
}

/** /add-dir SkillDefinition */
export const addDirSkill: SkillDefinition = {
  name: 'add-dir',
  description: 'Add a directory to the current context for file access',
  aliases: ['ad'],
  argumentHint: '<path>',
  whenToUse: 'Use when you need to expand the accessible directory scope',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const fsProvider = extContext.fsProvider;

    if (!fsProvider) {
      return {
        content:
          'Error: add-dir requires FileSystemProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, AddDirArgsSchema, tokens => ({ path: tokens[0] }));
    const path = parsed.path;

    try {
      const stat = await fsProvider.stat(path);
      const success = stat.exists && stat.isDirectory;

      return { content: buildAddDirPrompt({ path, success }) };
    } catch {
      return { content: buildAddDirPrompt({ path, success: false }) };
    }
  }
};
