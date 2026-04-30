/** SessionManager — 会话管理器，创建、查找、序列化/反序列化 */

import { AnthropicAdapter } from '@suga/ai-tool-adapter';
import { ToolRegistry } from '@suga/ai-tool-core';
import type { AgentState } from '@suga/ai-agent-loop';
import { createAgentToolUseContext } from '@suga/ai-agent-loop';
import type { SessionConfig, SessionInfo } from '../types/session';
import type { SerializedSession } from '../types/serialized';
import type { StorageAdapter } from '../types/storage';
import { InMemoryStorageAdapter } from '../storage/InMemoryStorageAdapter';
import { deserializeAgentState } from '../serialize/Serializer';
import { Session } from './Session';

/**
 * SessionManager 会话管理器
 *
 * 负责会话的创建、查找、序列化/反序列化。 内部维护 Map<sessionId, Session> 缓存。
 */
export class SessionManager {
  private readonly sessions = new Map<string, Session>();
  private readonly storage: StorageAdapter;

  constructor(storage?: StorageAdapter) {
    this.storage = storage ?? new InMemoryStorageAdapter();
  }

  /** 创建新会话 */
  create(config: SessionConfig): Session {
    // 构建 Provider（默认 AnthropicAdapter）
    const providerFactory = config.providerFactory ?? (cfg => new AnthropicAdapter(cfg));
    const provider = providerFactory(config.providerConfig);

    // 构建 ToolRegistry（优先使用传入的，否则使用 factory）
    const fullConfig: SessionConfig = {
      ...config,
      storage: config.storage ?? this.storage,
      toolRegistry:
        config.toolRegistry ?? (config.registryFactory ? config.registryFactory() : undefined)
    };

    const session = new Session(fullConfig, provider);
    this.sessions.set(session.sessionId, session);

    return session;
  }

  /** 获取会话实例 */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  /** 暂停会话 */
  pause(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }
    session.pause();
  }

  /** 销毁会话 */
  async destroy(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }
    await session.destroy();
    this.sessions.delete(sessionId);
  }

  /** 序列化会话 */
  serialize(sessionId: string): SerializedSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }
    return session.serialize();
  }

  /** 反序列化会话 — 从 SerializedSession 恢复 Session 实例 */
  async deserialize(data: SerializedSession): Promise<Session> {
    // 检查是否已有缓存的 Session
    const existing = this.sessions.get(data.sessionId);
    if (existing) {
      return existing;
    }

    // 从存储中加载，确保数据一致
    const stored = await this.storage.load(data.sessionId);
    const sessionData = stored ?? data;

    // 构建配置
    const config: SessionConfig = {
      providerConfig: sessionData.providerConfig,
      maxTurns: sessionData.maxTurns,
      toolTimeout: sessionData.toolTimeout,
      storage: this.storage
    };

    // 重建 Provider
    const providerFactory = config.providerFactory ?? (cfg => new AnthropicAdapter(cfg));
    const provider = providerFactory(sessionData.providerConfig);

    // 如果状态是 paused，需要构建 pausedState 以便 resume
    let pausedState: AgentState | undefined;
    if (sessionData.status === 'paused') {
      const partialState = deserializeAgentState(sessionData.state);
      pausedState = {
        ...partialState,
        toolUseContext: createAgentToolUseContext(
          partialState.sessionId,
          partialState.turnCount,
          new ToolRegistry(),
          new AbortController()
        )
      };
    }

    // 使用静态工厂方法，在类内部合法设置 private 字段
    const session = Session.fromSerialized(sessionData, config, provider, pausedState);

    this.sessions.set(session.sessionId, session);
    return session;
  }

  /** 列出所有会话信息 */
  listSessions(): SessionInfo[] {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      status: session.getStatus(),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      turnCount: session.getPausedState()?.turnCount ?? 0
    }));
  }
}
