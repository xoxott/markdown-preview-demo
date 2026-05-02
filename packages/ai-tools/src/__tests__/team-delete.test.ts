/** @suga/ai-tools — TeamDeleteTool测试 */

import { describe, expect, it } from 'vitest';
import { teamDeleteTool } from '../tools/team-delete';
import { InMemoryTeamProvider } from '../provider/InMemoryTeamProvider';

describe('TeamDeleteTool', () => {
  const teamProvider = new InMemoryTeamProvider();

  it('name → team-delete', () => {
    expect(teamDeleteTool.name).toBe('team-delete');
  });

  it('isReadOnly → false', () => {
    expect(teamDeleteTool.isReadOnly!({})).toBe(false);
  });

  it('safetyLabel → destructive', () => {
    expect(teamDeleteTool.safetyLabel!({})).toBe('destructive');
  });

  it('isDestructive → true', () => {
    expect(teamDeleteTool.isDestructive!({})).toBe(true);
  });

  it('call → 删除存在的team', async () => {
    teamProvider.reset();
    await teamProvider.createTeam('test-team');
    const result = await teamDeleteTool.call({}, { teamProvider } as any);
    expect(result.data.success).toBe(true);
    expect(result.data.teamName).toBe('test-team');
  });

  it('call → 无team时返回失败', async () => {
    teamProvider.reset();
    const result = await teamDeleteTool.call({}, { teamProvider } as any);
    expect(result.data.success).toBe(false);
  });

  it('call → 有活跃成员时拒绝删除', async () => {
    teamProvider.reset();
    await teamProvider.createTeam('test-team');
    // 手动添加成员
    const info = await teamProvider.getTeamInfo();
    if (info) {
      info.members.push({ name: 'worker1', agentId: 'w1', agentType: 'general-purpose' });
    }
    const result = await teamDeleteTool.call({}, { teamProvider } as any);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('active members');
  });

  it('call → 无Provider返回失败', async () => {
    const result = await teamDeleteTool.call({}, {} as any);
    expect(result.data.success).toBe(false);
    expect(result.data.message).toContain('No TeamProvider');
  });

  it('inputSchema → 正确定义', () => {
    expect(teamDeleteTool.inputSchema).toBeDefined();
  });
});
