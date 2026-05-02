/** TaskStoreProvider — 任务存储宿主注入接口 */

/** 任务条目 */
export interface TaskEntry {
  id: string;
  subject: string;
  description: string;
  status: TaskStatus;
  activeForm?: string;
  owner?: string;
  blockedBy: string[];
  blocks: string[];
  metadata?: Record<string, unknown>;
}

/** 任务状态 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted';

/** 任务更新字段 */
export interface TaskUpdateFields {
  subject?: string;
  description?: string;
  activeForm?: string;
  status?: TaskStatus;
  owner?: string;
  addBlocks?: string[];
  addBlockedBy?: string[];
  /** metadata合并——设null删除key */
  metadata?: Record<string, unknown>;
}

/** 任务更新结果 */
export interface TaskUpdateResult {
  success: boolean;
  taskId: string;
  updatedFields: string[];
  error?: string;
  statusChange?: { from: string; to: string };
}

/** 创建任务输入（Provider接口参数） */
export interface TaskStoreCreateInput {
  subject: string;
  description: string;
  activeForm?: string;
  metadata?: Record<string, unknown>;
}

/**
 * TaskStoreProvider — 任务CRUD宿主注入
 *
 * 工具通过此接口操作任务状态，宿主注入具体实现。 ai-coordinator的TaskManager可作为真实宿主后端。
 */
export interface TaskStoreProvider {
  /** 创建任务，返回完整条目 */
  createTask(input: TaskStoreCreateInput): Promise<TaskEntry>;
  /** 查询任务，null表示不存在 */
  getTask(taskId: string): Promise<TaskEntry | null>;
  /** 列出所有未删除任务 */
  listTasks(): Promise<TaskEntry[]>;
  /** 更新任务字段，返回更新结果 */
  updateTask(taskId: string, updates: TaskUpdateFields): Promise<TaskUpdateResult>;
  /** 删除任务 */
  deleteTask(taskId: string): Promise<void>;
}
