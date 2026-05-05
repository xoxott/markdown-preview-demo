/** P89: InMemory 会话持久化 — 内存存储实现（开发/测试用） */

import type { DeepImmutable } from '../immutable';
import type { ConversationStateDomain, SessionPersistenceProvider } from '../state/AppState';

/**
 * InMemory 会话持久化实现
 *
 * 使用 Map 存储会话状态，适用于开发和测试环境。 生产环境应使用 NodeFileSessionPersistence 或自定义实现。
 */
export class InMemorySessionPersistence implements SessionPersistenceProvider {
  private readonly sessions = new Map<string, DeepImmutable<ConversationStateDomain>>();

  async saveSession(
    sessionId: string,
    state: DeepImmutable<ConversationStateDomain>
  ): Promise<void> {
    this.sessions.set(sessionId, state);
  }

  async loadSession(
    sessionId: string
  ): Promise<DeepImmutable<ConversationStateDomain> | undefined> {
    return this.sessions.get(sessionId);
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async listSessions(): Promise<readonly string[]> {
    return [...this.sessions.keys()];
  }

  /** 清空所有会话（测试辅助） */
  clear(): void {
    this.sessions.clear();
  }

  /** 获取会话数量（测试辅助） */
  get size(): number {
    return this.sessions.size;
  }
}
