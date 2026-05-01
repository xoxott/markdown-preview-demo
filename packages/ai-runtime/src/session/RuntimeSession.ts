/** RuntimeSession — 集成会话，连接 P1 AgentLoop + P7 Store<T> 状态管理 */

import type { AgentEvent, AgentMessage } from '@suga/ai-agent-loop';
import { type Store, createStore } from '@suga/ai-state';
import type { RuntimeConfig, RuntimeSessionState } from '../types/config';
import { createRuntimeAgentLoop } from '../factory/createRuntimeAgentLoop';

/**
 * RuntimeSession — P10 集成会话
 *
 * 连接 P1 AgentLoop + P7 Store<T> 状态管理：
 *
 * - sendMessage → createRuntimeAgentLoop → queryLoop → Store.setState
 * - pause → abort + Store 状态='paused'
 * - destroy → Store 状态='destroyed'
 * - getStore → 返回 Store<RuntimeSessionState> 供 React useAppState 订阅
 */
export class RuntimeSession {
  private readonly config: RuntimeConfig;
  private readonly store: Store<RuntimeSessionState>;
  private readonly sessionId: string;
  private currentAbortController: AbortController | undefined;

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.sessionId = `runtime_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.store = createStore<RuntimeSessionState>({
      sessionId: this.sessionId,
      status: 'active',
      turnCount: 0,
      lastEvent: null
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

  /** 发送消息 */
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

    for await (const event of loop.queryLoop([userMessage], this.currentAbortController.signal)) {
      this.store.setState(prev => ({
        ...prev,
        lastEvent: event
      }));

      yield event;

      if (event.type === 'loop_end') {
        const resultStatus = event.result.type === 'aborted' ? 'completed' : 'completed';
        this.store.setState(prev => ({
          ...prev,
          status: this.store.getState().status === 'paused' ? 'paused' : resultStatus
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

  /** 销毁会话 */
  async destroy(): Promise<void> {
    this.store.setState(prev => ({ ...prev, status: 'destroyed' }));
  }
}
