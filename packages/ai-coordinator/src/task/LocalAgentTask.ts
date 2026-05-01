/** LocalAgentTask — 本地LLM Agent执行（通过SpawnProvider.spawnAgent） */

import type { TaskDefinition } from '../types/task';
import type {
  TaskExecutionContext,
  TaskResult,
  TaskType,
  TaskTypeIdentifier
} from '../types/task-executor';
import type { AgentDefinition } from '../types/agent';

/** 本地Agent任务类型 — 通过SpawnProvider创建完整AgentLoop会话执行 */
export class LocalAgentTask implements TaskType {
  readonly identifier: TaskTypeIdentifier = 'local_agent';
  readonly description = 'Local LLM Agent execution via SpawnProvider.spawnAgent';

  async execute(task: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult> {
    const startTime = Date.now();

    // 从agentRegistry查找AgentDefinition
    const agentType = (task.metadata?.agentType as string) ?? task.owner ?? 'default';
    const agentDef = context.agentRegistry?.get(agentType);

    // 如果没有找到AgentDefinition，使用默认定义
    const def: AgentDefinition = agentDef ?? {
      agentType,
      whenToUse: task.subject
    };

    // 通过SpawnProvider执行Agent
    const result = await context.spawnProvider.spawnAgent(def, task.subject, {
      model: def.model,
      allowedTools: def.tools,
      abortSignal: context.abortSignal
    });

    return {
      taskId: task.taskId,
      success: result.success,
      output: result.output,
      error: result.error,
      durationMs: Date.now() - startTime,
      tokensUsed: result.tokensUsed
    };
  }
}
