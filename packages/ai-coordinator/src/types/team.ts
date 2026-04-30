/** Team/Worker 类型 */

import type { WorkerStatus } from './agent';

/** Worker 实例 — 一个已激活的 AgentDefinition 运行实体 */
export interface Worker {
  /** Worker 唯一 ID */
  readonly workerId: string;
  /** 对应的 AgentDefinition agentType */
  readonly agentType: string;
  /** 所属 Team ID */
  readonly teamId: string;
  /** Worker 名称 (在 Team 内的可读标识) */
  readonly name: string;
  /** 当前状态 */
  status: WorkerStatus;
  /** 创建时间 */
  readonly createdAt: number;
  /** 最后活跃时间 */
  lastActiveAt: number;
}

/** Team 状态 */
export type TeamStatus = 'active' | 'discovering' | 'destroyed';

/** Team — Worker 分组与发现 */
export interface Team {
  /** Team 唯一 ID */
  readonly teamId: string;
  /** Team 名称 */
  readonly name: string;
  /** Coordinator 名称 (创建者) */
  readonly coordinatorName: string;
  /** 创建时间 */
  readonly createdAt: number;
  /** Team 内的 Worker 列表 */
  readonly workers: readonly Worker[];
  /** Team 状态 */
  status: TeamStatus;
}
