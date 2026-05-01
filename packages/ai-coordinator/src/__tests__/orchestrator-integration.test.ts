/** Orchestrator 真实执行集成测试 — TaskExecutor + CoordinatorOrchestrator */

import { describe, expect, it } from 'vitest';
import { CoordinatorOrchestrator } from '../orchestrator/CoordinatorOrchestrator';
import { CoordinatorRegistry } from '../registry/CoordinatorRegistry';
import { InMemoryMailbox } from '../mailbox/InMemoryMailbox';
import { TaskManager } from '../task/TaskManager';
import { DefaultPhaseStrategy } from '../orchestrator/PhaseStrategy';
import type { OrchestrationEvent } from '../types/orchestrator';
import { MockSpawnProvider } from './mocks/MockSpawnProvider';

describe('CoordinatorOrchestrator — 真实执行', () => {
  it('有SpawnProvider → 通过TaskExecutor真实执行步骤', async () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和阅读代码、研究项目结构' });
    registry.register({ agentType: 'coder', whenToUse: '编写和修改代码文件' });

    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('researcher');
    mailbox.registerRecipient('coder');

    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();
    const spawnProvider = new MockSpawnProvider();
    const orchestrator = new CoordinatorOrchestrator();

    const events: OrchestrationEvent[] = [];
    for await (const event of orchestrator.orchestrate(
      '帮我重构auth模块',
      registry,
      mailbox,
      taskManager,
      strategy,
      spawnProvider
    )) {
      events.push(event);
    }

    // 应有 task_completed 事件
    const taskCompletedEvents = events.filter(e => e.type === 'task_completed');
    expect(taskCompletedEvents.length).toBeGreaterThan(0);

    // 所有task_completed事件应有真实结果（不是模拟输出）
    for (const event of taskCompletedEvents) {
      if (event.type === 'task_completed') {
        expect(event.result.success).toBe(true);
        expect(event.result.output).toContain('Mock agent output');
      }
    }

    // spawnProvider应有spawn调用记录
    expect(spawnProvider.getSpawnHistory().length).toBeGreaterThan(0);

    // 最后事件应为orchestration_end
    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe('orchestration_end');
  });

  it('无SpawnProvider → 模拟执行（向后兼容）', async () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和研究' });

    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('researcher');

    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();
    const orchestrator = new CoordinatorOrchestrator();

    const events: OrchestrationEvent[] = [];
    for await (const event of orchestrator.orchestrate(
      'test request',
      registry,
      mailbox,
      taskManager,
      strategy
      // 无 SpawnProvider
    )) {
      events.push(event);
    }

    // 不应有 task_completed 事件
    const taskCompletedEvents = events.filter(e => e.type === 'task_completed');
    expect(taskCompletedEvents.length).toBe(0);

    // phase_end summary应包含模拟输出格式
    const phaseEnds = events.filter(e => e.type === 'phase_end');
    const researchEnd = phaseEnds.find(e => e.phase === 'research');
    if (researchEnd && researchEnd.type === 'phase_end') {
      expect(researchEnd.summary).toContain('[researcher] 完成了');
    }
  });

  it('SpawnProvider执行失败 → step结果标记失败', async () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和研究' });

    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('researcher');

    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();

    const spawnProvider = new MockSpawnProvider();
    spawnProvider.setAgentResult({
      output: '',
      toolCalls: 0,
      tokensUsed: { input: 0, output: 0 },
      success: false,
      error: 'Agent spawn failed: connection timeout'
    });

    const orchestrator = new CoordinatorOrchestrator();
    const events: OrchestrationEvent[] = [];

    for await (const event of orchestrator.orchestrate(
      'test request',
      registry,
      mailbox,
      taskManager,
      strategy,
      spawnProvider
    )) {
      events.push(event);
    }

    const taskCompletedEvents = events.filter(e => e.type === 'task_completed');
    expect(taskCompletedEvents.length).toBeGreaterThan(0);

    for (const event of taskCompletedEvents) {
      if (event.type === 'task_completed') {
        expect(event.result.success).toBe(false);
        expect(event.result.error).toContain('spawn');
      }
    }

    // orchestration_end的stepResults中应有失败步骤
    const lastEvent = events[events.length - 1];
    if (lastEvent.type === 'orchestration_end') {
      const failedSteps = lastEvent.result.stepResults.filter(s => !s.success);
      expect(failedSteps.length).toBeGreaterThan(0);
    }
  });

  it('orchestrate事件流包含完整4阶段', async () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和研究代码' });
    registry.register({ agentType: 'coder', whenToUse: '编写和修改代码' });
    registry.register({ agentType: 'tester', whenToUse: '测试和验证' });

    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('researcher');
    mailbox.registerRecipient('coder');
    mailbox.registerRecipient('tester');

    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();
    const spawnProvider = new MockSpawnProvider();
    const orchestrator = new CoordinatorOrchestrator();

    const phases: string[] = [];
    for await (const event of orchestrator.orchestrate(
      '完整流程测试',
      registry,
      mailbox,
      taskManager,
      strategy,
      spawnProvider
    )) {
      if (event.type === 'phase_start') {
        phases.push(event.phase);
      }
    }

    expect(phases).toEqual(['research', 'synthesis', 'implementation', 'verification']);
  });
});
