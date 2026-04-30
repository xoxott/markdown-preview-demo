/** SkillExecutor 测试 */

import { describe, expect, it, vi } from 'vitest';
import { HookRegistry } from '@suga/ai-hooks';
import { SkillExecutor } from '../executor/SkillExecutor';
import { SkillRegistry } from '../registry/SkillRegistry';
import type { SkillExecutionContext } from '../types/skill';
import { createMockSkillDefinition } from './mocks/MockSkillRegistry';

/** 创建测试用的 SkillExecutionContext */
function createTestContext(overrides: Partial<SkillExecutionContext> = {}): SkillExecutionContext {
  return {
    sessionId: 'test-session',
    toolRegistry: {} as any,
    hookRegistry: overrides.hookRegistry,
    abortSignal: new AbortController().signal,
    meta: {},
    ...overrides
  };
}

describe('SkillExecutor', () => {
  describe('execute', () => {
    it('应执行已注册的 Skill 并返回 prompt', async () => {
      const registry = new SkillRegistry();
      const skill = createMockSkillDefinition({
        name: 'commit',
        getPromptForCommand: async args => ({
          content: `Commit with args: ${args}`
        })
      });
      registry.register(skill);

      const executor = new SkillExecutor(registry);
      const result = await executor.execute('commit', 'fix bug', createTestContext());

      expect(result.content).toBe('Commit with args: fix bug');
    });

    it('应通过别名查找并执行 Skill', async () => {
      const registry = new SkillRegistry();
      const skill = createMockSkillDefinition({
        name: 'review-pr',
        aliases: ['review'],
        getPromptForCommand: async args => ({
          content: `Review: ${args}`
        })
      });
      registry.register(skill);

      const executor = new SkillExecutor(registry);
      const result = await executor.execute('review', 'PR #123', createTestContext());

      expect(result.content).toBe('Review: PR #123');
    });

    it('未找到 Skill 应抛出错误', async () => {
      const registry = new SkillRegistry();
      const executor = new SkillExecutor(registry);

      await expect(executor.execute('nonexistent', '', createTestContext())).rejects.toThrow(
        /未找到/
      );
    });

    it('未启用的 Skill 应抛出错误', async () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'disabled', isEnabled: () => false }));

      const executor = new SkillExecutor(registry);
      await expect(executor.execute('disabled', '', createTestContext())).rejects.toThrow(/未启用/);
    });

    it('应返回 contextModifier', async () => {
      const registry = new SkillRegistry();
      registry.register(
        createMockSkillDefinition({
          name: 'review',
          getPromptForCommand: async () => ({
            content: 'Review prompt',
            contextModifier: {
              allowedTools: ['Read', 'Grep'],
              model: 'claude-haiku-4-5-20251001'
            }
          })
        })
      );

      const executor = new SkillExecutor(registry);
      const result = await executor.execute('review', '', createTestContext());

      expect(result.contextModifier?.allowedTools).toEqual(['Read', 'Grep']);
      expect(result.contextModifier?.model).toBe('claude-haiku-4-5-20251001');
    });

    it('skill hooks 应注入到 HookRegistry', async () => {
      const hookRegistry = new HookRegistry();
      const mockHandler = vi.fn().mockResolvedValue({ outcome: 'success' });

      const registry = new SkillRegistry();
      registry.register(
        createMockSkillDefinition({
          name: 'guarded-skill',
          hooks: [
            {
              event: 'PreToolUse',
              matcher: 'Bash',
              handler: mockHandler
            }
          ],
          getPromptForCommand: async () => ({
            content: 'Guarded skill prompt'
          })
        })
      );

      const executor = new SkillExecutor(registry);
      await executor.execute('guarded-skill', '', createTestContext({ hookRegistry }));

      // 验证 hook 已注册到 HookRegistry
      const hooks = hookRegistry.getMatchingHooks('PreToolUse', 'Bash');
      expect(hooks).toHaveLength(1);
      expect(hooks[0].name).toContain('guarded-skill');
    });

    it('contextModifier hooks 也应注入到 HookRegistry', async () => {
      const hookRegistry = new HookRegistry();
      const mockHandler = vi.fn().mockResolvedValue({ outcome: 'success' });

      const registry = new SkillRegistry();
      registry.register(
        createMockSkillDefinition({
          name: 'dynamic-skill',
          getPromptForCommand: async () => ({
            content: 'Dynamic skill prompt',
            contextModifier: {
              hooks: [
                {
                  event: 'PostToolUse',
                  matcher: 'Write',
                  handler: mockHandler
                }
              ]
            }
          })
        })
      );

      const executor = new SkillExecutor(registry);
      await executor.execute('dynamic-skill', '', createTestContext({ hookRegistry }));

      // 验证 modifier hook 已注册到 HookRegistry
      const hooks = hookRegistry.getMatchingHooks('PostToolUse', 'Write');
      expect(hooks).toHaveLength(1);
      expect(hooks[0].name).toContain('skill_modifier');
    });

    it('无 HookRegistry 时 hooks 注入应跳过', async () => {
      const mockHandler = vi.fn().mockResolvedValue({ outcome: 'success' });

      const registry = new SkillRegistry();
      registry.register(
        createMockSkillDefinition({
          name: 'skill-with-hooks',
          hooks: [
            {
              event: 'PreToolUse',
              matcher: 'Bash',
              handler: mockHandler
            }
          ],
          getPromptForCommand: async () => ({
            content: 'Skill prompt'
          })
        })
      );

      const executor = new SkillExecutor(registry);
      // context 无 hookRegistry
      const result = await executor.execute('skill-with-hooks', '', createTestContext());

      expect(result.content).toBe('Skill prompt');
      // mockHandler 不应被调用（只是注册到 hook，未执行）
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });
});
