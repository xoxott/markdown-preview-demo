/** CoordinatorOrchestrator — 4阶段编排引擎 */

import type { OrchestrationEvent, OrchestrationResult, OrchestrationContext, StepResult, PhaseStrategy } from '../types/orchestrator';
import type { Mailbox } from '../types/mailbox';
import { CoordinatorRegistry } from '../registry/CoordinatorRegistry';
import { TaskManager } from '../task/TaskManager';
import { ORCHESTRATION_PHASES } from '../constants';

export class CoordinatorOrchestrator {
  /**
   * 执行4阶段编排
   *
   * 线性推进 research → synthesis → implementation → verification
   * 每阶段调用 PhaseStrategy.plan() 获取步骤，为每个步骤创建 Task + 发送 Mailbox 消息
   */
  async *orchestrate(
    userRequest: string,
    registry: CoordinatorRegistry,
    mailbox: Mailbox,
    taskManager: TaskManager,
    strategy: PhaseStrategy
  ): AsyncGenerator<OrchestrationEvent> {
    const completedSteps: StepResult[] = [];
    const availableAgents = registry.getAll();

    for (const phase of ORCHESTRATION_PHASES) {
      yield { type: 'phase_start', phase };

      const context: OrchestrationContext = {
        userRequest,
        completedSteps,
        currentPhase: phase,
        availableAgents,
        meta: {}
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

      // 为每个步骤创建 Task + 发送 Mailbox 消息
      for (const step of steps) {
        const task = taskManager.create(step.prompt, `阶段: ${phase}`);
        yield { type: 'task_created', task };

        await mailbox.send({
          messageId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          from: 'coordinator',
          to: step.agentType,
          content: { type: 'task_assignment', payload: { prompt: step.prompt, taskId: task.taskId } },
          timestamp: Date.now(),
          summary: step.prompt
        });
        yield { type: 'message_sent', to: step.agentType, content: step.prompt };

        // 模拟 Worker 结果（实际场景由下游实现）
        completedSteps.push({
          step,
          workerName: step.agentType,
          output: `[${step.agentType}] 完成了: ${step.prompt}`,
          success: true
        });
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
}