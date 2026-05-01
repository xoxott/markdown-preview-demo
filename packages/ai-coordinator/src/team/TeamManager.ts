/** TeamManager — Team 生命周期管理 + Worker spawn */

import type { Team as TeamType, Worker } from '../types/team';
import type { AgentDefinition } from '../types/agent';
import type { SpawnProvider } from '../types/task-executor';
import { DEFAULT_TEAM_NAME_PREFIX } from '../constants';
import { Team } from './Team';

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

  /**
   * spawnWorker — 在指定Team中创建Worker并spawn Agent
   *
   * @param teamId Team ID
   * @param agentDef AgentDefinition 模板
   * @param workerName Worker 名称（Team内唯一标识）
   * @param spawnProvider SpawnProvider（可选，有则真实spawn）
   * @returns Worker 实例 + spawn结果（如果有SpawnProvider）
   */
  async spawnWorker(
    teamId: string,
    agentDef: AgentDefinition,
    workerName: string,
    spawnProvider?: SpawnProvider
  ): Promise<{ worker: Worker; spawnResult?: import('../types/task-executor').AgentResult }> {
    const team = this.teams.get(teamId);
    if (!team) {
      throw new Error(`TeamManager: Team "${teamId}" 不存在`);
    }

    const worker = team.addWorker(agentDef, workerName);

    // 真实spawn（有SpawnProvider时）
    if (spawnProvider) {
      worker.status = 'running';
      worker.lastActiveAt = Date.now();

      const spawnResult = await spawnProvider.spawnAgent(
        agentDef,
        `初始化 ${workerName} (${agentDef.agentType})`,
        { maxTokens: agentDef.maxTurns ?? 100 }
      );

      worker.status = spawnResult.success ? 'idle' : 'failed';
      worker.lastActiveAt = Date.now();

      return { worker, spawnResult };
    }

    // 无SpawnProvider — 仅创建Worker记录
    return { worker };
  }

  /**
   * describeWorkers — 获取Team中所有Worker的状态描述
   *
   * @param teamId Team ID
   * @returns Worker描述列表
   */
  describeWorkers(
    teamId: string
  ): Array<{ workerId: string; agentType: string; name: string; status: string }> {
    const team = this.teams.get(teamId);
    if (!team) return [];

    return team.workers.map(w => ({
      workerId: w.workerId,
      agentType: w.agentType,
      name: w.name,
      status: w.status
    }));
  }
}
