/** DreamTask — 梦境整合任务（后台LLM调用整合记忆） */

import type { TaskDefinition } from '../types/task';
import type {
  TaskExecutionContext,
  TaskResult,
  TaskType,
  TaskTypeIdentifier
} from '../types/task-executor';

/** 梦境整合任务类型 — 通过SpawnProvider.callModel进行背景整合 */
export class DreamTask implements TaskType {
  readonly identifier: TaskTypeIdentifier = 'dream';
  readonly description = 'Background dream integration via SpawnProvider.callModel';

  async execute(task: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult> {
    const startTime = Date.now();

    // 构造梦境整合prompt
    const integrationPrompt = `Integrate and synthesize the following information into a coherent summary:

Task: ${task.subject}
${task.description ? `Context: ${task.description}\n` : ''}

Produce a concise integration that:
- Identifies key patterns and themes
- Highlights important decisions or insights
- Notes any unresolved questions or conflicts
- Suggests next steps or areas for further exploration

Format the output as a structured summary.`;

    try {
      const output = await context.spawnProvider.callModel(integrationPrompt, {
        maxTokens: 1000,
        abortSignal: context.abortSignal,
        systemPrompt:
          'You are an integration assistant that synthesizes information into coherent summaries.'
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
