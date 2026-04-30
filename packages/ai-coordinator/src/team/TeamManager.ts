/** TeamManager — Team 生命周期管理 */

import type { Team as TeamType } from '../types/team';
import { Team } from './Team';
import { DEFAULT_TEAM_NAME_PREFIX } from '../constants';

export class TeamManager {
  private readonly teams = new Map<string, Team>();

  /** 创建新 Team */
  create(name: string, coordinatorName: string): TeamType {
    const teamId = `${DEFAULT_TEAM_NAME_PREFIX}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const team = new Team(teamId, name, coordinatorName);
    this.teams.set(teamId, team);
    return team;
  }

  /** 查找 Team */
  getTeam(teamId: string): TeamType | undefined {
    return this.teams.get(teamId);
  }

  /** 销毁 Team */
  destroy(teamId: string): boolean {
    const team = this.teams.get(teamId);
    if (!team) return false;
    team.destroy();
    this.teams.delete(teamId);
    return true;
  }

  /** 列出所有 Team */
  listTeams(): readonly TeamType[] {
    return Array.from(this.teams.values());
  }
}