/** P46 测试 — SessionMetadataStore 元数据管理 */

import { beforeEach, describe, expect, it } from 'vitest';
import { SessionMetadataStore } from '../session/SessionMetadataStore';

describe('SessionMetadataStore', () => {
  let store: SessionMetadataStore;

  beforeEach(() => {
    store = new SessionMetadataStore();
  });

  it('register — 注册新会话元数据', () => {
    store.register('session_1', '你好');
    const meta = store.get('session_1');

    expect(meta).toBeDefined();
    expect(meta!.sessionId).toBe('session_1');
    expect(meta!.firstPrompt).toBe('你好');
    expect(meta!.createdAt).toBeGreaterThan(0);
  });

  it('rename — 更新标题', () => {
    store.register('session_1');
    store.rename('session_1', 'My Session');

    const meta = store.get('session_1');
    expect(meta!.title).toBe('My Session');
  });

  it('tag — 更新标签', () => {
    store.register('session_1');
    store.tag('session_1', 'important');

    const meta = store.get('session_1');
    expect(meta!.tag).toBe('important');
  });

  it('tag — 清除标签 (null)', () => {
    store.register('session_1');
    store.tag('session_1', 'important');
    store.tag('session_1', null);

    const meta = store.get('session_1');
    expect(meta!.tag).toBeNull();
  });

  it('list — 列出所有元数据（按 updatedAt 降序）', () => {
    store.register('session_1', 'hello');
    store.register('session_2', 'world');

    // 更新 session_1 的标题 → updatedAt 变大
    store.rename('session_1', 'Updated');

    const list = store.list();
    expect(list.length).toBe(2);
    // session_1 最后更新 → 排在前面
    expect(list[0].sessionId).toBe('session_1');
  });

  it('delete — 删除元数据', () => {
    store.register('session_1');
    store.delete('session_1');
    expect(store.get('session_1')).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it('size — 返回条目数量', () => {
    store.register('session_1');
    store.register('session_2');
    expect(store.size).toBe(2);
  });

  it('rename — 不存在的 session → throw', () => {
    expect(() => store.rename('nonexistent', 'title')).toThrow('Session metadata not found');
  });

  it('tag — 不存在的 session → throw', () => {
    expect(() => store.tag('nonexistent', 'tag')).toThrow('Session metadata not found');
  });
});
