/** SkillTool — 斜杠命令桥接工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { SkillInput } from '../types/tool-inputs';
import type { SkillOutput } from '../types/tool-outputs';
import { SkillInputSchema } from '../types/tool-inputs';

/**
 * SkillTool — 斜杠命令桥接工具
 *
 * - isReadOnly: false — 执行命令
 * - isConcurrencySafe: false — skill可能修改状态
 * - safetyLabel: varies — inline='readonly', fork='system'
 * - 依赖SkillProvider（宿主注入）
 * - inline模式: 返回skill定义(prompt+allowedTools+model)
 * - fork模式: 返回success+result（宿主负责执行）
 */
export const skillTool = buildTool<SkillInput, SkillOutput>({
  name: 'skill',

  inputSchema: SkillInputSchema,

  description: async input => `Invoke skill: /${input.skill}${input.args ? ` ${input.args}` : ''}`,

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: (input?: SkillInput): SafetyLabel => {
    // inline skill → readonly, fork → system
    // 无input时默认system（保守策略）
    return 'system' as SafetyLabel;
  },
  isDestructive: () => false,

  validateInput: (input: SkillInput): ValidationResult => {
    if (input.skill.trim().length === 0) {
      return {
        behavior: 'deny',
        message: 'Skill name cannot be empty',
        reason: 'invalid_skill_name'
      };
    }
    return { behavior: 'allow' };
  },

  checkPermissions: (): PermissionResult => {
    return { behavior: 'ask', message: 'Invoke skill command?' };
  },

  call: async (
    input: SkillInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<SkillOutput>> => {
    const skillProvider = context.skillProvider;

    if (!skillProvider) {
      return {
        data: {
          success: false,
          commandName: input.skill,
          status: 'inline',
          result: 'SkillProvider not available'
        }
      };
    }

    const skillDef = await skillProvider.findSkill(input.skill);

    if (!skillDef) {
      return {
        data: {
          success: false,
          commandName: input.skill,
          status: 'inline',
          result: `Skill "${input.skill}" not found`
        }
      };
    }

    const skillContext = skillDef.context ?? 'inline';

    return {
      data: {
        success: true,
        commandName: skillDef.name,
        status: skillContext === 'fork' ? 'forked' : 'inline',
        allowedTools: skillDef.allowedTools,
        model: skillDef.model,
        result: skillDef.prompt
      }
    };
  },

  toAutoClassifierInput: (input: SkillInput) => ({
    toolName: 'skill',
    input,
    safetyLabel: 'system',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 50_000
});
