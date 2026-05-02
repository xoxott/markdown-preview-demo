/** RuntimeSession — 集成会话，连接 P1 AgentLoop + P7 Store<T> 状态管理 + 多轮消息历史 */

import type { AgentEvent, AgentMessage } from '@suga/ai-agent-loop';
import { type Store, createStore } from '@suga/ai-state';
import type { RuntimeConfig, RuntimeSessionState } from '../types/config';
import { createRuntimeAgentLoop } from '../factory/createRuntimeAgentLoop';

/**
 * RuntimeSession — P10+P34 集成会话
 *
 * 连接 P1 AgentLoop + P7 Store<T> 状态管理 + 多轮消息历史：
 *
 * - sendMessage → createRuntimeAgentLoop → queryLoop → Store.setState
 *
 *   - 携带历史消息实现多轮对话
 *   - loop_end后更新messageHistory + status='active'（允许后续sendMessage）
 * - pause → abort + Store 状态='paused'
 * - resume → 从messageHistory恢复 → 新queryLoop
 * - destroy → Store 状态='destroyed'
 * - getStore → 返回 Store<RuntimeSessionState> 供 React useAppState 订阅
 * - getMessages → 返回完整消息历史
 */
export class RuntimeSession {
  private readonly config: RuntimeConfig;
  private readonly store: Store<RuntimeSessionState>;
  private readonly sessionId: string;
  private currentAbortController: AbortController | undefined;
  /** 多轮对话消息历史 — 每次sendMessage后从loop_end.result.messages更新 */
  private messageHistory: AgentMessage[] = [];

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.sessionId = `runtime_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

    const loop = createRuntimeAgentLoop(this.config);

    const userMessage: AgentMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };

    // 携带历史消息实现多轮对话
    const allMessages: readonly AgentMessage[] = [...this.messageHistory, userMessage];

    for await (const event of loop.queryLoop(allMessages, this.currentAbortController.signal)) {
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
    const loop = createRuntimeAgentLoop(this.config);

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
