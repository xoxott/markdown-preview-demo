/** CoordinatorOrchestrator — 4阶段编排引擎 + 权限冒泡事件 */

import type {
  OrchestrationContext,
  OrchestrationEvent,
  OrchestrationResult,
  PhaseStrategy,
  StepResult
} from '../types/orchestrator';
import type { Mailbox } from '../types/mailbox';
import type { PermissionBubbleRequest, PermissionBubbleResponse } from '../types/permission-bubble';
import type { SpawnProvider, TaskResult } from '../types/task-executor';
import type { CoordinatorRegistry } from '../registry/CoordinatorRegistry';
import type { TaskManager } from '../task/TaskManager';
import { TaskExecutor } from '../task/TaskExecutor';
import { LocalAgentTask } from '../task/LocalAgentTask';
import { ORCHESTRATION_PHASES } from '../constants';
import { PermissionBubbleQueue } from '../permission/PermissionBubbleQueue';
import {
  receivePermissionBubbleRequests,
  sendPermissionBubbleResponse
} from '../permission/PermissionBubbleHandler';

export class CoordinatorOrchestrator {
  /** 权限冒泡请求队列 — Leader 端管理 */
  readonly permissionQueue = new PermissionBubbleQueue();

  /**
   * 处理权限冒泡请求 — Leader 端从 Mailbox 接收并加入队列
   *
   * 宿主可定期调用此方法，从 Mailbox 接收 Worker 的权限请求， 加入队列等待用户交互处理。
   *
   * @param mailbox Mailbox 实例
   * @param leaderName Leader 名称
   * @returns 新接收的请求列表
   */
  async receivePermissionBubbles(
    mailbox: Mailbox,
    leaderName: string
  ): Promise<PermissionBubbleRequest[]> {
    const requests = await receivePermissionBubbleRequests(mailbox, leaderName);

    for (const request of requests) {
      const requestId =
        request.requestId ?? `auto_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      this.permissionQueue.enqueue(request, requestId);
    }

    return requests;
  }

  /**
   * 解析权限冒泡请求 — Leader 决策后标记并通知 Worker
   *
   * @param requestId 请求 ID
   * @param approved 是否批准
   * @param mailbox Mailbox 实例
   * @param workerName Worker 名称
   * @param reason 决策原因（可选）
   * @returns 更新后的队列条目
   */
  async resolvePermissionBubble(
    requestId: string,
    approved: boolean,
    mailbox: Mailbox,
    workerName: string,
    reason?: string
  ): Promise<{
    entry: import('../permission/PermissionBubbleQueue').PendingPermissionBubble;
    response: PermissionBubbleResponse;
  }> {
    const entry = this.permissionQueue.resolve(requestId, approved);

    const response: PermissionBubbleResponse = {
      type: 'permission_response',
      workerId: entry.request.workerId,
      approved,
      requestId,
      resolvedBy: 'leader',
      reason: reason ?? (approved ? 'Leader 批准' : 'Leader 拒绝')
    };

    await sendPermissionBubbleResponse(mailbox, response, workerName);

    return { entry, response };
  }

  /**
   * 执行4阶段编排
   *
   * 线性推进 research → synthesis → implementation → verification 每阶段调用 PhaseStrategy.plan() 获取步骤
   *
   * 有 SpawnProvider → 通过 TaskExecutor 真实执行 无 SpawnProvider → 模拟执行（向后兼容）
   */
  async *orchestrate(
    userRequest: string,
    registry: CoordinatorRegistry,
    mailbox: Mailbox,
    taskManager: TaskManager,
    strategy: PhaseStrategy,
    spawnProvider?: SpawnProvider
  ): AsyncGenerator<OrchestrationEvent> {
    const completedSteps: StepResult[] = [];
    const availableAgents = registry.getAll();

    // 构建TaskExecutor（如果有SpawnProvider），自动注册默认TaskType
    const executor = spawnProvider
      ? (() => {
          const ex = new TaskExecutor(spawnProvider, mailbox, registry);
          ex.typeRegistry.register(new LocalAgentTask());
          return ex;
        })()
      : undefined;

    for (const phase of ORCHESTRATION_PHASES) {
      yield { type: 'phase_start', phase };

      const context: OrchestrationContext = {
        userRequest,
        completedSteps,
        currentPhase: phase,
        availableAgents,
        meta: executor ? { executor } : {}
      };

      const steps = strategy.plan(phase, context);

      // Synthesis阶段: Coordinator 自己综合，直接产出总结
      if (phase === 'synthesis') {
        const researchResults = completedSteps
          .filter(s => s.step.phase === 'research')
          .map(s => s.output)
          .join('\n');
        const summary = researchResults || '暂无研究结果';

        for (const step of steps) {
          const task = taskManager.create(step.prompt, `阶段: ${phase}`);
          yield { type: 'task_created', task };
          yield { type: 'message_sent', to: step.agentType, content: step.prompt };
        }

        yield { type: 'phase_end', phase, summary };
        continue;
      }

      // 为每个步骤创建 Task 并执行
      for (const step of steps) {
        const task = taskManager.create(step.prompt, `阶段: ${phase}`);
        yield { type: 'task_created', task };

        await mailbox.send({
          messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          from: 'coordinator',
          to: step.agentType,
          content: {
            type: 'task_assignment',
            payload: { prompt: step.prompt, taskId: task.taskId }
          },
          timestamp: Date.now(),
          summary: step.prompt
        });
        yield { type: 'message_sent', to: step.agentType, content: step.prompt };

        // 真实执行（有SpawnProvider + executor）
        if (executor) {
          const taskDef = taskManager.update({
            taskId: task.taskId,
            status: 'in_progress',
            owner: step.agentType,
            metadata: {
              taskType: step.agentType.includes('remote') ? 'remote_agent' : 'local_agent'
            }
          });

          const execResult: TaskResult = await executor.execute(taskDef ?? task);
          yield { type: 'task_completed', task: taskDef ?? task, result: execResult };

          completedSteps.push({
            step,
            workerName: step.agentType,
            output: execResult.success ? execResult.output : `FAILED: ${execResult.error ?? ''}`,
            success: execResult.success
          });

          // 更新Task状态
          taskManager.update({
            taskId: task.taskId,
            status: execResult.success ? 'completed' : 'failed'
          });
        } else {
          // 模拟执行（向后兼容）
          completedSteps.push({
            step,
            workerName: step.agentType,
            output: `[${step.agentType}] 完成了: ${step.prompt}`,
            success: true
          });
        }
      }

      const phaseSummary = completedSteps
        .filter(s => s.step.phase === phase)
        .map(s => s.output)
        .join('\n');

      yield { type: 'phase_end', phase, summary: phaseSummary };
    }

    const result: OrchestrationResult = {
      finalPhase: 'verification',
      stepResults: completedSteps,
      summary: completedSteps.map(s => s.output).join('\n')
    };

    yield { type: 'orchestration_end', result };
  }

  /**
   * 产出权限冒泡事件 — Worker 需要权限时调用
   *
   * 产出一个 permission_bubble OrchestrationEvent， 供宿主在编排流中插入权限冒泡处理逻辑。
   *
   * @param workerId Worker ID
   * @param toolName 工具名称
   * @param reason 权限请求原因
   */
  *emitPermissionBubble(
    workerId: string,
    toolName: string,
    reason: string
  ): Generator<OrchestrationEvent> {
    yield { type: 'permission_bubble', workerId, toolName, reason };
  }

  /**
   * 产出权限解析事件 — Leader 决策后调用
   *
   * @param workerId Worker ID
   * @param approved 是否批准
   */
  *emitPermissionResolved(workerId: string, approved: boolean): Generator<OrchestrationEvent> {
    yield { type: 'permission_resolved', workerId, approved };
  }
}
