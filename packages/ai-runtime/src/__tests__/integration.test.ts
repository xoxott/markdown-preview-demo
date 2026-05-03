import { describe, expect, it } from 'vitest';
import type { AgentEvent } from '@suga/ai-agent-loop';
import {
  HookAfterToolPhase,
  HookBeforeToolPhase,
  HookNotificationPhase,
  HookPostCompactPhase,
  HookPreCompactPhase,
  HookRegistry,
  HookSessionEndPhase,
  HookSessionStartPhase,
  HookStopPhase,
  HookUserPromptPhase
} from '@suga/ai-hooks';
import { CompressPhase } from '@suga/ai-context';
import { CoordinatorDispatchPhase, CoordinatorRegistry } from '@suga/ai-coordinator';
import type { RuntimeConfig } from '../types/config';
import { RuntimeSession } from '../session/RuntimeSession';
import { buildEffectiveToolRegistry } from '../factory/buildEffectiveToolRegistry';
import { buildRuntimePhases } from '../factory/buildRuntimePhases';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

const mockFsProvider = new MockFileSystemProvider();

/** 辅助：消费所有事件 */
async function consumeAllEvents(generator: AsyncGenerator<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of generator) {
    events.push(event);
  }
  return events;
}

describe('集成测试', () => {
  it('Compress + Hooks → Phase链包含 CompressPhase + HookPhase', () => {
    const provider = new MockLLMProvider();
    const hookRegistry = new HookRegistry();

    const config: RuntimeConfig = {
      provider,
      fsProvider: mockFsProvider,
      hookRegistry,
      compressConfig: {
        budget: { maxResultSize: 150_000, previewSize: 2_000 },
        microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
        autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
      }
    };

    const phases = buildRuntimePhases(config);

    // HookSessionStart, HookUserPrompt, HookPreCompact, Compress, HookPostCompact, CallModel, CheckInterrupt, HookBeforeTool, HookAfterTool, PostProcess, HookStop, HookNotification, HookSessionEnd
    expect(phases[0]).toBeInstanceOf(HookSessionStartPhase);
    expect(phases[2]).toBeInstanceOf(HookPreCompactPhase);
    expect(phases[3]).toBeInstanceOf(CompressPhase);
    expect(phases[4]).toBeInstanceOf(HookPostCompactPhase);
    expect(phases[7]).toBeInstanceOf(HookBeforeToolPhase);
    expect(phases[8]).toBeInstanceOf(HookAfterToolPhase);
    expect(phases[10]).toBeInstanceOf(HookStopPhase);
    expect(phases[11]).toBeInstanceOf(HookNotificationPhase);
    expect(phases[12]).toBeInstanceOf(HookSessionEndPhase);
  });

  it('Coordinator + Hooks → CoordinatorDispatchPhase + HookPhase 共存', () => {
    const provider = new MockLLMProvider();
    const hookRegistry = new HookRegistry();
    const coordinatorRegistry = new CoordinatorRegistry();
    coordinatorRegistry.register({ agentType: 'researcher', whenToUse: '搜索' });

    const config: RuntimeConfig = {
      provider,
      fsProvider: mockFsProvider,
      hookRegistry,
      coordinatorRegistry
    };

    const phases = buildRuntimePhases(config);

    // HookSessionStart, HookUserPrompt, HookPreCompact, PreProcess, CallModel, CheckInterrupt, Coordinator, HookBeforeTool, HookAfterTool, PostProcess, HookStop, HookNotification, HookSessionEnd
    expect(phases[6]).toBeInstanceOf(CoordinatorDispatchPhase);
    expect(phases[7]).toBeInstanceOf(HookBeforeToolPhase);
  });

  it('全配置 RuntimeSession → sendMessage 产出完整事件流', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('full runtime response');

    const hookRegistry = new HookRegistry();

    const config: RuntimeConfig = {
      provider,
      fsProvider: mockFsProvider,
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
    expect(session.getStatus()).toBe('active');
  });

  it('默认配置产生4个Phase', () => {
    const provider = new MockLLMProvider();
    const config: RuntimeConfig = { provider, fsProvider: mockFsProvider };
    const phases = buildRuntimePhases(config);

    expect(phases.length).toBe(4);
  });

  it('Store 响应式 → sendMessage 后状态正确更新', async () => {
    const provider = new MockLLMProvider();
    provider.addSimpleTextResponse('store test');

    const config: RuntimeConfig = { provider, fsProvider: mockFsProvider };
    const session = new RuntimeSession(config);
    const store = session.getStore();

    expect(store.getState().turnCount).toBe(0);
    expect(store.getState().lastEvent).toBeNull();

    await consumeAllEvents(session.sendMessage('hi'));

    expect(store.getState().status).toBe('active');
    expect(store.getState().lastEvent!.type).toBe('loop_end');
  });

  it('buildEffectiveToolRegistry — 无 registry → undefined', () => {
    const provider = new MockLLMProvider();
    const result = buildEffectiveToolRegistry({ provider, fsProvider: mockFsProvider });
    expect(result).toBeUndefined();
  });
});
