/** /doctor SkillDefinition — 诊断检查命令 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { ExtendedSkillExecutionContext } from '../../context-merge';
import type { DoctorPromptInput } from '../../types/command-result';
import { DoctorArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import type { PositionalParser } from '../../utils/args-parser';
import { formatDiagnosticReport } from '../../utils/format-helpers';

/** /doctor 位置参数解析器: filter 作为第一个位置参数 */
const doctorPositionalParser: PositionalParser = tokens => ({
  filter: tokens[0]
});

/** 构建 doctor prompt — 纯函数 */
export function buildDoctorPrompt(input: DoctorPromptInput): string {
  return formatDiagnosticReport(input.report, input.filter);
}

/** /doctor SkillDefinition */
export const doctorSkill: SkillDefinition = {
  name: 'doctor',
  description: 'Run diagnostic checks on the AI development environment',
  aliases: ['diag'],
  argumentHint: '[filter]',
  whenToUse:
    'Use when you suspect something is wrong with the setup or want to verify the environment',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const extContext = context as ExtendedSkillExecutionContext;
    const diagnosticProvider = extContext.diagnosticProvider;

    if (!diagnosticProvider) {
      return {
        content:
          'Error: doctor requires DiagnosticProvider. Host must inject it via SkillExecutionContext.'
      };
    }

    const parsed = parseCommandArgs(args, DoctorArgsSchema, doctorPositionalParser);
    const report = await diagnosticProvider.runAll();

    const prompt = buildDoctorPrompt({
      report,
      filter: parsed.filter
    });

    return { content: prompt };
  }
};
