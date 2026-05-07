/** P96 测试 — Agent buildTool + InMemorySubagentProvider */

import { describe, expect, it } from 'vitest';
import { InMemorySubagentProvider } from '../provider/InMemorySubagentProvider';
import { agentTool } from '../tools/agent';
import type { ExtendedToolUseContext } from '../context-merge';

/** 创建基础上下文 */
function createContext(providers: Partial<ExtendedToolUseContext> = {}): ExtendedToolUseContext {
  return {
    fsProvider: {} as any,
    ...providers
  } as ExtendedToolUseContext;
}

/** 创建 mock SubagentDefinition */
function createMockDef(agentType: string) {
  return {
    agentType,
    description: `Mock ${agentType} agent`,
    whenToUse: `Use for ${agentType} tasks`,
    source: 'builtin' as const,
    permissionMode: 'bubble' as const,
    background: 'foreground' as const
  };
}

// ============================================================
// InMemorySubagentProvider 测试
// ============================================================

describe('InMemorySubagentProvider', () => {
  it('register + getDefinition — 注册并查找定义', () => {
    const provider = new InMemorySubagentProvider();
    const def = createMockDef('explore');
    provider.register(def);

    expect(provider.getDefinition('explore')).toBe(def);
    expect(provider.size).toBe(1);
  });

  it('getDefinition — 不存在的类型', () => {
    const provider = new InMemorySubagentProvider();
    expect(provider.getDefinition('unknown')).toBeUndefined();
  });

  it('listDefinitions — 列出所有定义', () => {
    const provider = new InMemorySubagentProvider();
    provider.register(createMockDef('explore'));
    provider.register(createMockDef('plan'));

    const defs = provider.listDefinitions();
    expect(defs).toHaveLength(2);
    expect(defs.map(d => d.agentType)).toContain('explore');
    expect(defs.map(d => d.agentType)).toContain('plan');
  });

  it('unregister — 注销定义', () => {
    const provider = new InMemorySubagentProvider();
    provider.register(createMockDef('explore'));
    provider.unregister('explore');

    expect(provider.getDefinition('explore')).toBeUndefined();
    expect(provider.size).toBe(0);
  });

  it('spawn — 记录调用并返回 mock 结果', async () => {
    const provider = new InMemorySubagentProvider();
    const def = createMockDef('explore');
    provider.register(def);

    const result = await provider.spawn(def, 'find all .ts files', 'in src/');

    expect(result.subagentType).toBe('explore');
    expect(result.task).toBe('find all .ts files');
    expect(result.success).toBe(true);
    expect(result.summary).toContain('Mock');
  });

  it('spawnCalls — 记录所有 spawn 调用', async () => {
    const provider = new InMemorySubagentProvider();
    const def1 = createMockDef('explore');
    const def2 = createMockDef('plan');
    provider.register(def1);
    provider.register(def2);

    await provider.spawn(def1, 'task1');
    await provider.spawn(def2, 'task2', 'ctx directive');

    expect(provider.spawnCalls).toHaveLength(2);
    expect(provider.spawnCalls[0].agentType).toBe('explore');
    expect(provider.spawnCalls[0].task).toBe('task1');
    expect(provider.spawnCalls[1].contextDirective).toBe('ctx directive');
  });

  it('reset — 清空定义和调用记录', async () => {
    const provider = new InMemorySubagentProvider();
    provider.register(createMockDef('explore'));
    await provider.spawn(provider.getDefinition('explore')!, 'task');

    provider.reset();
    expect(provider.size).toBe(0);
    expect(provider.spawnCalls).toHaveLength(0);
  });
});

// ============================================================
// AgentTool 测试
// ============================================================

describe('AgentTool', () => {
  it('spawn 成功 — 通过 Provider 执行子代理', async () => {
    const provider = new InMemorySubagentProvider();
    provider.register(createMockDef('explore'));
    const context = createContext({ subagentProvider: provider });

    const result = await agentTool.call(
      { subagent_type: 'explore', task: 'find files', context: undefined },
      context
    );

    expect(result.data.subagentType).toBe('explore');
    expect(result.data.success).toBe(true);
  });

  it('spawn 带 context 指令', async () => {
    const provider = new InMemorySubagentProvider();
    provider.register(createMockDef('plan'));
    const context = createContext({ subagentProvider: provider });

    const result = await agentTool.call(
      { subagent_type: 'plan', task: 'design api', context: 'focus on security' },
      context
    );

    expect(result.data.success).toBe(true);
    expect(provider.spawnCalls[0].contextDirective).toBe('focus on security');
  });

  it('未注册的子代理类型 → error', async () => {
    const provider = new InMemorySubagentProvider();
    const context = createContext({ subagentProvider: provider });

    const result = await agentTool.call(
      { subagent_type: 'unknown', task: 'test', context: undefined },
      context
    );

    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('未注册的子代理类型');
  });

  it('无 Provider → fallback error', async () => {
    const context = createContext();

    const result = await agentTool.call(
      { subagent_type: 'explore', task: 'find files', context: undefined },
      context
    );

    expect(result.data.success).toBe(false);
    expect(result.data.error).toBe('No SubagentProvider');
  });

  it('validateInput — 空 subagent_type → deny', () => {
    const ctx = createContext();
    const result = agentTool.validateInput(
      { subagent_type: '', task: 'test', context: undefined },
      ctx as any
    );
    expect(result.behavior).toBe('deny');
  });

  it('validateInput — 空 task → deny', () => {
    const ctx = createContext();
    const result = agentTool.validateInput(
      { subagent_type: 'explore', task: '', context: undefined },
      ctx as any
    );
    expect(result.behavior).toBe('deny');
  });

  it('validateInput — 正常输入 → allow', () => {
    const ctx = createContext();
    const result = agentTool.validateInput(
      { subagent_type: 'explore', task: 'find files', context: undefined },
      ctx as any
    );
    expect(result.behavior).toBe('allow');
  });

  it('safetyLabel = system', () => {
    expect(
      agentTool.safetyLabel({ subagent_type: 'explore', task: 'test', context: undefined })
    ).toBe('system');
  });

  it('isReadOnly = false', () => {
    expect(
      agentTool.isReadOnly({ subagent_type: 'explore', task: 'test', context: undefined })
    ).toBe(false);
  });

  it('isConcurrencySafe = false', () => {
    expect(
      agentTool.isConcurrencySafe({ subagent_type: 'explore', task: 'test', context: undefined })
    ).toBe(false);
  });

  it('name = subagent', () => {
    expect(agentTool.name).toBe('subagent');
  });
});
