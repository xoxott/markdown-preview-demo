import { describe, it, expect } from 'vitest';
import { buildRuntimePhases } from '../factory/buildRuntimePhases';
import { buildEffectiveToolRegistry } from '../factory/buildEffectiveToolRegistry';
import { RuntimeSession } from '../session/RuntimeSession';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import type { RuntimeConfig } from '../types/config';
import type { AgentEvent } from '@suga/ai-agent-loop';
import { HookRegistry } from '@suga/ai-hooks';
import { CompressPhase } from '@suga/ai-context';
import { CoordinatorDispatchPhase } from '@suga/ai-coordinator';
import { CoordinatorRegistry } from '@suga/ai-coordinator';
import { HookBeforeToolPhase, HookAfterToolPhase, HookStopPhase } from '@suga/ai-hooks';

/** 辅助：消费所有事件 */
async function consumeAllEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe('集成测试', () => {
  it('Compress + Hooks → Phase 铱包含 CompressPhase + HookPhase', () => {
    const provider = new MockLLMProvider();
    const hookRegistry = new HookRegistry();

    const config: RuntimeConfig = {
      provider,
      hookRegistry,
      compressConfig: {
        budget: { maxResultSize: 150_000, previewSize: 2_000 },
        microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
        autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
      }
    };

    const phases = buildRuntimePhases(config);

    // Compress, CallModel, CheckInterrupt, HookBeforeTool, HookAfterTool, PostProcess, HookStop
    expect(phases[0]).toBeInstanceOf(CompressPhase);
    expect(phases[3]).toBeInstanceOf(HookBeforeToolPhase);
    expect(phases[4]).toBeInstanceOf(HookAfterToolPhase);
    expect(phases[6]).toBeInstanceOf(HookStopPhase);
  });

  it('Coordinator + Hooks → CoordinatorDispatchPhase + HookPhase 共存', () => {
    const provider = new MockLLMProvider();
    const hookRegistry = new HookRegistry();
    const coordinatorRegistry = new CoordinatorRegistry();
    coordinatorRegistry.register({ agentType: 'researcher', whenToUse: '搜索' });

    const config: RuntimeConfig = {
      provider,
      hookRegistry,
      coordinatorRegistry
    };

    const phases = buildRuntimePhases(config);

    // PreProcess, CallModel, CheckInterrupt, Coordinator, HookBeforeTool, PostProcess, HookStop
    expect(phases[3]).toBeInstanceOf(CoordinatorDispatchPhase);
    expect(phases[4]).toBeInstanceOf(HookBeforeToolPhase);
  });

  it('全配置 RuntimeSession → sendMessage 产出完整事件流', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('full runtime response');

    const hookRegistry = new HookRegistry();

    const config: RuntimeConfig = {
      provider,
      hookRegistry,
      compressConfig: {
        budget: { maxResultSize: 150_000, previewSize: 2_000 },
        microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
        autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
      }
    };

    const session = new RuntimeSession(config);
    const events = await consumeAllEvents(session.sendMessage('test integration'));

    expect(events.some(e => e.type === 'text_delta')).toBe(true);
    expect(events.some(e => e.type === 'loop_end')).toBe(true);
    expect(session.getStatus()).toBe('completed');
  });

  it('默认配置产生4个Phase', () => {
    const provider = new MockLLMProvider();
    const config: RuntimeConfig = { provider };
    const phases = buildRuntimePhases(config);

    expect(phases.length).toBe(4);
  });

  it('Store 响应式 → sendMessage 后状态正确更新', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('store test');

    const config: RuntimeConfig = { provider };
    const session = new RuntimeSession(config);
    const store = session.getStore();

    expect(store.getState().turnCount).toBe(0);
    expect(store.getState().lastEvent).toBeNull();

    await consumeAllEvents(session.sendMessage('hi'));

    expect(store.getState().status).toBe('completed');
    expect(store.getState().lastEvent!.type).toBe('loop_end');
  });

  it('buildEffectiveToolRegistry — 无 registry → undefined', () => {
    const provider = new MockLLMProvider();
    const result = buildEffectiveToolRegistry({ provider });
    expect(result).toBeUndefined();
  });
});
