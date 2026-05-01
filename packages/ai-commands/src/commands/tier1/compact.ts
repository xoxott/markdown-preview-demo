/** /compact SkillDefinition — 上下文压缩命令 */

import type { SkillDefinition, SkillExecutionContext, SkillPromptResult } from '@suga/ai-skill';
import type { CompactPromptInput } from '../../types/command-result';
import { CompactArgsSchema } from '../../types/command-args';
import { parseCommandArgs } from '../../utils/args-parser';
import { COMPACT_PROMPT_TITLE } from '../../constants';

/** 构建 compact prompt — 纯函数 */
export function buildCompactPrompt(input: CompactPromptInput): string {
  const lines: string[] = [];

  lines.push(COMPACT_PROMPT_TITLE);
  lines.push('');

  if (input.force) {
    lines.push('Force compaction requested — compress even if context is not large.');
  } else {
    lines.push('Compress the current conversation context to reduce token usage.');
  }

  lines.push('');
  lines.push('Instructions:');
  lines.push('- Preserve all important decisions, facts, and user preferences');
  lines.push('- Keep tool call results that are still relevant');
  lines.push('- Summarize lengthy outputs into key points');
  lines.push('- Maintain the current task context and next steps');
  lines.push('- Remove redundant or already-acted-on information');

  if (input.instruction) {
    lines.push('');
    lines.push(`Custom instruction: ${input.instruction}`);
  }

  return lines.join('\n');
}

/** /compact SkillDefinition */
export const compactSkill: SkillDefinition = {
  name: 'compact',
  description: 'Compact the current conversation context to reduce token usage',
  aliases: ['compress'],
  argumentHint: '[instruction]',
  whenToUse: 'Use when context is getting large and you want to compress it for efficiency',
  allowedTools: undefined,
  context: 'inline',
  userInvocable: true,
  disableModelInvocation: true,

  getPromptForCommand: async (
    args: string,
    context: SkillExecutionContext
  ): Promise<SkillPromptResult> => {
    const parsed = parseCommandArgs(args, CompactArgsSchema);

    const prompt = buildCompactPrompt({
      instruction: parsed.instruction,
      force: parsed.force
    });

    return {
      content: prompt,
      contextModifier: {
        // 信号给 runtime CompressPipeline
        // 宿主通过 meta 识别 compactSignal
      }
    };
  }
};
