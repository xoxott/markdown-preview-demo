/** InMemoryStorageAdapter 测试 — 内存存储基本 CRUD */

import { describe, expect, it } from 'vitest';
import { InMemoryStorageAdapter } from '../storage/InMemoryStorageAdapter';
import type { SerializedSession } from '../types/serialized';

/** 辅助：创建测试用的 SerializedSession */

/** 辅助：创建测试用的 SerializedSession */
function createTestSession(id: string): SerializedSession {
  return {
    sessionId: id,
    providerConfig: {
      baseURL: 'https://api.anthropic.com',
      apiKey: 'test-key',
      model: 'claude-3-haiku'
    },
    maxTurns: 10,
    toolTimeout: 30000,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    state: {
      sessionId: id,
      turnCount: 0,
      messages: [],
      transition: { type: 'next_turn' }
    }
  };
}

describe('InMemoryStorageAdapter', () => {
  it('save + load → 保存后可加载', async () => {
    const adapter = new InMemoryStorageAdapter();
    const session = createTestSession('s1');

    await adapter.save('s1', session);
    const loaded = await adapter.load('s1');

    expect(loaded).toEqual(session);
  });

  it('load 不存在的 ID → null', async () => {
    const adapter = new InMemoryStorageAdapter();
    const loaded = await adapter.load('nonexistent');

    expect(loaded).toBeNull();
  });

  it('remove → 删除后 load 返回 null', async () => {
    const adapter = new InMemoryStorageAdapter();
    const session = createTestSession('s2');

    await adapter.save('s2', session);
    await adapter.remove('s2');
    const loaded = await adapter.load('s2');

    expect(loaded).toBeNull();
  });

  it('list → 返回所有已保存的 ID', async () => {
    const adapter = new InMemoryStorageAdapter();

    await adapter.save('s1', createTestSession('s1'));
    await adapter.save('s2', createTestSession('s2'));
    await adapter.save('s3', createTestSession('s3'));

    const ids = await adapter.list();
    expect(ids).toHaveLength(3);
    expect(ids).toContain('s1');
    expect(ids).toContain('s2');
    expect(ids).toContain('s3');
  });

  it('save 同一 ID → 覆盖旧数据', async () => {
    const adapter = new InMemoryStorageAdapter();

    await adapter.save('s1', createTestSession('s1'));
    const updated: SerializedSession = {
      ...createTestSession('s1'),
      state: { ...createTestSession('s1').state, turnCount: 5 }
    };
    await adapter.save('s1', updated);

    const loaded = await adapter.load('s1');
    expect(loaded!.state.turnCount).toBe(5);
  });

  it('remove 不存在的 ID → 无副作用', async () => {
    const adapter = new InMemoryStorageAdapter();
    await adapter.save('s1', createTestSession('s1'));

    await adapter.remove('nonexistent');
    const ids = await adapter.list();
    expect(ids).toHaveLength(1);
  });
});
