/** /init SkillDefinition — 项目初始化 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { InitPromptInput } from '../../types/command-result';
import { InitArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { INIT_TITLE } from '../../constants';

/** 构建 init prompt — 纯函数 */
export function buildInitPrompt(input: InitPromptInput): string {
  const lines: string[] = [];

  lines.push(INIT_TITLE);
  lines.push(`Template: ${input.template}`);
  lines.push(`Project root: ${input.projectRoot}`);
  lines.push('');
  lines.push('Files created:');
  for (const file of input.filesCreated) {
    lines.push(`- ${file}`);
  }

  return lines.join('\n');
}

/** /init SkillDefinition */
export const initSkill: SkillDefinition = {
  name: 'init',
  description: 'Initialize project configuration (CLAUDE.md, settings)',
  aliases: ['setup'],
  argumentHint: '[template]',
  whenToUse: 'Use when starting in a new project and needing to set up configuration files',
  allowedTools: ['file-write'],
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
          'Error: init requires FileSystemProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, InitArgsSchema, tokens => ({
      template: tokens[0] ?? 'default'
    }));
    const template = parsed.template ?? 'default';
    const projectRoot = parsed.projectRoot ?? process.cwd?.() ?? '/project';

    // 根据模板决定创建哪些文件
    const filesCreated: string[] = [];
    const filesToCreate =
      template === 'minimal'
        ? ['CLAUDE.md']
        : template === 'full'
          ? ['CLAUDE.md', '.claude/settings.json', '.claude/commands/']
          : ['CLAUDE.md', '.claude/settings.json'];

    for (const file of filesToCreate) {
      try {
        const fullPath = `${projectRoot}/${file}`;
        if (file.endsWith('/')) {
          // 目录 — 仅记录
          filesCreated.push(`${fullPath} (directory)`);
        } else {
          await fsProvider.writeFile(
            fullPath,
            file === 'CLAUDE.md'
              ? '# Project Configuration\n\n## Key Decisions\n\n## Style Guide\n'
              : '{"permissions":{"mode":"default"}}'
          );
          filesCreated.push(fullPath);
        }
      } catch {
        filesCreated.push(`${projectRoot}/${file} (failed)`);
      }
    }

    return { content: buildInitPrompt({ template, projectRoot, filesCreated }) };
  }
};
