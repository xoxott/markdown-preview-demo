import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
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
import { SkillRegistry } from '@suga/ai-skill';
import { BlockingLimitPhase, CompressPhase } from '@suga/ai-context';
import { RecoveryPhase } from '@suga/ai-recovery';
import { CoordinatorDispatchPhase, CoordinatorRegistry } from '@suga/ai-coordinator';
import {
  CallModelPhase,
  CheckInterruptPhase,
  ExecuteToolsPhase,
  PostProcessPhase,
  PreProcessPhase
} from '@suga/ai-agent-loop';
import type { RuntimeConfig } from '../types/config';
import { buildEffectiveToolRegistry } from '../factory/buildEffectiveToolRegistry';
import { buildRuntimePhases } from '../factory/buildRuntimePhases';
import { MockLLMProvider } from './mocks/MockLLMProvider';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

const mockFsProvider = new MockFileSystemProvider();

/** 辅助：创建最小配置 */
function createMinimalConfig(): RuntimeConfig {
  return { provider: new MockLLMProvider(), fsProvider: mockFsProvider };
}

describe('buildRuntimePhases', () => {
  it('最小配置 → 产生 PreProcess+CallModel+CheckInterrupt+PostProcess 4个Phase', () => {
    const phases = buildRuntimePhases(createMinimalConfig());

    expect(phases.length).toBe(4);
    expect(phases[0]).toBeInstanceOf(PreProcessPhase);
    expect(phases[1]).toBeInstanceOf(CallModelPhase);
    expect(phases[2]).toBeInstanceOf(CheckInterruptPhase);
    expect(phases[3]).toBeInstanceOf(PostProcessPhase);
  });

  it('带 compressConfig → CompressPhase 替换 PreProcessPhase', () => {
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      compressConfig: {
        budget: { maxResultSize: 150_000, previewSize: 2_000 },
        microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
        autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
      }
    };

    const phases = buildRuntimePhases(config);

    // Compress, CallModel, CheckInterrupt, PostProcess (无recoveryConfig→无RecoveryPhase)
    expect(phases[0]).toBeInstanceOf(CompressPhase);
    expect(phases[1]).toBeInstanceOf(CallModelPhase);
    expect(phases[2]).toBeInstanceOf(CheckInterruptPhase);
    expect(phases[3]).toBeInstanceOf(PostProcessPhase);
  });

  it('带 hookRegistry → 插入 SessionStart+UserPrompt+BeforeTool+AfterTool+Stop+Notification+SessionEnd', () => {
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      hookRegistry: new HookRegistry()
    };

    const phases = buildRuntimePhases(config);

    // HookSessionStart, HookUserPrompt, HookPreCompact, PreProcess, CallModel, CheckInterrupt, HookBeforeTool, HookAfterTool, PostProcess, HookStop, HookNotification, HookSessionEnd
    expect(phases.length).toBe(12);
    expect(phases[0]).toBeInstanceOf(HookSessionStartPhase);
    expect(phases[1]).toBeInstanceOf(HookUserPromptPhase);
    expect(phases[2]).toBeInstanceOf(HookPreCompactPhase);
    expect(phases[3]).toBeInstanceOf(PreProcessPhase);
    expect(phases[6]).toBeInstanceOf(HookBeforeToolPhase);
    expect(phases[7]).toBeInstanceOf(HookAfterToolPhase);
    expect(phases[8]).toBeInstanceOf(PostProcessPhase);
    expect(phases[9]).toBeInstanceOf(HookStopPhase);
    expect(phases[10]).toBeInstanceOf(HookNotificationPhase);
    expect(phases[11]).toBeInstanceOf(HookSessionEndPhase);
  });

  it('带 toolRegistry → 插入 ExecuteToolsPhase', () => {
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      toolRegistry: new ToolRegistry()
    };

    const phases = buildRuntimePhases(config);

    expect(phases.length).toBe(5);
    expect(phases[3]).toBeInstanceOf(ExecuteToolsPhase);
  });

  it('带 coordinatorRegistry → 插入 CoordinatorDispatchPhase', () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索代码' });

    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      coordinatorRegistry: registry
    };

    const phases = buildRuntimePhases(config);

    // PreProcess, CallModel, CheckInterrupt, CoordinatorDispatch, PostProcess
    expect(phases.length).toBe(5);
    expect(phases[3]).toBeInstanceOf(CoordinatorDispatchPhase);
  });

  it('带 skillRegistry → SkillTool 自动注册到 effectiveRegistry', () => {
    const skillRegistry = new SkillRegistry();
    const toolRegistry = new ToolRegistry();

    const effectiveRegistry = buildEffectiveToolRegistry({
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      toolRegistry,
      skillRegistry
    });

    expect(effectiveRegistry).toBeDefined();
    // 应包含 SkillTool（名称为 'skill'）
    // P99: 返回值可能是 ToolRegistry 或 ToolSearchRegistryResult
    const registry =
      effectiveRegistry && 'deferredTools' in effectiveRegistry
        ? (
            effectiveRegistry as import('../factory/buildEffectiveToolRegistry').ToolSearchRegistryResult
          ).registry
        : (effectiveRegistry as import('@suga/ai-tool-core').ToolRegistry);
    const allTools = registry.getAll();
    expect(allTools.some((t: { name: string }) => t.name === 'skill')).toBe(true);
  });

  it('全配置组合 → 完整 Phase 链', () => {
    const provider = new MockLLMProvider();
    const hookRegistry = new HookRegistry();
    const toolRegistry = new ToolRegistry();
    const coordinatorRegistry = new CoordinatorRegistry();
    coordinatorRegistry.register({ agentType: 'researcher', whenToUse: '搜索' });

    const config: RuntimeConfig = {
      provider,
      fsProvider: mockFsProvider,
      hookRegistry,
      toolRegistry,
      compressConfig: {
        budget: { maxResultSize: 150_000, previewSize: 2_000 },
        microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
        autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
      },
      recoveryConfig: {},
      coordinatorRegistry
    };

    const phases = buildRuntimePhases(config);

    // HookSessionStart, HookUserPrompt, HookPreCompact, Compress, HookPostCompact, CallModel, CheckInterrupt, Recovery, Coordinator, HookBeforeTool, ExecuteTools, HookAfterTool, PostProcess, HookStop, HookNotification, HookSessionEnd
    expect(phases.length).toBe(16);
    expect(phases[0]).toBeInstanceOf(HookSessionStartPhase);
    expect(phases[1]).toBeInstanceOf(HookUserPromptPhase);
    expect(phases[2]).toBeInstanceOf(HookPreCompactPhase);
    expect(phases[3]).toBeInstanceOf(CompressPhase);
    expect(phases[4]).toBeInstanceOf(HookPostCompactPhase);
    expect(phases[5]).toBeInstanceOf(CallModelPhase);
    expect(phases[6]).toBeInstanceOf(CheckInterruptPhase);
    expect(phases[7]).toBeInstanceOf(RecoveryPhase);
    expect(phases[8]).toBeInstanceOf(CoordinatorDispatchPhase);
    expect(phases[9]).toBeInstanceOf(HookBeforeToolPhase);
    expect(phases[10]).toBeInstanceOf(ExecuteToolsPhase);
    expect(phases[11]).toBeInstanceOf(HookAfterToolPhase);
    expect(phases[12]).toBeInstanceOf(PostProcessPhase);
    expect(phases[13]).toBeInstanceOf(HookStopPhase);
    expect(phases[14]).toBeInstanceOf(HookNotificationPhase);
    expect(phases[15]).toBeInstanceOf(HookSessionEndPhase);
  });

  it('coordinatorRegistry 但无 mailbox → 自动创建 InMemoryMailbox', () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索' });

    // 只提供 registry，不提供 mailbox/taskManager/strategy
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      coordinatorRegistry: registry
    };

    const phases = buildRuntimePhases(config);

    // 应正常插入 CoordinatorDispatchPhase（使用默认值）
    expect(phases[3]).toBeInstanceOf(CoordinatorDispatchPhase);
  });
});

describe('buildRuntimePhases P33增强', () => {
  const compressConfig = {
    budget: { maxResultSize: 150_000, previewSize: 2_000 },
    microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
    autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
  };

  it('recoveryConfig+compressConfig → RecoveryPhase插入CheckInterruptPhase之后', () => {
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      compressConfig,
      recoveryConfig: {}
    };

    const phases = buildRuntimePhases(config);

    // Compress, CallModel, CheckInterrupt, Recovery, PostProcess
    expect(phases.length).toBe(5);
    expect(phases[0]).toBeInstanceOf(CompressPhase);
    expect(phases[1]).toBeInstanceOf(CallModelPhase);
    expect(phases[2]).toBeInstanceOf(CheckInterruptPhase);
    expect(phases[3]).toBeInstanceOf(RecoveryPhase);
    expect(phases[4]).toBeInstanceOf(PostProcessPhase);
  });

  it('blockingLimit配置 → BlockingLimitPhase插入CallModelPhase之前', () => {
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      compressConfig: {
        ...compressConfig,
        blockingLimit: { reserveTokens: 5000 }
      }
    };

    const phases = buildRuntimePhases(config);

    // Compress, BlockingLimit, CallModel, CheckInterrupt, PostProcess
    expect(phases[0]).toBeInstanceOf(CompressPhase);
    expect(phases[1]).toBeInstanceOf(BlockingLimitPhase);
    expect(phases[2]).toBeInstanceOf(CallModelPhase);
  });

  it('recoveryConfig但无compressConfig → 不插入RecoveryPhase（需要pipeline）', () => {
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      fsProvider: mockFsProvider,
      recoveryConfig: {}
    };

    const phases = buildRuntimePhases(config);

    // 无pipeline → PreProcess, CallModel, CheckInterrupt, PostProcess (无Recovery)
    expect(phases.length).toBe(4);
    expect(phases[0]).toBeInstanceOf(PreProcessPhase);
    expect(phases.some(p => p instanceof RecoveryPhase)).toBe(false);
  });
});
