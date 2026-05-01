/** SubagentDispatchPhase 测试 — P9 集成，替换模拟结果为真实执行 */

import { describe, expect, it } from 'vitest';
import type { AgentEvent, MutableAgentContext } from '@suga/ai-agent-loop';
import type { OrchestrationResult, StepResult } from '@suga/ai-coordinator';
import { SubagentDispatchPhase } from '../integration/SubagentDispatchPhase';
import { SubagentRegistry } from '../registry/SubagentRegistry';
import type { SubagentDefinition } from '../types/subagent';
import { MockSubagentSpawner } from './mocks/MockSubagentSpawner';

/** 创建 mock AgentContext */
const createMockCtx = (coordinatorResult?: OrchestrationResult): MutableAgentContext =>
  ({
    state: {
      sessionId: 'test',
      turnCount: 0,
      messages: [],
      toolUseContext: {
        abortController: new AbortController(),
        tools: { getAll: () => [], getByName: () => undefined, get: () => undefined } as never,
        sessionId: 'test',
        agentId: 'test',
        turnCount: 0
      },
      transition: { type: 'next_turn' }
    },
    meta: { coordinatorResult },
    error: undefined
  }) as unknown as MutableAgentContext;

/** 空的 next 函数 */
const emptyNext = async function* emptyNext(): AsyncGenerator<AgentEvent> {
  // 不产出任何事件
};

/** 创建 OrchestrationResult */
const makeOrchestrationResult = (stepResults: StepResult[]): OrchestrationResult => ({
  finalPhase: 'verification',
  stepResults,
  summary: '编排完成'
});

/** 创建 StepResult */
const makeStepResult = (agentType: string, output: string): StepResult => ({
  step: { phase: 'research', agentType, prompt: `执行 ${agentType} 任务` },
  workerName: agentType,
  output,
  success: true
});

const makeDef = (
  agentType: string,
  overrides?: Partial<SubagentDefinition>
): SubagentDefinition => ({
  agentType,
  whenToUse: `使用 ${agentType}`,
  ...overrides
});

describe('SubagentDispatchPhase', () => {
  it('无 coordinatorResult → 跳过执行', async () => {
    const registry = new SubagentRegistry();
    const spawner = new MockSubagentSpawner();
    const phase = new SubagentDispatchPhase(registry, spawner);

    const ctx = createMockCtx(); // 无 coordinatorResult
    const events: AgentEvent[] = [];

    for await (const event of phase.execute(ctx, emptyNext)) {
      events.push(event);
    }

    expect(events).toHaveLength(0); // 无事件产出
    expect(spawner.getSpawnCount()).toBe(0); // 无 spawn
  });

  it('有 coordinatorResult + 注册定义 → 真实替换模拟结果', async () => {
    const registry = new SubagentRegistry();
    registry.register(makeDef('researcher', { source: 'builtin' }));

    const spawner = new MockSubagentSpawner();
    const phase = new SubagentDispatchPhase(registry, spawner);

    const coordinatorResult = makeOrchestrationResult([
      makeStepResult('researcher', '模拟占位字符串')
    ]);

    const ctx = createMockCtx(coordinatorResult);
    const events: AgentEvent[] = [];

    for await (const event of phase.execute(ctx, emptyNext)) {
      events.push(event);
    }

    // 应有 3 个 text_delta 事件：开始、完成
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(spawner.getSpawnCount()).toBe(1); // 1 次 spawn

    // ctx.meta.coordinatorResult 应被更新
    const updatedResult = ctx.meta.coordinatorResult as OrchestrationResult;
    expect(updatedResult.stepResults[0].output).not.toBe('模拟占位字符串');
    expect(updatedResult.stepResults[0].success).toBe(true);
  });

  it('无注册定义的 agentType → 保留模拟结果', async () => {
    const registry = new SubagentRegistry();
    // 不注册 researcher → 保留模拟结果

    const spawner = new MockSubagentSpawner();
    const phase = new SubagentDispatchPhase(registry, spawner);

    const coordinatorResult = makeOrchestrationResult([
      makeStepResult('researcher', '模拟占位字符串')
    ]);

    const ctx = createMockCtx(coordinatorResult);
    const events: AgentEvent[] = [];

    for await (const event of phase.execute(ctx, emptyNext)) {
      events.push(event);
    }

    // 1 个 text_delta：无注册定义
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(spawner.getSpawnCount()).toBe(0); // 无 spawn

    // ctx.meta.coordinatorResult 的 output 保留
    const updatedResult = ctx.meta.coordinatorResult as OrchestrationResult;
    expect(updatedResult.stepResults[0].output).toBe('模拟占位字符串');
  });
});
