/** TeamManager spawn/describe 测试 */

import { describe, expect, it } from 'vitest';
import { TeamManager } from '../team/TeamManager';
import type { AgentDefinition } from '../types/agent';
import { MockSpawnProvider } from './mocks/MockSpawnProvider';

describe('TeamManager — spawnWorker', () => {
  it('spawnWorker(无SpawnProvider) → 仅创建Worker记录', async () => {
    const tm = new TeamManager();
    const team = tm.create('project-alpha', 'coordinator');
    const agentDef: AgentDefinition = { agentType: 'researcher', whenToUse: '搜索和研究' };

    const result = await tm.spawnWorker(team.teamId, agentDef, 'alice');

    expect(result.worker).toBeDefined();
    expect(result.worker.agentType).toBe('researcher');
    expect(result.worker.name).toBe('alice');
    expect(result.worker.status).toBe('idle');
    expect(result.spawnResult).toBeUndefined();
  });

  it('spawnWorker(有SpawnProvider) → 真实spawn Agent', async () => {
    const tm = new TeamManager();
    const team = tm.create('project-beta', 'coordinator');
    const spawnProvider = new MockSpawnProvider();
    const agentDef: AgentDefinition = { agentType: 'coder', whenToUse: '编写代码' };

    const result = await tm.spawnWorker(team.teamId, agentDef, 'bob', spawnProvider);

    expect(result.worker).toBeDefined();
    expect(result.worker.agentType).toBe('coder');
    expect(result.worker.name).toBe('bob');
    expect(result.worker.status).toBe('idle');
    expect(result.spawnResult).toBeDefined();
    expect(result.spawnResult!.success).toBe(true);
    expect(spawnProvider.getSpawnHistory().length).toBe(1);
  });

  it('spawnWorker失败 → Worker状态标记failed', async () => {
    const tm = new TeamManager();
    const team = tm.create('project-gamma', 'coordinator');
    const spawnProvider = new MockSpawnProvider();
    spawnProvider.setAgentResult({
      output: '',
      toolCalls: 0,
      tokensUsed: { input: 0, output: 0 },
      success: false,
      error: 'Connection refused'
    });
    const agentDef: AgentDefinition = { agentType: 'tester', whenToUse: '测试' };

    const result = await tm.spawnWorker(team.teamId, agentDef, 'carol', spawnProvider);

    expect(result.worker.status).toBe('failed');
    expect(result.spawnResult!.success).toBe(false);
  });

  it('spawnWorker → Team不存在 → 抛出错误', async () => {
    const tm = new TeamManager();
    const agentDef: AgentDefinition = { agentType: 'researcher', whenToUse: '研究' };

    await expect(tm.spawnWorker('nonexistent_team', agentDef, 'dave')).rejects.toThrow('不存在');
  });
});

describe('TeamManager — describeWorkers', () => {
  it('describeWorkers → 返回Worker描述列表', async () => {
    const tm = new TeamManager();
    const team = tm.create('project-delta', 'coordinator');

    const agentDef1: AgentDefinition = { agentType: 'researcher', whenToUse: '研究' };
    const agentDef2: AgentDefinition = { agentType: 'coder', whenToUse: '编码' };

    await tm.spawnWorker(team.teamId, agentDef1, 'eve');
    await tm.spawnWorker(team.teamId, agentDef2, 'frank');

    const descriptions = tm.describeWorkers(team.teamId);

    expect(descriptions.length).toBe(2);
    expect(descriptions.find(d => d.name === 'eve')).toBeDefined();
    expect(descriptions.find(d => d.name === 'eve')!.agentType).toBe('researcher');
    expect(descriptions.find(d => d.name === 'frank')!.agentType).toBe('coder');
  });

  it('describeWorkers → Team不存在 → 返回空列表', () => {
    const tm = new TeamManager();
    const descriptions = tm.describeWorkers('nonexistent_team');
    expect(descriptions).toEqual([]);
  });
});
