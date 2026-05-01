/** buildRuntimePhases — 根据 RuntimeConfig 构建完整 Phase 链 */

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
import { CompressPhase, CompressPipeline } from '@suga/ai-context';
import {
  CoordinatorDispatchPhase,
  DefaultPhaseStrategy,
  InMemoryMailbox,
  TaskManager
} from '@suga/ai-coordinator';
import { ToolExecutor } from '@suga/ai-tool-core';
import type { RuntimeConfig } from '../types/config';
import { DEFAULT_RUNTIME_MAX_TURNS, DEFAULT_RUNTIME_TOOL_TIMEOUT } from '../constants';
import { buildEffectiveToolRegistry } from './buildEffectiveToolRegistry';

/**
 * 根据 RuntimeConfig 构建 Phase 链
 *
 * Phase 链完整顺序（全启用时）：
 *
 * CompressPhase(P8) | PreProcessPhase(P1) → CallModelPhase(P1) → CheckInterruptPhase(P1) →
 * CoordinatorDispatchPhase(P9) → HookBeforeToolPhase(P4) → ExecuteToolsPhase(P1) →
 * HookAfterToolPhase(P4) → PostProcessPhase(P1) → HookStopPhase(P4)
 *
 * @param config RuntimeConfig
 * @returns LoopPhase[] 完整 Phase 铱
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

  const phases: LoopPhase[] = [];

  // --- Phase 1: 前处理 ---
  // P8 CompressPhase 替换 PreProcessPhase（如果提供压缩配置）
  if (config.compressConfig) {
    const pipeline = new CompressPipeline(config.compressConfig, config.compressDeps ?? {});
    phases.push(new CompressPhase(pipeline));
  } else {
    phases.push(new PreProcessPhase());
  }

  // --- Phase 2: CallModel ---
  phases.push(new CallModelPhase(config.provider, toolDefs));

  // --- Phase 3: CheckInterrupt ---
  phases.push(new CheckInterruptPhase());

  // --- Phase 4: P9 CoordinatorDispatch (可选) ---
  if (config.coordinatorRegistry) {
    const mailbox = config.coordinatorMailbox ?? new InMemoryMailbox();
    const taskManager = config.coordinatorTaskManager ?? new TaskManager();
    const strategy = config.coordinatorStrategy ?? new DefaultPhaseStrategy();
    phases.push(
      new CoordinatorDispatchPhase(config.coordinatorRegistry, mailbox, taskManager, strategy)
    );
  }

  // --- Phase 5: P4 HookBeforeTool (可选) ---
  if (config.hookRegistry) {
    phases.push(new HookBeforeToolPhase(config.hookRegistry));
  }

  // --- Phase 6: ExecuteTools (条件性) ---
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

  // --- Phase 7: P4 HookAfterTool (可选) ---
  if (config.hookRegistry) {
    phases.push(new HookAfterToolPhase(config.hookRegistry));
  }

  // --- Phase 8: PostProcess ---
  phases.push(new PostProcessPhase(maxTurns));

  // --- Phase 9: P4 HookStop (可选) ---
  if (config.hookRegistry) {
    phases.push(new HookStopPhase(config.hookRegistry));
  }

  return phases;
}
