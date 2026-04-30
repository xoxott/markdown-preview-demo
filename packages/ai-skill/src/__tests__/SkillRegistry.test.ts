/** SkillRegistry 测试 */

import { describe, expect, it } from 'vitest';
import { SkillRegistry } from '../registry/SkillRegistry';
import { createMockSkillDefinition } from './mocks/MockSkillRegistry';

describe('SkillRegistry', () => {
  describe('register', () => {
    it('应注册合法 Skill', () => {
      const registry = new SkillRegistry();
      const skill = createMockSkillDefinition({ name: 'commit' });
      registry.register(skill);
      expect(registry.get('commit')).toBe(skill);
    });

    it('应拒绝不合法的名称', () => {
      const registry = new SkillRegistry();
      const skill = createMockSkillDefinition({ name: '123invalid' });
      expect(() => registry.register(skill)).toThrow(/不合法/);
    });

    it('应拒绝重复名称', () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'commit' }));
      expect(() => registry.register(createMockSkillDefinition({ name: 'commit' }))).toThrow(
        /已存在/
      );
    });
  });

  describe('remove', () => {
    it('应移除已注册的 Skill', () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'debug' }));
      registry.remove('debug');
      expect(registry.get('debug')).toBeUndefined();
    });

    it('移除不存在的 Skill 应静默无操作', () => {
      const registry = new SkillRegistry();
      registry.remove('nonexistent');
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('get', () => {
    it('应返回已注册的 Skill', () => {
      const registry = new SkillRegistry();
      const skill = createMockSkillDefinition({ name: 'review' });
      registry.register(skill);
      expect(registry.get('review')).toBe(skill);
    });

    it('未注册的 Skill 应返回 undefined', () => {
      const registry = new SkillRegistry();
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('应返回所有已注册的 Skill', () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'commit' }));
      registry.register(createMockSkillDefinition({ name: 'debug' }));
      expect(registry.getAll()).toHaveLength(2);
    });

    it('空 registry 应返回空数组', () => {
      const registry = new SkillRegistry();
      expect(registry.getAll()).toHaveLength(0);
    });
  });

  describe('getEnabled', () => {
    it('应过滤 isEnabled=false 的 Skill', () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'enabled' }));
      registry.register(createMockSkillDefinition({ name: 'disabled', isEnabled: () => false }));
      const enabled = registry.getEnabled();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].name).toBe('enabled');
    });

    it('未定义 isEnabled 的 Skill 应视为启用', () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'default' }));
      expect(registry.getEnabled()).toHaveLength(1);
    });
  });

  describe('getUserInvocable', () => {
    it('应过滤 userInvocable=false 的 Skill', () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'user-skill' }));
      registry.register(
        createMockSkillDefinition({ name: 'internal-skill', userInvocable: false })
      );
      const invocable = registry.getUserInvocable();
      expect(invocable).toHaveLength(1);
      expect(invocable[0].name).toBe('user-skill');
    });

    it('也应过滤未启用的 Skill', () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'disabled', isEnabled: () => false }));
      expect(registry.getUserInvocable()).toHaveLength(0);
    });
  });

  describe('findByNameOrAlias', () => {
    it('应按名称查找', () => {
      const registry = new SkillRegistry();
      const skill = createMockSkillDefinition({ name: 'commit' });
      registry.register(skill);
      expect(registry.findByNameOrAlias('commit')).toBe(skill);
    });

    it('应按别名查找', () => {
      const registry = new SkillRegistry();
      const skill = createMockSkillDefinition({ name: 'review-pr', aliases: ['review'] });
      registry.register(skill);
      expect(registry.findByNameOrAlias('review')).toBe(skill);
    });

    it('名称优先于别名', () => {
      const registry = new SkillRegistry();
      const skill1 = createMockSkillDefinition({ name: 'review', aliases: ['inspect'] });
      const skill2 = createMockSkillDefinition({ name: 'review-pr', aliases: ['review'] });
      registry.register(skill1);
      registry.register(skill2);
      // 名称 "review" 匹配 skill1，不匹配 skill2 的别名
      expect(registry.findByNameOrAlias('review')).toBe(skill1);
    });

    it('未找到应返回 undefined', () => {
      const registry = new SkillRegistry();
      expect(registry.findByNameOrAlias('nonexistent')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('应清除所有 Skill', () => {
      const registry = new SkillRegistry();
      registry.register(createMockSkillDefinition({ name: 'a' }));
      registry.register(createMockSkillDefinition({ name: 'b' }));
      registry.clear();
      expect(registry.getAll()).toHaveLength(0);
    });
  });
});
