/** Mock SkillRegistry — 用于测试 */

import type { SkillDefinition } from '../../types/skill';
import { SkillRegistry } from '../../registry/SkillRegistry';

/**
 * 创建一个 Mock SkillRegistry
 *
 * 使用简单的 Map 替代 SkillRegistry，便于测试时精确控制注册内容
 */
export function createMockSkillRegistry(skills: SkillDefinition[] = []): SkillRegistry {
  const registry = new SkillRegistry();
  for (const skill of skills) {
    registry.register(skill);
  }
  return registry;
}

/** 创建一个简单的 SkillDefinition 用于测试 */
export function createMockSkillDefinition(
  overrides: Partial<SkillDefinition> = {}
): SkillDefinition {
  return {
    name: overrides.name ?? 'test-skill',
    description: overrides.description ?? 'Test skill description',
    aliases: overrides.aliases ?? [],
    argumentHint: overrides.argumentHint ?? '<args>',
    getPromptForCommand:
      overrides.getPromptForCommand ??
      (async args => ({
        content: `Test skill prompt for: ${args}`
      })),
    ...overrides
  };
}
