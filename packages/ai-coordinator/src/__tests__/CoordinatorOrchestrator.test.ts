import { describe, it, expect } from 'vitest';
import { CoordinatorOrchestrator } from '../orchestrator/CoordinatorOrchestrator';
import { CoordinatorRegistry } from '../registry/CoordinatorRegistry';
import { InMemoryMailbox } from '../mailbox/InMemoryMailbox';
import { TaskManager } from '../task/TaskManager';
import { DefaultPhaseStrategy } from '../orchestrator/PhaseStrategy';
import type { OrchestrationEvent, OrchestrationPhase } from '../types/orchestrator';

describe('CoordinatorOrchestrator', () => {
  it('应按 research→synthesis→implementation→verification 推进', async () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和阅读代码、研究项目结构' });
    registry.register({ agentType: 'coder', whenToUse: '编写和修改代码文件' });
    registry.register({ agentType: 'tester', whenToUse: '运行测试验证代码正确性' });

    const mailbox = new InMemoryMailbox();
    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();

    const phases: OrchestrationPhase[] = [];
    const orchestrator = new CoordinatorOrchestrator();

    for await (const event of orchestrator.orchestrate(
      '帮我重构auth模块', registry, mailbox, taskManager, strategy
    )) {
      if (event.type === 'phase_start') {
        phases.push(event.phase);
      }
    }

    expect(phases).toEqual(['research', 'synthesis', 'implementation', 'verification']);
  });

  it('synthesis阶段不创建Worker步骤', async () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和研究' });

    const mailbox = new InMemoryMailbox();
    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();

    let synthesisTaskCreated = false;
    const orchestrator = new CoordinatorOrchestrator();

    for await (const event of orchestrator.orchestrate(
      '查询', registry, mailbox, taskManager, strategy
    )) {
      if (event.type === 'task_created' && event.task.description?.includes('synthesis')) {
        synthesisTaskCreated = true;
      }
    }

    // synthesis阶段 DefaultPhaseStrategy 返回空步骤
    expect(synthesisTaskCreated).toBe(false);
  });

  it('应产出完整事件流并返回 OrchestrationResult', async () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '研究' });

    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('researcher');
    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();

    const events: OrchestrationEvent[] = [];
    const orchestrator = new CoordinatorOrchestrator();

    for await (const event of orchestrator.orchestrate(
      'test', registry, mailbox, taskManager, strategy
    )) {
      events.push(event);
    }

    // 最后一个事件应为 orchestration_end
    const lastEvent = events[events.length - 1];
    expect(lastEvent.type).toBe('orchestration_end');
    if (lastEvent.type === 'orchestration_end') {
      expect(lastEvent.result).toBeDefined();
      expect(lastEvent.result.finalPhase).toBe('verification');
    }
  });
});