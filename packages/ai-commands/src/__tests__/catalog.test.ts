/** Catalog 测试 — 命令注册 + tier 管理 */

import { describe, expect, it } from 'vitest';
import { SkillRegistry } from '@suga/ai-skill';
import {
  COMMAND_CATALOG,
  getCatalogByCategory,
  getCatalogByTier,
  registerAllCommands,
  registerTierCommands
} from '../catalog';

describe('COMMAND_CATALOG — 数据结构', () => {
  it('包含 10 条目', () => {
    expect(COMMAND_CATALOG.length).toBe(10);
  });

  it('tier1 有 5 个命令', () => {
    const tier1 = getCatalogByTier('tier1');
    expect(tier1.length).toBe(5);
  });

  it('tier2 有 5 个命令', () => {
    const tier2 = getCatalogByTier('tier2');
    expect(tier2.length).toBe(5);
  });

  it('git category 有 2 个命令', () => {
    const gitCommands = getCatalogByCategory('git');
    expect(gitCommands.length).toBe(2);
    expect(gitCommands.map(e => e.name)).toContain('commit');
    expect(gitCommands.map(e => e.name)).toContain('diff');
  });
});

describe('registerTierCommands — 注册指定 tier', () => {
  it('tier1 注册 → 5 个 skill', () => {
    const registry = new SkillRegistry();
    registerTierCommands(registry, 'tier1');
    expect(registry.getAll().length).toBe(5);
  });

  it('commit 注册 → getByName 查到', () => {
    const registry = new SkillRegistry();
    registerTierCommands(registry, 'tier1');
    const skill = registry.get('commit');
    expect(skill).not.toBeUndefined();
    expect(skill!.name).toBe('commit');
  });
});

describe('registerAllCommands — 注册全部', () => {
  it('注册 → 所有命令可用（tier1 + tier2）', () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    expect(registry.getAll().length).toBe(10);

    // 验证所有命令可查找
    for (const name of ['commit', 'compact', 'memory', 'config', 'doctor']) {
      expect(registry.get(name)).not.toBeUndefined();
    }
  });

  it('别名也可查找', () => {
    const registry = new SkillRegistry();
    registerAllCommands(registry);
    expect(registry.findByNameOrAlias('ci')).not.toBeUndefined();
    expect(registry.findByNameOrAlias('compress')).not.toBeUndefined();
    expect(registry.findByNameOrAlias('mem')).not.toBeUndefined();
    expect(registry.findByNameOrAlias('cfg')).not.toBeUndefined();
    expect(registry.findByNameOrAlias('diag')).not.toBeUndefined();
  });
});
