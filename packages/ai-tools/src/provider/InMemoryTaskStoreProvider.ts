/** InMemoryTaskStoreProvider — 内存任务存储实现（测试+轻量宿主） */

import type {
  TaskEntry,
  TaskStatus,
  TaskStoreCreateInput,
  TaskStoreProvider,
  TaskUpdateFields,
  TaskUpdateResult
} from '../types/task-provider';

/** 生成唯一任务ID */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * InMemoryTaskStoreProvider — Map存储实现
 *
 * 适用于测试和轻量宿主。真实宿主应桥接ai-coordinator的TaskManager。
 */
export class InMemoryTaskStoreProvider implements TaskStoreProvider {
  private tasks = new Map<string, TaskEntry>();

  reset(): void {
    this.tasks.clear();
  }

  async createTask(input: TaskStoreCreateInput): Promise<TaskEntry> {
    const id = generateTaskId();
    const entry: TaskEntry = {
      id,
      subject: input.subject,
      description: input.description,
      status: 'pending' as TaskStatus,
      activeForm: input.activeForm,
      blockedBy: [],
      blocks: [],
      metadata: input.metadata
    };
    this.tasks.set(id, entry);
    return entry;
  }

  async getTask(taskId: string): Promise<TaskEntry | null> {
    const entry = this.tasks.get(taskId);
    if (!entry || entry.status === 'deleted') return null;
    return entry;
  }

  async listTasks(): Promise<TaskEntry[]> {
    return Array.from(this.tasks.values()).filter(t => t.status !== 'deleted');
  }

  async updateTask(taskId: string, updates: TaskUpdateFields): Promise<TaskUpdateResult> {
    const entry = this.tasks.get(taskId);
    if (!entry) {
      return { success: false, taskId, updatedFields: [], error: `Task "${taskId}" not found` };
    }

    const updatedFields: string[] = [];
    const oldStatus = entry.status;

    if (updates.subject !== undefined) {
      entry.subject = updates.subject;
      updatedFields.push('subject');
    }
    if (updates.description !== undefined) {
      entry.description = updates.description;
      updatedFields.push('description');
    }
    if (updates.activeForm !== undefined) {
      entry.activeForm = updates.activeForm;
      updatedFields.push('activeForm');
    }
    if (updates.owner !== undefined) {
      entry.owner = updates.owner;
      updatedFields.push('owner');
    }
    if (updates.status !== undefined) {
      entry.status = updates.status;
      updatedFields.push('status');
    }

    if (updates.addBlocks !== undefined) {
      entry.blocks = [...entry.blocks, ...updates.addBlocks];
      updatedFields.push('blocks');
    }
    if (updates.addBlockedBy !== undefined) {
      entry.blockedBy = [...entry.blockedBy, ...updates.addBlockedBy];
      updatedFields.push('blockedBy');
    }

    if (updates.metadata !== undefined) {
      entry.metadata = { ...(entry.metadata ?? {}), ...updates.metadata };
      // null值删除key
      for (const [key, value] of Object.entries(updates.metadata)) {
        if (value === null) {
          delete entry.metadata![key];
        }
      }
      updatedFields.push('metadata');
    }

    const result: TaskUpdateResult = {
      success: true,
      taskId,
      updatedFields
    };

    if (updates.status !== undefined && oldStatus !== updates.status) {
      result.statusChange = { from: oldStatus, to: updates.status };
    }

    return result;
  }

  async deleteTask(taskId: string): Promise<void> {
    this.tasks.delete(taskId);
  }
}
