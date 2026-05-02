/** InMemoryTeamProvider — 内存Team管理实现（测试+轻量宿主） */

import type { TeamDeleteResult, TeamInfo, TeamProvider, TeamResult } from '../types/team-provider';

function generateAgentId(teamName: string): string {
  return `lead_${teamName}_${Date.now()}`;
}

export class InMemoryTeamProvider implements TeamProvider {
  private currentTeam: TeamInfo | null = null;

  reset(): void {
    this.currentTeam = null;
  }

  async createTeam(teamName: string, _description?: string): Promise<TeamResult> {
    const leadAgentId = generateAgentId(teamName);
    this.currentTeam = {
      teamName,
      members: [{ name: 'lead', agentId: leadAgentId, agentType: 'team-lead' }],
      leadAgentId
    };
    return {
      teamName,
      teamFilePath: `~/.claude/teams/${teamName}/config.json`,
      leadAgentId
    };
  }

  async deleteTeam(): Promise<TeamDeleteResult> {
    if (!this.currentTeam) {
      return { success: false, message: 'No active team' };
    }
    // 拒绝删除有活跃非lead成员的team
    if (this.currentTeam.members.length > 1) {
      return {
        success: false,
        message: 'Team has active members, cannot delete',
        teamName: this.currentTeam.teamName
      };
    }
    const name = this.currentTeam.teamName;
    this.currentTeam = null;
    return { success: true, message: 'Team deleted', teamName: name };
  }

  async getTeamInfo(): Promise<TeamInfo | null> {
    return this.currentTeam;
  }
}
