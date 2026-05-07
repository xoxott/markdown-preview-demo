/** Task 状态机类型 */

/** Task 状态 */
export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

/** N10: 是否为终态 */
export function isTerminalTaskStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

/** N10: 是否为后台任务状态 */
export type BackgroundTaskState = 'foreground' | 'background';

/** N10: Task 执行上下文 */
export interface TaskContext {
  readonly abortController?: AbortController;
  readonly getAppState?: <T>(key: string) => T | undefined;
  readonly setAppState?: <T>(key: string, value: T) => void;
}

/** N10: Task Handle — taskId + cleanup */
export interface TaskHandle {
  readonly taskId: string;
  readonly cleanup: () => void;
}

/** N43: StopTaskError — 标准化任务停止错误 */
export class StopTaskError extends Error {
  readonly taskId: string;
  readonly reason: string;

  constructor(taskId: string, reason: string) {
    super(`Task ${taskId} stopped: ${reason}`);
    this.name = 'StopTaskError';
    this.taskId = taskId;
    this.reason = reason;
  }
}

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
  /** N10: 是否已通知（状态变更已推送） */
  notified?: boolean;
  /** N10: 输出文件路径（后台任务） */
  outputFile?: string;
  /** N10: 输出文件读取偏移量（增量读取） */
  outputOffset?: number;
  /** N10: 结束时间 */
  endTime?: number;
  /** N10: 总暂停时间(ms) */
  totalPausedMs?: number;
  /** N10: 前台/后台标记 */
  backgroundState?: BackgroundTaskState;
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
