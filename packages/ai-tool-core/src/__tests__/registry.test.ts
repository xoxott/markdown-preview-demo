/** ToolRegistry 测试 — 注册、查找、别名、拒绝规则和合并 */

import { z } from 'zod';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '../registry';
import { buildTool } from '../tool';

/** 辅助函数：创建简单工具 */
function createTool(name: string, aliases?: string[]) {
  return buildTool({
    name,
    aliases,
    inputSchema: z.object({}),
    call: async () => ({ data: name }),
    description: async () => name
  });
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('注册', () => {
    it('应该成功注册工具', () => {
      const tool = createTool('tool-a');
      registry.register(tool);
      expect(registry.getByName('tool-a')).toBe(tool);
    });

    it('应该在同名注册时抛出错误（不允许覆盖）', () => {
      const tool1 = createTool('tool-a');
      const tool2 = createTool('tool-a');
      registry.register(tool1);
      expect(() => registry.register(tool2)).toThrow('已注册');
    });

    it('应该允许同名覆盖注册（allowOverride=true）', () => {
      const tool1 = createTool('tool-a');
      const tool2 = createTool('tool-a');
      registry.register(tool1);
      registry.register(tool2, true);
      expect(registry.getByName('tool-a')).toBe(tool2);
    });

    it('应该注册别名', () => {
      const tool = createTool('read-file', ['rf', 'read']);
      registry.register(tool);
      expect(registry.getByAlias('rf')).toBe(tool);
      expect(registry.getByAlias('read')).toBe(tool);
    });

    it('别名冲突时应该抛出错误', () => {
      const tool1 = createTool('tool-a', ['shared']);
      const tool2 = createTool('tool-b', ['shared']);
      registry.register(tool1);
      expect(() => registry.register(tool2)).toThrow('不允许覆盖');
    });

    it('别名冲突时允许覆盖（allowOverride=true）', () => {
      const tool1 = createTool('tool-a', ['shared']);
      const tool2 = createTool('tool-b', ['shared']);
      registry.register(tool1);
      registry.register(tool2, true);
      expect(registry.getByAlias('shared')).toBe(tool2);
    });

    it('同一工具的别名覆盖自身不应报错', () => {
      const tool = createTool('tool-a', ['alias-a']);
      registry.register(tool);
      // 再次注册同一工具（允许覆盖）
      registry.register(tool, true);
      expect(registry.getByName('tool-a')).toBe(tool);
    });
  });

  describe('查找', () => {
    it('get 应通过主名称查找工具', () => {
      const tool = createTool('find-me');
      registry.register(tool);
      expect(registry.get('find-me')).toBe(tool);
    });

    it('get 应通过别名查找工具', () => {
      const tool = createTool('find-me', ['alias']);
      registry.register(tool);
      expect(registry.get('alias')).toBe(tool);
    });

    it('get 对不存在的名称应返回 undefined', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('getAll 应返回所有已注册工具', () => {
      registry.register(createTool('tool-a'));
      registry.register(createTool('tool-b'));
      registry.register(createTool('tool-c'));
      expect(registry.getAll()).toHaveLength(3);
      expect(registry.getAll().map(t => t.name)).toEqual(['tool-a', 'tool-b', 'tool-c']);
    });

    it('getByName 对不存在的名称应返回 undefined', () => {
      expect(registry.getByName('nonexistent')).toBeUndefined();
    });

    it('getByAlias 对不存在的别名应返回 undefined', () => {
      expect(registry.getByAlias('nonexistent')).toBeUndefined();
    });
  });

  describe('注销', () => {
    it('应该注销工具及其别名', () => {
      const tool = createTool('remove-me', ['rm']);
      registry.register(tool);
      expect(registry.get('remove-me')).toBe(tool);
      expect(registry.get('rm')).toBe(tool);

      registry.unregister('remove-me');
      expect(registry.get('remove-me')).toBeUndefined();
      expect(registry.get('rm')).toBeUndefined();
    });

    it('注销不存在工具应静默返回', () => {
      registry.unregister('nonexistent');
      // 不应抛出错误
    });
  });

  describe('拒绝规则', () => {
    it('应该根据通配符模式拒绝工具', () => {
      const testRegistry = new ToolRegistry({
        denyRules: [{ pattern: 'fs-*', reason: '禁止文件系统操作' }]
      });
      const fsTool = createTool('fs-read');
      const otherTool = createTool('calc');
      testRegistry.register(fsTool);
      testRegistry.register(otherTool);

      expect(testRegistry.isDenied('fs-read')).toBe(true);
      expect(testRegistry.isDenied('calc')).toBe(false);
      expect(testRegistry.filterByDenyRules()).toHaveLength(1);
      expect(testRegistry.filterByDenyRules()[0].name).toBe('calc');
    });

    it('通配符 * 应匹配所有名称', () => {
      const testRegistry = new ToolRegistry({
        denyRules: [{ pattern: '*', reason: '全部禁止' }]
      });
      testRegistry.register(createTool('any-tool'));
      expect(testRegistry.isDenied('any-tool')).toBe(true);
      expect(testRegistry.filterByDenyRules()).toHaveLength(0);
    });

    it('无拒绝规则时应允许所有工具', () => {
      const testRegistry = new ToolRegistry();
      testRegistry.register(createTool('allowed-tool'));
      expect(testRegistry.isDenied('allowed-tool')).toBe(false);
      expect(testRegistry.filterByDenyRules()).toHaveLength(1);
    });

    it('多条拒绝规则应按顺序检查', () => {
      const testRegistry = new ToolRegistry({
        denyRules: [
          { pattern: 'fs-*', reason: '禁止文件系统' },
          { pattern: 'db-*', reason: '禁止数据库' }
        ]
      });
      testRegistry.register(createTool('fs-read'));
      testRegistry.register(createTool('db-query'));
      testRegistry.register(createTool('http-get'));

      expect(testRegistry.isDenied('fs-read')).toBe(true);
      expect(testRegistry.isDenied('db-query')).toBe(true);
      expect(testRegistry.isDenied('http-get')).toBe(false);
    });
  });

  describe('合并', () => {
    it('应该合并另一个注册表', () => {
      const registry1 = new ToolRegistry();
      registry1.register(createTool('tool-a'));

      const registry2 = new ToolRegistry();
      registry2.register(createTool('tool-b'));

      registry1.merge(registry2);
      expect(registry1.getAll()).toHaveLength(2);
      expect(registry1.get('tool-a')).toBeDefined();
      expect(registry1.get('tool-b')).toBeDefined();
    });

    it('合并时冲突应按 allowOverride 规则处理', () => {
      const registry1 = new ToolRegistry();
      registry1.register(createTool('shared'));

      const registry2 = new ToolRegistry();
      registry2.register(createTool('shared'));

      // 不允许覆盖时应报错
      expect(() => registry1.merge(registry2)).toThrow('已注册');

      // 允许覆盖时应成功
      const registry3 = new ToolRegistry();
      registry3.register(createTool('shared'));
      registry1.merge(registry3, true);
      expect(registry1.get('shared')).toBeDefined();
    });

    it('合并时应合并拒绝规则', () => {
      const registry1 = new ToolRegistry({
        denyRules: [{ pattern: 'fs-*', reason: '禁止文件系统' }]
      });

      const registry2 = new ToolRegistry({
        denyRules: [{ pattern: 'db-*', reason: '禁止数据库' }]
      });
      registry2.register(createTool('db-query'));

      registry1.merge(registry2, true);
      expect(registry1.isDenied('fs-read')).toBe(true);
      expect(registry1.isDenied('db-query')).toBe(true);
    });
  });

  describe('构造函数选项', () => {
    it('应该接受初始工具列表', () => {
      const tools = [createTool('a'), createTool('b')];
      const testRegistry = new ToolRegistry({ tools });
      expect(testRegistry.getAll()).toHaveLength(2);
    });

    it('应该接受初始工具列表 + 拒绝规则', () => {
      const tools = [createTool('fs-read'), createTool('calc')];
      const testRegistry = new ToolRegistry({
        tools,
        denyRules: [{ pattern: 'fs-*', reason: '禁止' }]
      });
      expect(testRegistry.getAll()).toHaveLength(2);
      expect(testRegistry.filterByDenyRules()).toHaveLength(1);
    });

    it('应该接受 allowOverride 选项', () => {
      const tools = [createTool('a'), createTool('a')];
      const testRegistry = new ToolRegistry({ tools, allowOverride: true });
      expect(testRegistry.getAll()).toHaveLength(1);
    });
  });
});
