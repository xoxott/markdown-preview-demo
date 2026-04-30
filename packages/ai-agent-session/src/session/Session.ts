/** Session — 单个会话实例，封装完整生命周期 */

import type { AgentEvent, AgentMessage, AgentState, LLMProvider } from '@suga/ai-agent-loop';
import { AgentLoop, createAgentToolUseContext } from '@suga/ai-agent-loop';
import { ToolRegistry } from '@suga/ai-tool-core';
import type { SessionConfig, SessionStatus } from '../types/session';
import type { SerializedSession } from '../types/serialized';
import type { StorageAdapter } from '../types/storage';
import { InMemoryStorageAdapter } from '../storage/InMemoryStorageAdapter';
import { buildSerializedSession } from '../serialize/Serializer';
import {
  DEFAULT_SESSION_ID_PREFIX,
  DEFAULT_SESSION_MAX_TURNS,
  DEFAULT_SESSION_TOOL_TIMEOUT
} from '../constants';

/**
 * Session 单个会话实例
 *
 * 生命周期：
 *
 * - sendMessage → 创建 AgentLoop → queryLoop → 流式产出事件
 * - pause → 中断循环 → 捕获状态快照 → status='paused'
 * - resume → 从 pausedState → AgentLoop.resumeLoop → 流式产出事件
 * - destroy → status='destroyed' → 从存储删除
 */
export class Session {
  readonly config: SessionConfig;

  private _sessionId: string;
  private _createdAt: number;
  private _updatedAt: number;
  private _status: SessionStatus = 'active';
  private provider: LLMProvider;
  private readonly registry: ToolRegistry;
  private storage: StorageAdapter;

  /** 当前循环的 AbortController（sendMessage/resume 时创建） */
  private currentAbortController: AbortController | undefined;

  /** 暂停后保存的状态快照 */
  private pausedState: AgentState | undefined;

  /** 外部读取 sessionId */
  get sessionId(): string {
    return this._sessionId;
  }
  /** 外部读取 createdAt */
  get createdAt(): number {
    return this._createdAt;
  }
  /** 外部读取 updatedAt */
  get updatedAt(): number {
    return this._updatedAt;
  }

  constructor(config: SessionConfig, provider: LLMProvider) {
    this._sessionId = `${DEFAULT_SESSION_ID_PREFIX}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.config = config;
    this._createdAt = Date.now();
    this._updatedAt = this._createdAt;
    this.provider = provider;
    // 始终持有 ToolRegistry 实例，消除 undefined fallback
    this.registry = config.toolRegistry ?? new ToolRegistry();
    this.storage = config.storage ?? new InMemoryStorageAdapter();
  }

  /**
   * 反序列化恢复工厂方法
   *
   * 仅 SessionManager 调用。在类内部合法设置 private/_ 前缀字段， 避免外部 (as any) 强制赋值。
   */
  static fromSerialized(
    data: SerializedSession,
    config: SessionConfig,
    provider: LLMProvider,
    pausedState?: AgentState
  ): Session {
    const session = new Session(config, provider);
    // 类内部可自由赋值 private 字段
    session._sessionId = data.sessionId;
    session._createdAt = data.createdAt;
    session._updatedAt = data.updatedAt;
    session._status = data.status as SessionStatus;
    session.pausedState = pausedState;
    return session;
  }

  /** 获取当前状态 */
  getStatus(): SessionStatus {
    return this._status;
  }

  /** 获取暂停状态快照 */
  getPausedState(): AgentState | undefined {
    return this.pausedState;
  }

  /**
   * 发送消息 — 创建 AgentLoop 并执行 queryLoop
   *
   * @param content 用户消息文本
   * @param signal 外部中断信号（可选）
   * @returns AsyncGenerator<AgentEvent>
   */
  async *sendMessage(content: string, signal?: AbortSignal): AsyncGenerator<AgentEvent> {
    if (this._status === 'destroyed') {
      throw new Error(`Session ${this.sessionId} 已销毁，无法发送消息`);
    }
    if (this._status === 'paused') {
      throw new Error(`Session ${this.sessionId} 已暂停，请使用 resume 恢复`);
    }

    this._status = 'active';
    this.currentAbortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => this.currentAbortController!.abort(), { once: true });
    }

    const userMessage: AgentMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };

    const loop = new AgentLoop({
      provider: this.provider,
      maxTurns: this.config.maxTurns ?? DEFAULT_SESSION_MAX_TURNS,
      toolRegistry: this.registry,
      toolTimeout: this.config.toolTimeout ?? DEFAULT_SESSION_TOOL_TIMEOUT
    });

    // 使用已有消息 + 新消息作为初始输入
    const messages = this.pausedState ? [...this.pausedState.messages, userMessage] : [userMessage];

    const generator = loop.queryLoop(messages, this.currentAbortController.signal);

    for await (const event of generator) {
      yield event;

      // loop_end 事件 → 更新状态
      if (event.type === 'loop_end') {
        this._updatedAt = Date.now();
        if (event.result.type === 'completed') {
          this._status = 'completed';
        } else if (event.result.type === 'aborted') {
          // pause() 先设置了 _status='paused'，保持；否则视为完成
          this._status = this._status === 'paused' ? 'paused' : 'completed';
        } else {
          this._status = 'completed';
        }
        await this.persistState(event.result.messages);
      }
    }
  }

  /**
   * 暂停会话 — 中断当前循环并保存状态快照
   *
   * 调用后当前 sendMessage 的 generator 将收到 aborted 事件。
   */
  pause(): void {
    if (this._status !== 'active') {
      throw new Error(`Session ${this.sessionId} 当前状态 ${this._status}，无法暂停`);
    }

    this._status = 'paused';
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
  }

  /**
   * 恢复会话 — 从暂停状态继续循环
   *
   * @param signal 外部中断信号（可选）
   * @returns AsyncGenerator<AgentEvent>
   */
  async *resume(signal?: AbortSignal): AsyncGenerator<AgentEvent> {
    if (this._status !== 'paused') {
      throw new Error(`Session ${this.sessionId} 当前状态 ${this._status}，无法恢复`);
    }
    if (!this.pausedState) {
      throw new Error(`Session ${this.sessionId} 无暂停状态快照，无法恢复`);
    }

    this._status = 'active';
    this.currentAbortController = new AbortController();
    if (signal) {
      signal.addEventListener('abort', () => this.currentAbortController!.abort(), { once: true });
    }

    // 重建 toolUseContext（旧的 AbortController 已失效）
    const resumedState: AgentState = {
      ...this.pausedState,
      toolUseContext: createAgentToolUseContext(
        this.pausedState.sessionId,
        this.pausedState.turnCount,
        this.registry,
        this.currentAbortController
      )
    };

    const loop = new AgentLoop({
      provider: this.provider,
      maxTurns: this.config.maxTurns ?? DEFAULT_SESSION_MAX_TURNS,
      toolRegistry: this.registry,
      toolTimeout: this.config.toolTimeout ?? DEFAULT_SESSION_TOOL_TIMEOUT
    });

    const generator = loop.resumeLoop(resumedState, this.currentAbortController.signal);

    for await (const event of generator) {
      yield event;

      if (event.type === 'loop_end') {
        this._updatedAt = Date.now();
        this._status = 'completed';
        await this.persistState(event.result.messages);
      }
    }
  }

  /** 销毁会话 — 设置状态并删除存储 */
  async destroy(): Promise<void> {
    this._status = 'destroyed';
    this._updatedAt = Date.now();
    await this.storage.remove(this.sessionId);
  }

  /** 序列化为 SerializedSession */
  serialize(): SerializedSession {
    if (!this.pausedState) {
      const emptyState: AgentState = {
        sessionId: this.sessionId,
        turnCount: 0,
        messages: [],
        transition: { type: 'next_turn' },
        toolUseContext: createAgentToolUseContext(
          this.sessionId,
          0,
          this.registry,
          new AbortController()
        )
      };

      return buildSerializedSession(
        emptyState,
        this.config,
        this._status,
        this.createdAt,
        this.updatedAt
      );
    }

    return buildSerializedSession(
      this.pausedState,
      this.config,
      this._status,
      this.createdAt,
      this.updatedAt
    );
  }

  /** 持久化当前状态到存储 */
  private async persistState(messages: readonly AgentMessage[]): Promise<void> {
    this.pausedState = {
      sessionId: this.sessionId,
      turnCount: messages.length,
      messages,
      transition: { type: 'next_turn' },
      toolUseContext: createAgentToolUseContext(
        this.sessionId,
        messages.length,
        this.registry,
        new AbortController()
      )
    };

    const serialized = this.serialize();
    await this.storage.save(this.sessionId, serialized);
  }
}
