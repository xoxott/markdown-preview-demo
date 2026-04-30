/** SkillTool — 桥接 Tool，注册到 ToolRegistry 后 LLM 可通过 Skill({ skill_name, args }) 调用 */

import { z } from 'zod';
import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ToolUseContext } from '@suga/ai-tool-core';
import { SkillExecutor } from '../executor/SkillExecutor';
import type { SkillRegistry } from '../registry/SkillRegistry';
import { SKILL_TOOL_NAME } from '../constants';

/** SkillTool 输入 Schema */
const SkillToolInputSchema = z.object({
  skill_name: z.string().describe('Skill 名称或别名'),
  args: z.string().optional().describe('Skill 参数')
});

/** SkillTool 输入类型 */
type SkillToolInput = z.infer<typeof SkillToolInputSchema>;

/**
 * 创建 SkillTool — 桥接 Tool
 *
 * 执行路径:
 *
 * 1. inputSchema.safeParse(input) 验证输入
 * 2. 从 SkillRegistry 查找 skill（findByNameOrAlias）
 * 3. SkillExecutor.execute(skill_name, args, skillContext) 执行 skill
 * 4. 返回 ToolResult({ data: promptResult })
 *
 * @param skillRegistry Skill 注册表实例
 * @returns BuiltTool 可注册到 ToolRegistry
 */
export function createSkillTool(
  skillRegistry: SkillRegistry
): ReturnType<typeof buildTool<SkillToolInput, SkillToolResult>> {
  const executor = new SkillExecutor(skillRegistry);

  return buildTool({
    name: SKILL_TOOL_NAME,
    inputSchema: SkillToolInputSchema,
    call: async (
      input: SkillToolInput,
      context: ToolUseContext
    ): Promise<ToolResult<SkillToolResult>> => {
      const skillContext = {
        sessionId: context.sessionId,
        toolRegistry: context.tools,
        hookRegistry: context.hookRegistry,
        abortSignal: context.abortController.signal,
        meta:
          ((context as unknown as Record<string, unknown>).meta as Record<string, unknown>) ?? {}
      };

      try {
        const promptResult = await executor.execute(
          input.skill_name,
          input.args ?? '',
          skillContext
        );

        return {
          data: {
            skillName: input.skill_name,
            prompt: promptResult.content,
            contextModifier: promptResult.contextModifier
          }
        };
      } catch (err) {
        return {
          data: {
            skillName: input.skill_name,
            prompt: '',
            error: err instanceof Error ? err.message : String(err)
          },
          error: err instanceof Error ? err.message : String(err)
        };
      }
    },
    description: async (input: SkillToolInput): Promise<string> => {
      const skill = skillRegistry.findByNameOrAlias(input.skill_name);
      if (skill === undefined) {
        return `Skill "${input.skill_name}" 未找到`;
      }
      return skill.description;
    },
    isReadOnly: () => true,
    isConcurrencySafe: () => false,
    safetyLabel: () => 'readonly'
  });
}

/** SkillTool 返回数据结构 */
export interface SkillToolResult {
  /** 执行的 Skill 名称 */
  readonly skillName: string;
  /** Skill prompt 内容 */
  readonly prompt: string;
  /** 上下文修改（可选） */
  readonly contextModifier?: import('../types/skill').SkillContextModifier;
  /** 错误信息（可选） */
  readonly error?: string;
}
