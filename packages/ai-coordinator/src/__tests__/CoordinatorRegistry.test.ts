import { describe, it, expect } from 'vitest';
import { CoordinatorRegistry } from '../registry/CoordinatorRegistry';

describe('CoordinatorRegistry', () => {
  it('应注册合法 AgentDefinition 并按 agentType 查找', () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和阅读代码' });
    registry.register({ agentType: 'coder', whenToUse: '编写和修改代码' });

    expect(registry.get('researcher')?.agentType).toBe('researcher');
    expect(registry.get('coder')?.agentType).toBe('coder');
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('应拒绝不合法的 agentType 和重复注册', () => {
    const registry = new CoordinatorRegistry();
    // 不合法名称
    expect(() => registry.register({ agentType: 'BadName', whenToUse: 'test' })).toThrow();
    expect(() => registry.register({ agentType: '123start', whenToUse: 'test' })).toThrow();
    // 重复注册
    registry.register({ agentType: 'coder', whenToUse: '写代码' });
    expect(() => registry.register({ agentType: 'coder', whenToUse: '另一个coder' })).toThrow();
  });

  it('findByWhenToUse 应按关键词匹配', () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和阅读代码，理解项目结构' });
    registry.register({ agentType: 'coder', whenToUse: '编写和修改代码文件' });

    const results = registry.findByWhenToUse('代码');
    expect(results.length).toBe(2);

    const readResults = registry.findByWhenToUse('阅读');
    expect(readResults.length).toBe(1);
    expect(readResults[0].agentType).toBe('researcher');
  });
});