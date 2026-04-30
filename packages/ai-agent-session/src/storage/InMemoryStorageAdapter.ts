/** 内存存储适配器 — 默认实现，适合测试和短生命周期场景 */

import type { StorageAdapter } from '../types/storage';
import type { SerializedSession } from '../types/serialized';

/**
 * 内存存储适配器
 *
 * 所有数据保存在进程内存中，会话结束后丢失。 适合测试场景和不需要持久化的短期会话。
 *
 * 生产环境应替换为 localStorage / IndexedDB / Redis 等持久化适配器。
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private readonly store = new Map<string, SerializedSession>();

  async save(sessionId: string, data: SerializedSession): Promise<void> {
    this.store.set(sessionId, data);
  }

  async load(sessionId: string): Promise<SerializedSession | null> {
    return this.store.get(sessionId) ?? null;
  }

  async remove(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}
