/** 存储适配器接口（Storage Adapter） 可扩展的持久化存储抽象 */

import type { SerializedSession } from './serialized';

/**
 * 存储适配器接口
 *
 * 默认实现为 InMemoryStorageAdapter，可扩展：
 *
 * - LocalStorageAdapter（浏览器 localStorage）
 * - IndexedDBAdapter（浏览器 IndexedDB）
 * - RedisAdapter（服务端 Redis）
 *
 * @example
 *   class MyStorage implements StorageAdapter {
 *   async save(id, data) { ... }
 *   async load(id) { ... }
 *   async remove(id) { ... }
 *   async list() { ... }
 *   }
 */
export interface StorageAdapter {
  /** 保存序列化会话 */
  save(sessionId: string, data: SerializedSession): Promise<void>;
  /** 加载序列化会话（不存在返回 null） */
  load(sessionId: string): Promise<SerializedSession | null>;
  /** 删除会话 */
  remove(sessionId: string): Promise<void>;
  /** 列出所有会话 ID */
  list(): Promise<string[]>;
}
