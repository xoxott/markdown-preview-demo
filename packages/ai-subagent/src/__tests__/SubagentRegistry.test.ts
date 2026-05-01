/** SubagentRegistry 测试 — 注册、查找、过滤、注销 */

import { describe, expect, it } from 'vitest';
import { SubagentRegistry } from '../registry/SubagentRegistry';
import type { SubagentDefinition } from '../types/subagent';

const makeDef = (
  agentType: string,
  overrides?: Partial<SubagentDefinition>
): SubagentDefinition => ({
  agentType,
  whenToUse: `使用 ${agentType} 处理任务`,
  ...overrides
});

describe('SubagentRegistry', () => {
  it('register + get — 注册并查找子代理定义', () => {
    const registry = new SubagentRegistry();
    const def = makeDef('researcher', { source: 'builtin', tools: ['search', 'read'] });

    registry.register(def);

    expect(registry.get('researcher')).toEqual(def);
    expect(registry.has('researcher')).toBe(true);
    expect(registry.size()).toBe(1);
  });

  it('register — 重复注册抛出错误', () => {
    const registry = new SubagentRegistry();
    registry.register(makeDef('coder'));

    expect(() => registry.register(makeDef('coder'))).toThrow('子代理 "coder" 已注册');
  });

  it('getBySource + filterByTools — 按来源和能力过滤', () => {
    const registry = new SubagentRegistry();
    registry.register(makeDef('researcher', { source: 'builtin', tools: ['search'] }));
    registry.register(makeDef('coder', { source: 'custom', tools: ['edit', 'write'] }));
    registry.register(makeDef('explorer', { source: 'builtin' })); // 无白名单

    expect(registry.getBySource('builtin')).toHaveLength(2);
    expect(registry.getBySource('custom')).toHaveLength(1);

    const withSearch = registry.filterByTools(['search']);
    expect(withSearch).toHaveLength(2); // researcher + explorer（无白名单=全部允许）

    const withEdit = registry.filterByTools(['edit']);
    expect(withEdit).toHaveLength(2); // coder + explorer
  });

  it('unregister — 注销后不可查找', () => {
    const registry = new SubagentRegistry();
    registry.register(makeDef('tester'));
    expect(registry.has('tester')).toBe(true);

    registry.unregister('tester');
    expect(registry.has('tester')).toBe(false);
    expect(registry.get('tester')).toBeUndefined();
    expect(registry.size()).toBe(0);
  });
});
