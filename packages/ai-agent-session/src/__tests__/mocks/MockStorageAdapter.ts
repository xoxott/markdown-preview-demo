/** Mock StorageAdapter — P2 会话层测试用可控存储 */

import type { StorageAdapter } from '../../types/storage';
import type { SerializedSession } from '../../types/serialized';

/**
 * Mock StorageAdapter
 *
 * 内部使用 Map，提供 save/load/remove/list 的可控实现。 支持设置 save 抛出错误以测试异常场景。
 */
export class MockStorageAdapter implements StorageAdapter {
  private store = new Map<string, SerializedSession>();
  private shouldFailOnSave = false;
  private saveError: Error = new Error('Mock storage save error');
  private saveCount = 0;
  private loadCount = 0;

  /** 设置 save 抛出错误 */
  setShouldFailOnSave(shouldFail: boolean, error?: Error): void {
    this.shouldFailOnSave = shouldFail;
    if (error) this.saveError = error;
  }

  /** 获取 save 调用次数 */
  getSaveCount(): number {
    return this.saveCount;
  }

  /** 获取 load 调用次数 */
  getLoadCount(): number {
    return this.loadCount;
  }

  async save(sessionId: string, data: SerializedSession): Promise<void> {
    this.saveCount++;
    if (this.shouldFailOnSave) {
      throw this.saveError;
    }
    this.store.set(sessionId, data);
  }

  async load(sessionId: string): Promise<SerializedSession | null> {
    this.loadCount++;
    return this.store.get(sessionId) ?? null;
  }

  async remove(sessionId: string): Promise<void> {
    this.store.delete(sessionId);
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}
