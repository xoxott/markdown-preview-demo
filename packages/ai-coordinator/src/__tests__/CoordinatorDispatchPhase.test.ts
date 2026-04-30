import { describe, it, expect } from 'vitest';
import { CoordinatorRegistry } from '../registry/CoordinatorRegistry';
import { InMemoryMailbox } from '../mailbox/InMemoryMailbox';
import { TaskManager } from '../task/TaskManager';
import { DefaultPhaseStrategy } from '../orchestrator/PhaseStrategy';
import { CoordinatorDispatchPhase } from '../integration/CoordinatorDispatchPhase';
import type { MutableAgentContext } from '@suga/ai-agent-loop';
import type { AgentEvent } from '@suga/ai-agent-loop';

function createMockContext(): MutableAgentContext & { _messages: any[] } {
  const messages: any[] = [];
  return {
    state: {
      sessionId: 'test',
      get messages() {
        return messages as any;
      },
      status: 'running',
      turnCount: 0,
      error: null,
      transition: null,
      toolUseContext: {} as any
    } as any,
    meta: {},
    error: null,
    updateState: vi.fn(),
    setError: vi.fn(),
    _messages: messages
  } as any;
}

import { vi } from 'vitest';

async function* emptyGenerator(): AsyncGenerator<AgentEvent> {}

describe('CoordinatorDispatchPhase', () => {
  it('execute 应将编排结果写入 ctx.meta', async () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索和研究代码' });
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('researcher');
    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();

    const phase = new CoordinatorDispatchPhase(registry, mailbox, taskManager, strategy);
    const ctx = createMockContext();
    ctx._messages.push({ id: 'u1', role: 'user', content: '帮我研究这个项目', timestamp: 0 });

    const gen = phase.execute(ctx, () => emptyGenerator());
    for await (const _ of gen) {
      /* consume */
    }

    expect(ctx.meta.coordinatorResult).toBeDefined();
    expect(ctx.meta.preProcessed).toBe(true);
  });

  it('无用户消息时只标记 preProcessed', async () => {
    const registry = new CoordinatorRegistry();
    const mailbox = new InMemoryMailbox();
    const taskManager = new TaskManager();
    const strategy = new DefaultPhaseStrategy();

    const phase = new CoordinatorDispatchPhase(registry, mailbox, taskManager, strategy);
    const ctx = createMockContext();

    const gen = phase.execute(ctx, () => emptyGenerator());
    for await (const _ of gen) {
      /* consume */
    }

    expect(ctx.meta.preProcessed).toBe(true);
    expect(ctx.meta.coordinatorResult).toBeUndefined();
  });
});
