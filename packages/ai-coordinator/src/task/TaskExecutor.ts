/** TaskExecutor — 真实任务执行器，根据TaskDefinition分派到TaskType */

import type { TaskDefinition } from '../types/task';
import type {
  BatchExecutionMode,
  SpawnProvider,
  TaskExecutionContext,
  TaskResult,
  TaskType
} from '../types/task-executor';
import type { Mailbox } from '../types/mailbox';
import type { CoordinatorRegistry } from '../registry/CoordinatorRegistry';
import { TaskTypeRegistry } from './TaskTypeRegistry';

/** Task执行器 — 根据TaskDefinition的metadata.taskType分派到具体TaskType执行 */
export class TaskExecutor {
  readonly typeRegistry: TaskTypeRegistry;

  constructor(
    readonly spawnProvider: SpawnProvider,
    readonly mailbox?: Mailbox,
    readonly agentRegistry?: CoordinatorRegistry
  ) {
    this.typeRegistry = new TaskTypeRegistry();
  }

  /** 构建执行上下文 */
  private buildContext(abortSignal?: AbortSignal): TaskExecutionContext {
    return {
      spawnProvider: this.spawnProvider,
      mailbox: this.mailbox,
      agentRegistry: this.agentRegistry,
      abortSignal,
      meta: {}
    };
  }

  /** 从TaskDefinition获取taskType（默认local_agent） */
  private getTaskType(task: TaskDefinition): TaskType {
    const identifier = (task.metadata?.taskType as string) ?? 'local_agent';
    const type = this.typeRegistry.get(identifier as any);
    if (!type) {
      throw new Error(`TaskExecutor: 未注册的任务类型 "${identifier}"`);
    }
    return type;
  }

  /** 执行单个Task */
  async execute(task: TaskDefinition, abortSignal?: AbortSignal): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      const taskType = this.getTaskType(task);
      const context = this.buildContext(abortSignal);
      const result = await taskType.execute(task, context);
      return result;
    } catch (err) {
      return {
        taskId: task.taskId,
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - startTime
      };
    }
  }

  /** 执行多个Task（并行或串行） */
  async executeBatch(
    tasks: TaskDefinition[],
    mode: BatchExecutionMode = 'parallel',
    abortSignal?: AbortSignal
  ): Promise<TaskResult[]> {
    if (mode === 'parallel') {
      const promises = tasks.map(t => this.execute(t, abortSignal));
      return Promise.all(promises);
    }

    // 串行执行
    const results: TaskResult[] = [];
    for (const task of tasks) {
      const result = await this.execute(task, abortSignal);
      results.push(result);
      // 如果失败且未指定继续，中止后续任务
      if (!result.success && abortSignal?.aborted) {
        break;
      }
    }
    return results;
  }
}
