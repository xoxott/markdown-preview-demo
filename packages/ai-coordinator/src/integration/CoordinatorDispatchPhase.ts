/** CoordinatorDispatchPhase — P1 LoopPhase 集成 */

import type { MutableAgentContext } from '@suga/ai-agent-loop';
import type { AgentEvent } from '@suga/ai-agent-loop';
import type { LoopPhase } from '@suga/ai-agent-loop';
import type { OrchestrationResult } from '../types/orchestrator';
import type { Mailbox } from '../types/mailbox';
import { CoordinatorOrchestrator } from '../orchestrator/CoordinatorOrchestrator';
import { CoordinatorRegistry } from '../registry/CoordinatorRegistry';
import { TaskManager } from '../task/TaskManager';
import type { PhaseStrategy } from '../types/orchestrator';

/**
 * Coordinator 编排预处理阶段
 *
 * 在 Phase 链中插入，从用户消息提取请求，运行编排引擎，
 * 将编排结果写入 ctx.meta.coordinatorResult。
 */
export class CoordinatorDispatchPhase implements LoopPhase {
  constructor(
    private readonly registry: CoordinatorRegistry,
    private readonly mailbox: Mailbox,
    private readonly taskManager: TaskManager,
    private readonly strategy: PhaseStrategy
  ) {}

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 从 ctx.state.messages 提取用户请求
    const userRequest = ctx.state.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    if (userRequest.length > 0) {
      const orchestrator = new CoordinatorOrchestrator();
      let finalResult: OrchestrationResult | undefined;

      for await (const event of orchestrator.orchestrate(
        userRequest, this.registry, this.mailbox, this.taskManager, this.strategy
      )) {
        // 将编排事件转为 text_delta 描述
        if (event.type === 'phase_start') {
          yield { type: 'text_delta', delta: `[Coordinator] 开始 ${event.phase} 阶段\n` };
        } else if (event.type === 'phase_end') {
          yield { type: 'text_delta', delta: `[Coordinator] ${event.phase} 阶段完成\n` };
        } else if (event.type === 'orchestration_end') {
          finalResult = event.result;
        }

        // 写入 meta
        ctx.meta.coordinatorEvent = event;
      }

      if (finalResult) {
        ctx.meta.coordinatorResult = finalResult;
      }
    }

    ctx.meta.preProcessed = true;
    yield* next();
  }
}