/** SubagentDispatchPhase — P9 集成，替换模拟 StepResult 为真实子代理执行 */

import type { AgentEvent, LoopPhase, MutableAgentContext } from '@suga/ai-agent-loop';
import type { OrchestrationResult, StepResult } from '@suga/ai-coordinator';
import type { SubagentRegistry } from '../registry/SubagentRegistry';
import type { Spawner } from '../spawner/SubagentSpawner';
import type { SubagentResult } from '../types/result';
import type { OutputFileBridge } from '../output/OutputFileBridge';

/**
 * SubagentDispatchPhase — 作为额外 LoopPhase 替换 P9 模拟结果
 *
 * 工作流：
 *
 * 1. CoordinatorDispatchPhase 写入 ctx.meta.coordinatorResult（模拟占位字符串）
 * 2. SubagentDispatchPhase 读取 coordinatorResult
 * 3. 对每个模拟 StepResult → spawner.spawn 真实执行
 * 4. 替换模拟 output 为真实 SubagentResult.summary
 * 5. yield text_delta 事件显示进度
 *
 * 位置：在 CoordinatorDispatchPhase 之后插入 Phase 链
 */
export class SubagentDispatchPhase implements LoopPhase {
  private readonly subagentRegistry: SubagentRegistry;
  private readonly spawner: Spawner;
  private readonly outputBridge?: OutputFileBridge;

  constructor(
    subagentRegistry: SubagentRegistry,
    spawner: Spawner,
    outputBridge?: OutputFileBridge
  ) {
    this.subagentRegistry = subagentRegistry;
    this.spawner = spawner;
    this.outputBridge = outputBridge;
  }

  async *execute(
    ctx: MutableAgentContext,
    next: () => AsyncGenerator<AgentEvent>
  ): AsyncGenerator<AgentEvent> {
    // 先执行后续阶段（CoordinatorDispatchPhase 等）
    yield* next();

    // 检查是否有 P9 编排结果
    const coordinatorResult = ctx.meta.coordinatorResult as OrchestrationResult | undefined;

    if (!coordinatorResult) {
      return; // 无编排结果，跳过
    }

    // 对每个模拟 StepResult 进行真实子代理执行
    const realStepResults: StepResult[] = [];

    for (const stepResult of coordinatorResult.stepResults) {
      const agentType = stepResult.step.agentType;
      const def = this.subagentRegistry.get(agentType);

      if (!def) {
        // 无匹配子代理定义 — 保留模拟结果
        realStepResults.push(stepResult);
        yield { type: 'text_delta', delta: `[Subagent] "${agentType}" 无注册定义，保留模拟结果\n` };
        continue;
      }

      yield {
        type: 'text_delta',
        delta: `[Subagent] 开始执行 ${agentType}: ${stepResult.step.prompt.slice(0, 50)}...\n`
      };

      try {
        const subagentResult: SubagentResult = await this.spawner.spawn(
          def,
          stepResult.step.prompt,
          undefined,
          undefined,
          undefined
        );

        // 大输出持久化
        const processedResult = this.outputBridge
          ? this.outputBridge.processResult(subagentResult)
          : subagentResult;

        // 替换模拟 output 为真实 summary
        realStepResults.push({
          ...stepResult,
          output: processedResult.summary,
          success: subagentResult.success
        });

        yield {
          type: 'text_delta',
          delta: `[Subagent] ${agentType} 完成 (耗时 ${subagentResult.durationMs}ms)\n`
        };
      } catch (err) {
        // 子代理执行异常 — 保留模拟结果但标记失败
        realStepResults.push({
          ...stepResult,
          output: `子代理执行异常: ${err instanceof Error ? err.message : String(err)}`,
          success: false
        });

        yield { type: 'text_delta', delta: `[Subagent] ${agentType} 执行异常\n` };
      }
    }

    // 更新 ctx.meta.coordinatorResult 为真实结果
    ctx.meta.coordinatorResult = {
      ...coordinatorResult,
      stepResults: realStepResults
    };
  }
}
