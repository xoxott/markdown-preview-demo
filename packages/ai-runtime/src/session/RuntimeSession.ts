/** RuntimeSession — 集成会话，连接 P1 AgentLoop + P7 Store<T> 状态管理 + 多轮消息历史 */

import type { AgentEvent, AgentMessage, SystemPrompt } from '@suga/ai-agent-loop';
import { CostCalculator } from '@suga/ai-tool-adapter';
import type { LLMUsageInfo } from '@suga/ai-tool-adapter';
import { type Store, createStore } from '@suga/ai-state';
import type { RuntimeConfig, RuntimeSessionState } from '../types/config';
import type { QueryTurnState } from '../types/query-state';
import { createInitialQueryTurnState } from '../types/query-state';
import { createRuntimeAgentLoop } from '../factory/createRuntimeAgentLoop';

/**
 * RuntimeSession — P10+P34 集成会话
 *
 * 连接 P1 AgentLoop + P7 Store<T> 状态管理 + 多轮消息历史：
 *
 * - sendMessage → createRuntimeAgentLoop → queryLoop → Store.setState
 * - G14: maxBudgetUsd → 每轮追踪累计成本，超限自动终止
 */
export class RuntimeSession {
  private readonly config: RuntimeConfig;
  private readonly systemPrompt?: SystemPrompt;
  private readonly store: Store<RuntimeSessionState>;
  private readonly sessionId: string;
  private currentAbortController: AbortController | undefined;
  /** 多轮对话消息历史 — 每次sendMessage后从loop_end.result.messages更新 */
  private messageHistory: AgentMessage[] = [];
  /** G14: 累计成本追踪 */
  private accumulatedCostUsd = 0;
  /** G14: CostCalculator 实例 */
  private readonly costCalculator: CostCalculator;
  /** N1: QueryEngine turn 间持久状态 */
  private turnState: QueryTurnState = createInitialQueryTurnState();

  constructor(config: RuntimeConfig, systemPrompt?: SystemPrompt) {
    this.config = config;
    this.systemPrompt = systemPrompt;
    this.sessionId = `runtime_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.costCalculator = new CostCalculator(config.costConfig);

    this.store = createStore<RuntimeSessionState>({
      sessionId: this.sessionId,
      status: 'active',
      turnCount: 0,
      lastEvent: null,
      messageCount: 0
    });
  }

  /** 获取响应式状态容器 */
  getStore(): Store<RuntimeSessionState> {
    return this.store;
  }

  /** 获取 sessionId */
  getSessionId(): string {
    return this.sessionId;
  }

  /** 获取当前状态快照 */
  getStatus(): RuntimeSessionState['status'] {
    return this.store.getState().status;
  }

  /** 获取完整消息历史 */
  getMessages(): readonly AgentMessage[] {
    return this.messageHistory;
  }

  /** G14: 获取累计成本 */
  getAccumulatedCostUsd(): number {
    return this.accumulatedCostUsd;
  }

  /** N1: 获取 turn 间持久状态 */
  getTurnState(): QueryTurnState {
    return this.turnState;
  }

  /** N1: 更新 turn 间持久状态 */
  setTurnState(state: QueryTurnState): void {
    this.turnState = state;
  }

  /** 发送消息（支持多轮对话） */
  async *sendMessage(content: string, signal?: AbortSignal): AsyncGenerator<AgentEvent> {
    const currentStatus = this.store.getState().status;
    if (currentStatus === 'destroyed') {
      throw new Error(`RuntimeSession ${this.sessionId} 已销毁，无法发送消息`);
    }
    if (currentStatus === 'paused') {
      throw new Error(`RuntimeSession ${this.sessionId} 已暂停，请使用 resume`);
    }

    this.currentAbortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => this.currentAbortController!.abort(), { once: true });
    }

    const loop = createRuntimeAgentLoop(this.config, this.systemPrompt);

    const userMessage: AgentMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };

    // 携带历史消息实现多轮对话
    const allMessages: readonly AgentMessage[] = [...this.messageHistory, userMessage];

    for await (const event of loop.queryLoop(allMessages, this.currentAbortController.signal)) {
      // G14: 预算追踪 — 每轮 usage 事件中计算成本
      if (event.type === 'loop_end' && event.result.usage) {
        const costInfo = this.calculateCost(event.result.usage);
        this.accumulatedCostUsd += costInfo.totalCostUsd;

        // 预算超限 → 产出 budget_exceeded 事件并终止
        const maxBudget = this.config.maxBudgetUsd;
        if (maxBudget !== undefined && this.accumulatedCostUsd >= maxBudget) {
          yield {
            type: 'budget_exceeded',
            totalCostUsd: this.accumulatedCostUsd,
            maxBudgetUsd: maxBudget
          };
          // 中断循环
          this.currentAbortController.abort();
          this.store.setState(prev => ({
            ...prev,
            lastEvent: event,
            status: 'active',
            messageCount: this.messageHistory.length
          }));
          return;
        }
      }

      this.store.setState(prev => ({
        ...prev,
        lastEvent: event
      }));

      yield event;

      if (event.type === 'loop_end') {
        // 更新消息历史（完整对话记录）
        this.messageHistory = [...event.result.messages];
        this.store.setState(prev => ({
          ...prev,
          status: 'active',
          messageCount: this.messageHistory.length
        }));
      }
    }
  }

  /**
   * G14: 计算单轮 LLM 调用成本
   *
   * 基于 usage token 数和 costConfig 的定价计算 USD 成本。 无 costConfig 时使用估算默认值。
   */
  private calculateCost(usage: LLMUsageInfo): {
    totalCostUsd: number;
    inputCostUsd: number;
    outputCostUsd: number;
  } {
    const costInfo = this.costCalculator.calculate(
      {
        totalInputTokens: usage.inputTokens,
        totalOutputTokens: usage.outputTokens,
        totalCacheCreationTokens: usage.cacheCreationInputTokens ?? 0,
        totalCacheReadTokens: usage.cacheReadInputTokens ?? 0,
        totalCacheCreationEphemeralTokens: 0,
        apiCallCount: 1
      },
      undefined
    ); // CostCalculator 使用 defaultModel

    return {
      totalCostUsd: costInfo.totalCost,
      inputCostUsd: costInfo.inputCost,
      outputCostUsd: costInfo.outputCost
    };
  }

  /** 暂停会话 */
  pause(): void {
    const currentStatus = this.store.getState().status;
    if (currentStatus !== 'active') {
      throw new Error(`RuntimeSession ${this.sessionId} 当前状态 ${currentStatus}，无法暂停`);
    }

    this.store.setState(prev => ({ ...prev, status: 'paused' }));
    this.currentAbortController?.abort();
  }

  /** 恢复会话（从暂停状态恢复，携带历史消息重新开始） */
  async *resume(signal?: AbortSignal): AsyncGenerator<AgentEvent> {
    const currentStatus = this.store.getState().status;
    if (currentStatus !== 'paused') {
      throw new Error(`RuntimeSession ${this.sessionId} 当前状态 ${currentStatus}，无法恢复`);
    }

    this.currentAbortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => this.currentAbortController!.abort(), { once: true });
    }

    this.store.setState(prev => ({ ...prev, status: 'active' }));

    // 从历史消息恢复 — 创建新loop并传入历史消息
    const loop = createRuntimeAgentLoop(this.config, this.systemPrompt);

    for await (const event of loop.queryLoop(
      this.messageHistory,
      this.currentAbortController.signal
    )) {
      this.store.setState(prev => ({
        ...prev,
        lastEvent: event
      }));

      yield event;

      if (event.type === 'loop_end') {
        this.messageHistory = [...event.result.messages];
        this.store.setState(prev => ({
          ...prev,
          status: 'active',
          messageCount: this.messageHistory.length
        }));
      }
    }
  }

  /** 销毁会话 */
  async destroy(): Promise<void> {
    this.store.setState(prev => ({ ...prev, status: 'destroyed' }));
  }
}
