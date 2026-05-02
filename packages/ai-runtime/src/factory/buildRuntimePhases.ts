/** buildRuntimePhases — 根据 RuntimeConfig 构建完整 Phase 链（含 RecoveryPhase + BlockingLimitPhase） */

import type { LoopPhase } from '@suga/ai-agent-loop';
import {
  CallModelPhase,
  CheckInterruptPhase,
  ExecuteToolsPhase,
  ParallelScheduler,
  PostProcessPhase,
  PreProcessPhase
} from '@suga/ai-agent-loop';
import { HookAfterToolPhase, HookBeforeToolPhase, HookStopPhase } from '@suga/ai-hooks';
import { BlockingLimitPhase, CompressPhase, CompressPipeline } from '@suga/ai-context';
import { RecoveryPhase } from '@suga/ai-recovery';
import {
  CoordinatorDispatchPhase,
  DefaultPhaseStrategy,
  InMemoryMailbox,
  TaskManager
} from '@suga/ai-coordinator';
import { SubagentDispatchPhase } from '@suga/ai-subagent';
import { ToolExecutor } from '@suga/ai-tool-core';
import type { RuntimeConfig } from '../types/config';
import { DEFAULT_RUNTIME_MAX_TURNS, DEFAULT_RUNTIME_TOOL_TIMEOUT } from '../constants';
import { buildEffectiveToolRegistry } from './buildEffectiveToolRegistry';
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
export function buildRuntimePhases(config: RuntimeConfig): LoopPhase[] {
  const maxTurns = config.maxTurns ?? DEFAULT_RUNTIME_MAX_TURNS;
  const toolTimeout = config.toolTimeout ?? DEFAULT_RUNTIME_TOOL_TIMEOUT;

  // 构建有效 ToolRegistry（合并 SkillTool）
  const effectiveRegistry = buildEffectiveToolRegistry(config);

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

  // --- Phase 1: 前处理 ---
  // P8 CompressPhase 替换 PreProcessPhase（如果提供压缩配置）
  if (pipeline) {
    phases.push(new CompressPhase(pipeline));
  } else {
    phases.push(new PreProcessPhase());
  }

  // --- Phase 2: BlockingLimit 预拦截 (需要 pipeline) ---
  // compressConfig.blockingLimit 或默认配置 → 在 CallModelPhase 前拦截超限请求
  if (pipeline && config.compressConfig?.blockingLimit) {
    phases.push(new BlockingLimitPhase(pipeline, config.compressConfig.blockingLimit));
  }

  // --- Phase 3: CallModelPhase (P1, 增强版含错误分类) ---
  phases.push(new CallModelPhase(config.provider, toolDefs));

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
    const scheduler = config.scheduler ?? new ParallelScheduler();
    phases.push(
      new ExecuteToolsPhase(scheduler, new ToolExecutor(), effectiveRegistry, toolTimeout)
    );
  } else if (config.toolRegistry) {
    const scheduler = config.scheduler ?? new ParallelScheduler();
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

  // --- Phase 12: P4 HookStop (可选) ---
  if (config.hookRegistry) {
    phases.push(new HookStopPhase(config.hookRegistry));
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
