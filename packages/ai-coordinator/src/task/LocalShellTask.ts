/** LocalShellTask — Shell命令执行（通过SpawnProvider.callModel生成命令） */

import type { TaskDefinition } from '../types/task';
import type {
  TaskExecutionContext,
  TaskResult,
  TaskType,
  TaskTypeIdentifier
} from '../types/task-executor';

/** Shell任务类型 — 通过LLM生成shell命令描述，宿主执行 */
export class LocalShellTask implements TaskType {
  readonly identifier: TaskTypeIdentifier = 'local_shell';
  readonly description = 'Shell command execution via SpawnProvider.callModel';

  async execute(task: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult> {
    const startTime = Date.now();

    // 构造shell命令生成prompt
    const prompt = `Execute the following task by generating appropriate shell commands:\n\nTask: ${task.subject}\n${task.description ? `Details: ${task.description}\n` : ''}\nGenerate the exact shell command(s) needed. Output only the command, no explanation.`;

    try {
      const output = await context.spawnProvider.callModel(prompt, {
        abortSignal: context.abortSignal,
        maxTokens: 500
      });

      return {
        taskId: task.taskId,
        success: true,
        output,
        durationMs: Date.now() - startTime
      };
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
}
