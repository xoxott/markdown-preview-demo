/**
 * DiscoverSkillsTool — Skill发现/列出可用skills
 *
 * 对齐 CC DiscoverSkillsTool: 与 SkillTool（执行skill）配套，列出所有可用skill及其描述。 需 skill-provider 支持（宿主注入
 * SkillResolver.list()）。
 */

import { z } from 'zod/v4';
import { buildTool } from '@suga/ai-tool-core';
import type { ToolResult, ToolUseContext } from '@suga/ai-tool-core';

// ============================================================
// 类型定义
// ============================================================

/** DiscoverSkills 输入 Schema */
export const DiscoverSkillsInputSchema = z.strictObject({
  /** 搜索查询（可选，模糊匹配skill名称/描述） */
  query: z
    .string()
    .optional()
    .describe('Optional search query to filter skills by name or description')
});

export type DiscoverSkillsInput = z.infer<typeof DiscoverSkillsInputSchema>;

/** DiscoverSkills 输出 */
export interface DiscoverSkillsOutput {
  readonly skills: readonly {
    readonly name: string;
    readonly description: string;
  }[];
}

// ============================================================
// buildTool
// ============================================================

export const discoverSkillsTool = buildTool({
  name: 'discover_skills',
  description: async () =>
    'Discover and list available skills that can be invoked. Use this to find skills before invoking them with /skill.',
  safetyLabel: () => 'readonly',
  isReadOnly: () => true,
  inputSchema: DiscoverSkillsInputSchema,
  async call(
    input: DiscoverSkillsInput,
    context: ToolUseContext
  ): Promise<ToolResult<DiscoverSkillsOutput>> {
    const skillProvider = (context as unknown as Record<string, unknown>).skillProvider as
      | { list?: () => readonly { name: string; description: string }[] }
      | undefined;

    if (!skillProvider?.list) {
      return { data: { skills: [] } };
    }

    const allSkills = skillProvider.list();

    // 如果有查询，做模糊匹配
    if (input.query) {
      const q = input.query.toLowerCase();
      const filtered = allSkills.filter(
        s => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      );
      return { data: { skills: filtered } };
    }

    return { data: { skills: allSkills } };
  }
});
