/** @suga/ai-tools — TeamCreateTool测试 */

import { describe, expect, it } from 'vitest';
import { teamCreateTool } from '../tools/team-create';
import { InMemoryTeamProvider } from '../provider/InMemoryTeamProvider';

describe('TeamCreateTool', () => {
  const teamProvider = new InMemoryTeamProvider();

  it('name → team-create', () => {
    expect(teamCreateTool.name).toBe('team-create');
  });

  it('isReadOnly → false', () => {
    const input = { team_name: 'my-team' };
    expect(teamCreateTool.isReadOnly!(input)).toBe(false);
  });

  it('safetyLabel → destructive', () => {
    const input = { team_name: 'my-team' };
    expect(teamCreateTool.safetyLabel!(input)).toBe('destructive');
  });

  it('isConcurrencySafe → false', () => {
    const input = { team_name: 'my-team' };
    expect(teamCreateTool.isConcurrencySafe!(input)).toBe(false);
  });

  it('call → 创建team', async () => {
    teamProvider.reset();
    const result = await teamCreateTool.call(
      { team_name: 'my-project', description: 'Working on feature X' },
      { teamProvider } as any
    );
    expect(result.data.teamName).toBe('my-project');
    expect(result.data.leadAgentId).toBeTruthy();
    expect(result.data.teamFilePath).toContain('my-project');
  });

  it('call → 无Provider返回空', async () => {
    const result = await teamCreateTool.call({ team_name: 'test' }, {} as any);
    expect(result.data.teamName).toBe('');
  });

  it('inputSchema → 正确定义', () => {
    expect(teamCreateTool.inputSchema).toBeDefined();
  });
});
