/** Team — Worker 分组与发现 */

import type { AgentDefinition } from '../types/agent';
import type { Worker } from '../types/team';
import type { TeamStatus } from '../types/team';
import { DEFAULT_WORKER_ID_PREFIX } from '../constants';

export class Team {
  readonly teamId: string;
  readonly name: string;
  readonly coordinatorName: string;
  readonly createdAt: number;
  status: TeamStatus = 'active';

  private readonly workersMap = new Map<string, Worker>();

  constructor(teamId: string, name: string, coordinatorName: string) {
    this.teamId = teamId;
    this.name = name;
    this.coordinatorName = coordinatorName;
    this.createdAt = Date.now();
  }

  /** 添加 Worker */
  addWorker(agentDef: AgentDefinition, name: string): Worker {
    const workerId = `${DEFAULT_WORKER_ID_PREFIX}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const worker: Worker = {
      workerId,
      agentType: agentDef.agentType,
      teamId: this.teamId,
      name,
      status: 'idle',
      createdAt: Date.now(),
      lastActiveAt: Date.now()
    };
    this.workersMap.set(name, worker);
    return worker;
  }

  /** 移除 Worker */
  removeWorker(name: string): boolean {
    return this.workersMap.delete(name);
  }

  /** 按名称查找 Worker */
  getWorker(name: string): Worker | undefined {
    return this.workersMap.get(name);
  }

  /** 按类型查找所有 Worker */
  getWorkersByAgentType(agentType: string): Worker[] {
    return Array.from(this.workersMap.values()).filter(w => w.agentType === agentType);
  }

  /** 获取所有空闲 Worker */
  getIdleWorkers(): Worker[] {
    return Array.from(this.workersMap.values()).filter(w => w.status === 'idle');
  }

  /** 获取 Worker 列表 */
  get workers(): readonly Worker[] {
    return Array.from(this.workersMap.values());
  }

  /** 销毁 Team */
  destroy(): void {
    this.status = 'destroyed';
    this.workersMap.clear();
  }
}