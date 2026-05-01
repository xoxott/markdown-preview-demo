/** AgentTool 测试 — 创建、查找、执行、错误处理 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { createAgentTool } from '../tool/AgentTool';
import { SubagentRegistry } from '../registry/SubagentRegistry';
import type { SubagentDefinition } from '../types/subagent';
import { MockSubagentSpawner } from './mocks/MockSubagentSpawner';

const makeDef = (
  agentType: string,
  overrides?: Partial<SubagentDefinition>
): SubagentDefinition => ({
  agentType,
  whenToUse: `使用 ${agentType} 处理任务`,
  ...overrides
});

const makeContext = () => ({
  abortController: new AbortController(),
  tools: new ToolRegistry(),
  sessionId: 'test-session'
});

describe('AgentTool', () => {
  let registry: SubagentRegistry;
  let spawner: MockSubagentSpawner;
  let agentTool: ReturnType<typeof createAgentTool>;

  beforeEach(() => {
    registry = new SubagentRegistry();
    spawner = new MockSubagentSpawner();
    agentTool = createAgentTool(registry, spawner);
  });

  it('创建 — AgentTool 注册名和基本属性', () => {
    expect(agentTool.name).toBe('subagent');
    expect(agentTool.isConcurrencySafe({ subagent_type: 'test', task: 'test' })).toBe(false);
    expect(agentTool.isReadOnly({ subagent_type: 'test', task: 'test' })).toBe(false);
    expect(agentTool.safetyLabel({ subagent_type: 'test', task: 'test' })).toBe('system');
  });

  it('call — 未注册的子代理类型返回错误', async () => {
    const result = await agentTool.call(
      { subagent_type: 'nonexistent', task: '测试任务' },
      makeContext()
    );

    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('未注册');
    expect(result.error).toContain('未注册');
  });

  it('call — 成功执行子代理任务', async () => {
    const def = makeDef('researcher', { source: 'builtin' });
    registry.register(def);

    const result = await agentTool.call(
      { subagent_type: 'researcher', task: '搜索资料' },
      makeContext()
    );

    expect(result.data.success).toBe(true);
    expect(result.data.subagentType).toBe('researcher');
    expect(result.data.task).toBe('搜索资料');
    expect(result.data.summary).toContain('researcher');
    expect(spawner.getSpawnCount()).toBe(1);
  });

  it('call — context 参数传递到 spawn', async () => {
    const def = makeDef('coder');
    registry.register(def);

    const result = await agentTool.call(
      { subagent_type: 'coder', task: '写代码', context: '使用 TypeScript' },
      makeContext()
    );

    expect(result.data.success).toBe(true);
    const history = spawner.getSpawnHistory();
    expect(history[0].context).toBe('使用 TypeScript');
  });

  it('call — spawn 失败时返回错误结果', async () => {
    const def = makeDef('fail-agent');
    registry.register(def);
    spawner.setShouldFail(true);

    const result = await agentTool.call(
      { subagent_type: 'fail-agent', task: '失败任务' },
      makeContext()
    );

    expect(result.data.success).toBe(false);
    expect(result.data.error).toContain('执行失败');
    expect(result.error).toContain('执行失败');
  });

  it('description — 返回已注册子代理的 whenToUse', async () => {
    const def = makeDef('explorer', { whenToUse: '用于探索代码库结构' });
    registry.register(def);

    const desc = await agentTool.description({ subagent_type: 'explorer', task: 'test' });
    expect(desc).toBe('用于探索代码库结构');
  });

  it('description — 未注册子代理返回错误描述', async () => {
    const desc = await agentTool.description({ subagent_type: 'missing', task: 'test' });
    expect(desc).toContain('未找到');
  });
});
