/** CompressPipeline — 压缩管线编排器 */

import type { AgentMessage } from '@suga/ai-agent-loop';
import type { CompressPipelineResult, CompressState, CompressResult, CompressStats } from '../types/compressor';
import type { CompressConfig } from '../types/config';
import type { CompressDependencies } from '../types/injection';
import { DEFAULT_CONTEXT_WINDOW } from '../constants';
import { createContentReplacementTracker } from './ContentReplacementState';
import { ToolResultBudgetLayer } from './ToolResultBudget';
import { TimeBasedMicroCompactLayer } from './TimeBasedMicroCompact';
import { AutoCompactLayer } from './AutoCompact';
import { ReactiveCompactLayer } from './ReactiveCompact';
import { estimateTokens } from '../utils/tokenEstimate';
import { findLastAssistantTimestamp } from '../utils/messageHelpers';

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
  private readonly microCompactLayer: TimeBasedMicroCompactLayer;
  private readonly autoCompactLayer: AutoCompactLayer;
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

    this.microCompactLayer = new TimeBasedMicroCompactLayer(config.microCompact);

    this.autoCompactLayer = new AutoCompactLayer(config.autoCompact, deps.callModelForSummary);

    this.reactiveCompactLayer = new ReactiveCompactLayer(config.reactiveCompact, deps.callModelForSummary);
  }

  /** 执行管线（前3层: Budget → MicroCompact → AutoCompact） */
  async compress(messages: readonly AgentMessage[]): Promise<CompressPipelineResult> {
    this.updateState(messages);
    this.state.estimatedTokens = this.deps.tokenEstimator?.(messages) ?? estimateTokens(messages);

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

    // Layer 2: TimeBasedMicroCompact
    const microResult = await this.microCompactLayer.compress(currentMessages, this.state);
    currentMessages = microResult.messages;
    if (microResult.didCompress) anyCompressed = true;
    if (microResult.stats) allStats.push(microResult.stats);

    // Layer 3: AutoCompact
    const autoResult = await this.autoCompactLayer.compress(currentMessages, this.state);
    currentMessages = autoResult.messages;
    if (autoResult.didCompress) anyCompressed = true;
    if (autoResult.stats) allStats.push(autoResult.stats);

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