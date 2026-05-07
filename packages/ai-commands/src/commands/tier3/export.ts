/** /export SkillDefinition — 导出当前会话到磁盘 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { ExportPromptInput } from '../../types/command-result';
import { ExportArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { EXPORT_TITLE } from '../../constants';

export function buildExportPrompt(input: ExportPromptInput): string {
  const { result } = input;
  if (!result.success) {
    return `${EXPORT_TITLE}\n\nExport failed: ${result.error ?? 'unknown error'}`;
  }
  const target = result.path ? `to ${result.path}` : '(in-memory)';
  return `${EXPORT_TITLE}\n\nExported session ${target} as ${result.format} (${result.bytes} bytes).`;
}

export const exportSkill: SkillDefinition = {
  name: 'export',
  description: 'Export the current session in JSON, JSONL, or Markdown format',
  aliases: [],
  argumentHint: '[format] [output-path]',
  whenToUse: 'Use to archive or share a transcript of the current conversation',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const ext = context as ExtendedSkillExecutionContext;
    const provider = ext.exportProvider;
    if (!provider) {
      return {
        content:
          'Error: /export requires ExportProvider. Host must inject it via SkillExecutionContext.'
      };
    }
    const parsed = parseCommandArgs(args, ExportArgsSchema, tokens => ({
      format: tokens[0],
      output: tokens[1]
    }));
    const format = parsed.format ?? 'json';
    const result = await provider.exportSession(format, parsed.output);
    return { content: buildExportPrompt({ result }) };
  }
};
