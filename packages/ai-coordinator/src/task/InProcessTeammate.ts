/** InProcessTeammate — 进程内协作任务（共享内存的Agent会话） */

import type { TaskDefinition } from '../types/task';
import type {
  TaskExecutionContext,
  TaskResult,
  TaskType,
  TaskTypeIdentifier
} from '../types/task-executor';
import type { AgentDefinition } from '../types/agent';

/** 进程内Teammate任务类型 — 创建共享上下文的Agent会话 */
export class InProcessTeammate implements TaskType {
  readonly identifier: TaskTypeIdentifier = 'in_process_teammate';
  readonly description = 'In-process teammate with shared context via SpawnProvider.spawnAgent';

  async execute(task: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult> {
    const startTime = Date.now();

    // InProcessTeammate使用共享memory的Agent定义
    const agentDef: AgentDefinition = {
      agentType: 'teammate',
      whenToUse: task.subject,
      // InProcess模式不限制工具 — 共享父的工具集
      tools: undefined,
      // 使用与父相同的模型
      model: (task.metadata?.model as string) ?? 'inherit'
    };

    // 添加共享上下文指令
    const sharedContext = (task.metadata?.sharedContext as string) ?? '';
    const contextDirective = sharedContext
      ? `You are a teammate working in the same process. Shared context: ${sharedContext}`
      : 'You are a teammate working in the same process. Coordinate with other agents.';

    try {
      const result = await context.spawnProvider.spawnAgent(agentDef, task.subject, {
        systemPrompt: contextDirective,
        allowedTools: (task.metadata?.allowedTools as string[]) ?? undefined,
        abortSignal: context.abortSignal,
        // Swarm Worker 权限转发 — 将 mailboxOps 注入到子 Agent 权限管线
        swarmWorkerMailboxOps: context.swarmWorkerMailboxOps,
        swarmWorkerId: context.swarmWorkerId,
        swarmWorkerName: context.swarmWorkerName ?? context.swarmWorkerId,
        swarmLeaderName: context.swarmLeaderName
      });

      return {
        taskId: task.taskId,
        success: result.success,
        output: result.output,
        error: result.error,
        durationMs: Date.now() - startTime,
        tokensUsed: result.tokensUsed
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
