/** SkillTool 测试 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import type { ToolUseContext } from '@suga/ai-tool-core';
import { createSkillTool } from '../tool/SkillTool';
import { SkillRegistry } from '../registry/SkillRegistry';
import { createMockSkillDefinition } from './mocks/MockSkillRegistry';

/** 创建测试用的 ToolUseContext */
function createTestToolContext(overrides: Partial<ToolUseContext> = {}): ToolUseContext {
  const abortController = new AbortController();
  return {
    abortController,
    tools: overrides.tools ?? new ToolRegistry(),
    sessionId: 'test-session',
    ...overrides
  };
}

describe('SkillTool', () => {
  describe('createSkillTool', () => {
    it('应创建名为 "skill" 的 BuiltTool', () => {
      const registry = new SkillRegistry();
      const skillTool = createSkillTool(registry);
      expect(skillTool.name).toBe('skill');
    });

    it('应注册到 ToolRegistry', () => {
      const skillRegistry = new SkillRegistry();
      const skillTool = createSkillTool(skillRegistry);
      const toolRegistry = new ToolRegistry();
      toolRegistry.register(skillTool);
      expect(toolRegistry.get('skill')).toBe(skillTool);
    });

    it('应执行 Skill 并返回 prompt 内容', async () => {
      const skillRegistry = new SkillRegistry();
      skillRegistry.register(
        createMockSkillDefinition({
          name: 'commit',
          getPromptForCommand: async args => ({
            content: `Commit prompt: ${args}`
          })
        })
      );

      const skillTool = createSkillTool(skillRegistry);
      const context = createTestToolContext();

      const result = await skillTool.call({ skill_name: 'commit', args: 'fix bug' }, context);

      expect(result.data.skillName).toBe('commit');
      expect(result.data.prompt).toBe('Commit prompt: fix bug');
      expect(result.error).toBeUndefined();
    });

    it('应通过别名执行 Skill', async () => {
      const skillRegistry = new SkillRegistry();
      skillRegistry.register(
        createMockSkillDefinition({
          name: 'review-pr',
          aliases: ['review'],
          getPromptForCommand: async args => ({
            content: `Review prompt: ${args}`
          })
        })
      );

      const skillTool = createSkillTool(skillRegistry);
      const context = createTestToolContext();

      const result = await skillTool.call({ skill_name: 'review', args: 'PR#1' }, context);

      expect(result.data.skillName).toBe('review');
      expect(result.data.prompt).toBe('Review prompt: PR#1');
    });

    it('未找到 Skill 应返回错误信息', async () => {
      const skillRegistry = new SkillRegistry();
      const skillTool = createSkillTool(skillRegistry);
      const context = createTestToolContext();

      const result = await skillTool.call({ skill_name: 'nonexistent' }, context);

      expect(result.data.skillName).toBe('nonexistent');
      expect(result.data.prompt).toBe('');
      expect(result.error).toContain('未找到');
    });

    it('description 应返回 Skill 描述', async () => {
      const skillRegistry = new SkillRegistry();
      skillRegistry.register(
        createMockSkillDefinition({
          name: 'commit',
          description: 'Create a git commit'
        })
      );

      const skillTool = createSkillTool(skillRegistry);
      const description = await skillTool.description({ skill_name: 'commit' });
      expect(description).toBe('Create a git commit');
    });

    it('description 对未找到 Skill 应返回提示', async () => {
      const skillRegistry = new SkillRegistry();
      const skillTool = createSkillTool(skillRegistry);
      const description = await skillTool.description({ skill_name: 'unknown' });
      expect(description).toContain('未找到');
    });

    it('应为 readonly 工具', () => {
      const skillRegistry = new SkillRegistry();
      const skillTool = createSkillTool(skillRegistry);
      expect(skillTool.isReadOnly({ skill_name: 'test' })).toBe(true);
      expect(skillTool.safetyLabel({ skill_name: 'test' })).toBe('readonly');
    });

    it('应传递 contextModifier 到 ToolResult', async () => {
      const skillRegistry = new SkillRegistry();
      skillRegistry.register(
        createMockSkillDefinition({
          name: 'debug',
          getPromptForCommand: async () => ({
            content: 'Debug prompt',
            contextModifier: {
              allowedTools: ['Bash', 'Read'],
              model: 'claude-haiku-4-5-20251001'
            }
          })
        })
      );

      const skillTool = createSkillTool(skillRegistry);
      const context = createTestToolContext();

      const result = await skillTool.call({ skill_name: 'debug' }, context);

      expect(result.data.contextModifier?.allowedTools).toEqual(['Bash', 'Read']);
      expect(result.data.contextModifier?.model).toBe('claude-haiku-4-5-20251001');
    });
  });
});
