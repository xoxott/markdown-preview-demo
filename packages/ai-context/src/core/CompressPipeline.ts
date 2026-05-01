/** CompressPipeline — 压缩管线编排器 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type {
  CompressPipelineResult,
  CompressResult,
  CompressState,
  CompressStats
} from '../types/compressor';
import type { CompressConfig } from '../types/config';
import type { CompressDependencies } from '../types/injection';
import { DEFAULT_CONTEXT_WINDOW } from '../constants';
import { estimateTokensPrecise } from '../utils/tokenEstimate';
import { findLastAssistantTimestamp } from '../utils/messageHelpers';
import { createContentReplacementTracker } from './ContentReplacementState';
import { ToolResultBudgetLayer } from './ToolResultBudget';
import { SnipCompactLayer } from './SnipCompactLayer';
import { TimeBasedMicroCompactLayer } from './TimeBasedMicroCompact';
import { AutoCompactLayer } from './AutoCompact';
import { ReactiveCompactLayer } from './ReactiveCompact';
import { PTLRetryHandler } from './PTLRetryHandler';
import { PartialCompactLayer } from './PartialCompactLayer';

/** 创建初始 CompressState */
function createInitialCompressState(config: CompressConfig): CompressState {
  return {
    contentReplacement: createContentReplacementTracker(),
    autoCompactFailures: 0,
    lastAssistantTimestamp: null,
    currentTime: Date.now(),
    estimatedTokens: 0,
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    config
  };
}

/** 压缩管线编排器 */
export class CompressPipeline {
  private readonly budgetLayer: ToolResultBudgetLayer;
  private readonly snipCompactLayer: SnipCompactLayer;
  private readonly microCompactLayer: TimeBasedMicroCompactLayer;
  private readonly autoCompactLayer: AutoCompactLayer;
  private readonly partialCompactLayer: PartialCompactLayer;
  private readonly reactiveCompactLayer: ReactiveCompactLayer;
  private readonly deps: CompressDependencies;
  private state: CompressState;
  private frozen = false;

  constructor(config: CompressConfig, deps: CompressDependencies = {}) {
    this.deps = deps;
    this.state = createInitialCompressState(config);

    this.budgetLayer = new ToolResultBudgetLayer(
      config.budget?.maxResultSize,
      config.budget?.previewSize,
      deps.persistToolResult
    );

    this.snipCompactLayer = new SnipCompactLayer(config.snipCompact);

    this.microCompactLayer = new TimeBasedMicroCompactLayer(config.microCompact);

    const ptlRetryHandler = new PTLRetryHandler(config.ptlRetry, deps.isPTLError);
    const tokenEstimator = deps.tokenEstimator ?? estimateTokensPrecise;

    this.autoCompactLayer = new AutoCompactLayer(
      config.autoCompact,
      deps.callModelForSummary,
      tokenEstimator,
      ptlRetryHandler,
      config.attachmentRebuild
    );

    this.partialCompactLayer = new PartialCompactLayer(config.partialCompact);

    this.reactiveCompactLayer = new ReactiveCompactLayer(
      config.reactiveCompact,
      deps.callModelForSummary
    );
  }

  /** 执行管线（4层: Budget → SnipCompact → MicroCompact → AutoCompact） */
  async compress(
    messages: readonly AgentMessage[],
    skipAutoCompact?: boolean
  ): Promise<CompressPipelineResult> {
    this.updateState(messages);
    this.state.estimatedTokens =
      this.deps.tokenEstimator?.(messages) ?? estimateTokensPrecise(messages);

    let currentMessages = messages;
    let anyCompressed = false;
    const allStats: CompressStats[] = [];

    // Layer 1: ToolResultBudget
    const budgetResult = await this.budgetLayer.compress(currentMessages, this.state);
    currentMessages = budgetResult.messages;
    if (budgetResult.didCompress) anyCompressed = true;
    if (budgetResult.stats) allStats.push(budgetResult.stats);

    // 首次执行完 Budget 后冻结 ContentReplacementState
    if (!this.frozen) {
      this.state.contentReplacement.freeze();
      this.frozen = true;
    }

    // Layer 2: SnipCompact（裁剪旧 tool_result）
    const snipResult = await this.snipCompactLayer.compress(currentMessages, this.state);
    currentMessages = snipResult.messages;
    if (snipResult.didCompress) anyCompressed = true;
    if (snipResult.stats) allStats.push(snipResult.stats);

    // Layer 3: TimeBasedMicroCompact
    const microResult = await this.microCompactLayer.compress(currentMessages, this.state);
    currentMessages = microResult.messages;
    currentMessages = microResult.messages;
    if (microResult.didCompress) anyCompressed = true;
    if (microResult.stats) allStats.push(microResult.stats);

    // Layer 4: AutoCompact（collapseInProgress 时跳过，与 ContextCollapse 互斥）
    if (!skipAutoCompact) {
      const autoResult = await this.autoCompactLayer.compress(currentMessages, this.state);
      currentMessages = autoResult.messages;
      if (autoResult.didCompress) anyCompressed = true;
      if (autoResult.stats) allStats.push(autoResult.stats);
    }

    // Layer 5: PartialCompact（AutoCompact 熔断时的保底 fallback）
    const partialResult = await this.partialCompactLayer.compress(currentMessages, this.state);
    currentMessages = partialResult.messages;
    if (partialResult.didCompress) anyCompressed = true;
    if (partialResult.stats) allStats.push(partialResult.stats);

    return { messages: currentMessages, didCompress: anyCompressed, stats: allStats };
  }

  /** 413 紧急压缩（手动触发） */
  async reactiveCompact(messages: readonly AgentMessage[]): Promise<CompressResult> {
    return this.reactiveCompactLayer.compress(messages, this.state);
  }

  /** 更新状态（时间戳等） */
  updateState(messages: readonly AgentMessage[]): void {
    this.state.lastAssistantTimestamp = findLastAssistantTimestamp(messages);
    this.state.currentTime = Date.now();
  }

  /** 获取当前状态（用于调试） */
  getState(): CompressState {
    return this.state;
  }
}
