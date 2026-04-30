import { describe, it, expect } from 'vitest';
import { buildRuntimePhases } from '../factory/buildRuntimePhases';
import { buildEffectiveToolRegistry } from '../factory/buildEffectiveToolRegistry';
import type { RuntimeConfig } from '../types/config';
import { ToolRegistry } from '@suga/ai-tool-core';
import { HookRegistry } from '@suga/ai-hooks';
import { SkillRegistry } from '@suga/ai-skill';
import { CompressPhase } from '@suga/ai-context';
import { CoordinatorDispatchPhase } from '@suga/ai-coordinator';
import { CoordinatorRegistry } from '@suga/ai-coordinator';
import { HookBeforeToolPhase, HookAfterToolPhase, HookStopPhase } from '@suga/ai-hooks';
import {
  PreProcessPhase,
  CallModelPhase,
  CheckInterruptPhase,
  ExecuteToolsPhase,
  PostProcessPhase
} from '@suga/ai-agent-loop';
import { MockLLMProvider } from './mocks/MockLLMProvider';

/** 辅助：创建最小配置 */
function createMinimalConfig(): RuntimeConfig {
  return { provider: new MockLLMProvider() };
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
      compressConfig: {
        budget: { maxResultSize: 150_000, previewSize: 2_000 },
        microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
        autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
      }
    };

    const phases = buildRuntimePhases(config);

    expect(phases[0]).toBeInstanceOf(CompressPhase);
    expect(phases[1]).toBeInstanceOf(CallModelPhase);
  });

  it('带 hookRegistry → 插入 HookBeforeTool+HookAfterTool+HookStop', () => {
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      hookRegistry: new HookRegistry()
    };

    const phases = buildRuntimePhases(config);

    // PreProcess, CallModel, CheckInterrupt, HookBeforeTool, HookAfterTool, PostProcess, HookStop (无toolRegistry)
    expect(phases.length).toBe(7);
    expect(phases[3]).toBeInstanceOf(HookBeforeToolPhase);
    expect(phases[4]).toBeInstanceOf(HookAfterToolPhase);
    expect(phases[5]).toBeInstanceOf(PostProcessPhase);
    expect(phases[6]).toBeInstanceOf(HookStopPhase);
  });

  it('带 toolRegistry → 插入 ExecuteToolsPhase', () => {
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
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
      toolRegistry,
      skillRegistry
    });

    expect(effectiveRegistry).toBeDefined();
    // 应包含 SkillTool（名称为 'skill'）
    const allTools = effectiveRegistry!.getAll();
    expect(allTools.some(t => t.name === 'skill')).toBe(true);
  });

  it('全配置组合 → 完整 Phase 铱', () => {
    const provider = new MockLLMProvider();
    const hookRegistry = new HookRegistry();
    const toolRegistry = new ToolRegistry();
    const coordinatorRegistry = new CoordinatorRegistry();
    coordinatorRegistry.register({ agentType: 'researcher', whenToUse: '搜索' });

    const config: RuntimeConfig = {
      provider,
      hookRegistry,
      toolRegistry,
      compressConfig: {
        budget: { maxResultSize: 150_000, previewSize: 2_000 },
        microCompact: { gapThresholdMinutes: 60, compactableTools: ['Read'], keepRecent: 5 },
        autoCompact: { thresholdRatio: 0.93, maxConsecutiveFailures: 3, messagesToKeep: 4 }
      },
      coordinatorRegistry
    };

    const phases = buildRuntimePhases(config);

    // Compress, CallModel, CheckInterrupt, Coordinator, HookBeforeTool, ExecuteTools, HookAfterTool, PostProcess, HookStop
    expect(phases.length).toBe(9);
    expect(phases[0]).toBeInstanceOf(CompressPhase);
    expect(phases[3]).toBeInstanceOf(CoordinatorDispatchPhase);
    expect(phases[4]).toBeInstanceOf(HookBeforeToolPhase);
    expect(phases[5]).toBeInstanceOf(ExecuteToolsPhase);
    expect(phases[6]).toBeInstanceOf(HookAfterToolPhase);
    expect(phases[7]).toBeInstanceOf(PostProcessPhase);
    expect(phases[8]).toBeInstanceOf(HookStopPhase);
  });

  it('coordinatorRegistry 但无 mailbox → 自动创建 InMemoryMailbox', () => {
    const registry = new CoordinatorRegistry();
    registry.register({ agentType: 'researcher', whenToUse: '搜索' });

    // 只提供 registry，不提供 mailbox/taskManager/strategy
    const config: RuntimeConfig = {
      provider: new MockLLMProvider(),
      coordinatorRegistry: registry
    };

    const phases = buildRuntimePhases(config);

    // 应正常插入 CoordinatorDispatchPhase（使用默认值）
    expect(phases[3]).toBeInstanceOf(CoordinatorDispatchPhase);
  });
});
