import { describe, it, expect } from 'vitest';
import { Team } from '../team/Team';

describe('Team', () => {
  it('addWorker 应根据 AgentDefinition 创建 Worker', () => {
    const team = new Team('t1', 'test-team', 'coordinator');
    const worker = team.addWorker({ agentType: 'researcher', whenToUse: '研究代码' }, 'alice');

    expect(worker.agentType).toBe('researcher');
    expect(worker.name).toBe('alice');
    expect(worker.status).toBe('idle');
    expect(team.getWorker('alice')).toBe(worker);
  });

  it('getIdleWorkers 应返回所有 idle Worker', () => {
    const team = new Team('t1', 'test-team', 'coordinator');
    team.addWorker({ agentType: 'researcher', whenToUse: '研究' }, 'alice');
    const bob = team.addWorker({ agentType: 'coder', whenToUse: '编码' }, 'bob');
    bob.status = 'running';

    const idleWorkers = team.getIdleWorkers();
    expect(idleWorkers.length).toBe(1);
    expect(idleWorkers[0].name).toBe('alice');
  });
});
