/** buildRuntimePhases — 根据 RuntimeConfig 构建完整 Phase 链（含 RecoveryPhase + BlockingLimitPhase） */

import type { LoopPhase, SystemPrompt } from '@suga/ai-agent-loop';
import {
  CallModelPhase,
  CheckInterruptPhase,
  ExecuteToolsPhase,
  PostProcessPhase,
  PreProcessPhase
} from '@suga/ai-agent-loop';
import {
  HookAfterToolPhase,
  HookBeforeToolPhase,
  HookNotificationPhase,
  HookPostCompactPhase,
  HookPreCompactPhase,
  HookSessionEndPhase,
  HookSessionStartPhase,
  HookStopPhase,
  HookUserPromptPhase
} from '@suga/ai-hooks';
import { StreamingToolScheduler } from '@suga/ai-stream-executor';
import { BlockingLimitPhase, CompressPhase, CompressPipeline } from '@suga/ai-context';
import { RecoveryPhase } from '@suga/ai-recovery';
import {
  CoordinatorDispatchPhase,
  DefaultPhaseStrategy,
  InMemoryMailbox,
  TaskManager
} from '@suga/ai-coordinator';
import { SubagentDispatchPhase } from '@suga/ai-subagent';
import type { ToolRegistry } from '@suga/ai-tool-core';
import { ToolExecutor } from '@suga/ai-tool-core';
import type { RuntimeConfig } from '../types/config';
import { DEFAULT_RUNTIME_MAX_TURNS, DEFAULT_RUNTIME_TOOL_TIMEOUT } from '../constants';
import {
  type ToolSearchRegistryResult,
  buildEffectiveToolRegistry
} from './buildEffectiveToolRegistry';
import { createCallModelForSummary } from './createCallModelForSummary';

/**
 * 根据 RuntimeConfig 构建 Phase 链
 *
 * Phase 链完整顺序（全启用时）：
 *
 * CompressPhase(P8) | PreProcessPhase(P1) → BlockingLimitPhase(P8) → CallModelPhase(P1) →
 * CheckInterruptPhase(P1) → RecoveryPhase(P3) → CoordinatorDispatchPhase(P9) →
 * HookBeforeToolPhase(P4) → ExecuteToolsPhase(P1) → HookAfterToolPhase(P4) → PostProcessPhase(P1) →
 * HookStopPhase(P4)
 *
 * CompressPipeline 为共享实例，跨 CompressPhase/BlockingLimitPhase/RecoveryPhase 使用。
 *
 * @param config RuntimeConfig
 * @returns LoopPhase[] 完整 Phase 链
 */
export function buildRuntimePhases(
  config: RuntimeConfig,
  systemPrompt?: SystemPrompt
): LoopPhase[] {
  const maxTurns = config.maxTurns ?? DEFAULT_RUNTIME_MAX_TURNS;
  const toolTimeout = config.toolTimeout ?? DEFAULT_RUNTIME_TOOL_TIMEOUT;

  // 构建有效 ToolRegistry（合并 SkillTool + P99 Delta ToolSearch 分离）
  const effectiveResult = buildEffectiveToolRegistry(config);

  // P99: 从 ToolSearchRegistryResult 中提取 active registry
  let effectiveRegistry: ToolRegistry | undefined;

  if (effectiveResult && 'deferredTools' in effectiveResult) {
    // ToolSearchRegistryResult — delta 模式，取其中的 active registry
    const tsResult = effectiveResult as ToolSearchRegistryResult;
    effectiveRegistry = tsResult.registry;
  } else if (effectiveResult) {
    // 普通 ToolRegistry — standard 模式
    effectiveRegistry = effectiveResult as ToolRegistry;
  }

  // 计算工具定义
  const toolDefs = effectiveRegistry
    ? effectiveRegistry.getAll().map(t => config.provider.formatToolDefinition(t))
    : config.toolRegistry
      ? config.toolRegistry.getAll().map(t => config.provider.formatToolDefinition(t))
      : undefined;

  // 创建共享 CompressPipeline（跨 CompressPhase/BlockingLimitPhase/RecoveryPhase）
  const pipeline = config.compressConfig
    ? new CompressPipeline(
        config.compressConfig,
        mergeCompressDeps(config.compressDeps, config.provider)
      )
    : undefined;

  const phases: LoopPhase[] = [];

  // --- Phase 0: 生命周期 Hook (可选) ---
  if (config.hookRegistry) {
    phases.push(new HookSessionStartPhase(config.hookRegistry));
    phases.push(new HookUserPromptPhase(config.hookRegistry));
  }

  // --- Phase 1: 前处理 ---
  // P8 CompressPhase 替换 PreProcessPhase（如果提供压缩配置）
  if (config.hookRegistry) {
    phases.push(new HookPreCompactPhase(config.hookRegistry));
  }
  if (pipeline) {
    phases.push(new CompressPhase(pipeline));
    if (config.hookRegistry) {
      phases.push(new HookPostCompactPhase(config.hookRegistry));
    }
  } else {
    phases.push(new PreProcessPhase());
  }

  // --- Phase 2: BlockingLimit 预拦截 (需要 pipeline) ---
  // compressConfig.blockingLimit 或默认配置 → 在 CallModelPhase 前拦截超限请求
  if (pipeline && config.compressConfig?.blockingLimit) {
    phases.push(new BlockingLimitPhase(pipeline, config.compressConfig.blockingLimit));
  }

  // --- Phase 3: CallModelPhase (P1, 增强版含错误分类) ---
  phases.push(new CallModelPhase(config.provider, toolDefs, systemPrompt));

  // --- Phase 4: CheckInterruptPhase ---
  phases.push(new CheckInterruptPhase());

  // --- Phase 5: RecoveryPhase (P3, 需要 pipeline) ---
  if (pipeline && config.recoveryConfig) {
    phases.push(new RecoveryPhase(pipeline, config.recoveryConfig));
  }

  // --- Phase 6: P9 CoordinatorDispatch (可选) ---
  if (config.coordinatorRegistry) {
    const mailbox = config.coordinatorMailbox ?? new InMemoryMailbox();
    const taskManager = config.coordinatorTaskManager ?? new TaskManager();
    const strategy = config.coordinatorStrategy ?? new DefaultPhaseStrategy();
    const spawnProvider = config.spawnProvider;
    phases.push(
      new CoordinatorDispatchPhase(
        config.coordinatorRegistry,
        mailbox,
        taskManager,
        strategy,
        spawnProvider
      )
    );
  }

  // --- Phase 7: P10 SubagentDispatch (可选) ---
  if (config.subagentRegistry && config.subagentSpawner) {
    phases.push(new SubagentDispatchPhase(config.subagentRegistry, config.subagentSpawner));
  }

  // --- Phase 8: P4 HookBeforeTool (可选) ---
  if (config.hookRegistry) {
    phases.push(new HookBeforeToolPhase(config.hookRegistry));
  }

  // --- Phase 9: ExecuteTools (条件性) ---
  if (effectiveRegistry) {
    const scheduler = config.scheduler ?? new StreamingToolScheduler();
    phases.push(
      new ExecuteToolsPhase(scheduler, new ToolExecutor(), effectiveRegistry, toolTimeout)
    );
  } else if (config.toolRegistry) {
    const scheduler = config.scheduler ?? new StreamingToolScheduler();
    phases.push(
      new ExecuteToolsPhase(scheduler, new ToolExecutor(), config.toolRegistry, toolTimeout)
    );
  }

  // --- Phase 10: P4 HookAfterTool (可选) ---
  if (config.hookRegistry) {
    phases.push(new HookAfterToolPhase(config.hookRegistry));
  }

  // --- Phase 11: PostProcessPhase (P1, 增强版含恢复尊重) ---
  phases.push(new PostProcessPhase(maxTurns));

  // --- Phase 12: P4 HookStop + Notification + SessionEnd (可选) ---
  if (config.hookRegistry) {
    phases.push(new HookStopPhase(config.hookRegistry));
    phases.push(new HookNotificationPhase(config.hookRegistry));
    phases.push(new HookSessionEndPhase(config.hookRegistry));
  }

  return phases;
}

/**
 * 合并 CompressDependencies — 自动从 LLMProvider 创建 callModelForSummary
 *
 * 如果用户未提供 compressDeps.callModelForSummary， 自动通过 createCallModelForSummary(provider) 桥接。
 */
function mergeCompressDeps(
  userDeps: RuntimeConfig['compressDeps'],
  provider: RuntimeConfig['provider']
): NonNullable<RuntimeConfig['compressDeps']> {
  const callModelForSummary = userDeps?.callModelForSummary ?? createCallModelForSummary(provider);

  return {
    ...userDeps,
    callModelForSummary
  };
}
