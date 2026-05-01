import { describe, expect, it } from 'vitest';
import { TeamManager } from '../team/TeamManager';

describe('TeamManager', () => {
  it('create 应创建新 Team', () => {
    const tm = new TeamManager();
    const team = tm.create('project-alpha', 'coordinator');
    expect(team.name).toBe('project-alpha');
    expect(team.coordinatorName).toBe('coordinator');
    expect(team.status).toBe('active');
    expect(tm.getTeam(team.teamId)).toBeDefined();
  });

  it('destroy 应销毁 Team', () => {
    const tm = new TeamManager();
    const team = tm.create('project-beta', 'coordinator');
    expect(tm.destroy(team.teamId)).toBe(true);
    expect(tm.getTeam(team.teamId)).toBeUndefined();
    expect(tm.destroy('nonexistent')).toBe(false);
  });
});
