/** Task 状态机类型 */

/** Task 状态 */
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

/** Task 定义 */
export interface TaskDefinition {
  /** Task 唯一 ID */
  readonly taskId: string;
  /** Task 主题 (简短描述) */
  subject: string;
  /** Task 详细描述 */
  description?: string;
  /** 当前状态 */
  status: TaskStatus;
  /** 负责 Worker 名称 */
  owner?: string;
  /** 依赖的 Task ID 列表 */
  blockedBy?: string[];
  /** 阻塞其他 Task ID 列表 */
  blocks?: string[];
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 创建时间 */
  readonly createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/** Task 更新操作 */
export interface TaskUpdateOp {
  readonly taskId: string;
  readonly subject?: string;
  readonly description?: string;
  readonly status?: TaskStatus;
  readonly owner?: string;
  readonly addBlockedBy?: readonly string[];
  readonly addBlocks?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}
