/** LocalWorkflowTask — 多步工作流（串行执行子任务链） */

import type { TaskDefinition } from '../types/task';
import type {
  TaskExecutionContext,
  TaskResult,
  TaskType,
  TaskTypeIdentifier
} from '../types/task-executor';
import type { TaskExecutor } from './TaskExecutor';

/** 工作流任务类型 — 串行执行多个子任务 */
export class LocalWorkflowTask implements TaskType {
  readonly identifier: TaskTypeIdentifier = 'local_workflow';
  readonly description = 'Multi-step workflow execution (sequential sub-task chain)';

  async execute(task: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult> {
    const startTime = Date.now();

    // 从metadata获取子任务步骤
    const steps =
      (task.metadata?.steps as Array<{
        subject: string;
        taskType?: string;
        description?: string;
      }>) ?? [];

    if (steps.length === 0) {
      return {
        taskId: task.taskId,
        success: false,
        output: '',
        error: 'LocalWorkflowTask: no steps defined in metadata.steps',
        durationMs: Date.now() - startTime
      };
    }

    // 使用TaskExecutor串行执行每一步
    // 注意：这里需要TaskExecutor实例，从context.meta获取
    const executor = context.meta.executor as TaskExecutor | undefined;
    if (!executor) {
      return {
        taskId: task.taskId,
        success: false,
        output: '',
        error: 'LocalWorkflowTask: no TaskExecutor in context.meta.executor',
        durationMs: Date.now() - startTime
      };
    }

    // 创建子任务并串行执行
    const subResults: TaskResult[] = [];
    for (const step of steps) {
      const subTask: TaskDefinition = {
        taskId: `${task.taskId}_step_${subResults.length}`,
        subject: step.subject,
        description: step.description,
        status: 'pending',
        metadata: { taskType: step.taskType ?? 'local_agent' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const result = await executor.execute(subTask, context.abortSignal);
      subResults.push(result);

      // 如果某步失败，中止后续步骤
      if (!result.success) {
        break;
      }
    }

    // 组合所有子任务结果
    const output = subResults
      .map(r => `[Step ${r.taskId}]: ${r.success ? r.output : `FAILED: ${r.error}`}`)
      .join('\n');

    const allSuccess = subResults.every(r => r.success);

    return {
      taskId: task.taskId,
      success: allSuccess,
      output,
      error: allSuccess ? undefined : 'One or more workflow steps failed',
      durationMs: Date.now() - startTime
    };
  }
}
