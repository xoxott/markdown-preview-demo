/** P14 测试 — FileReadStateCache(去重缓存+LRU淘汰+mtime一致性) */

import { describe, expect, it } from 'vitest';
import {
  FileReadStateCache,
  FILE_UNCHANGED_STUB
} from '../utils/file-read-state-cache';
import type { FileReadCacheEntry } from '../utils/file-read-state-cache';

// ============================================================
// FileReadStateCache — 基本CRUD
// ============================================================

describe('FileReadStateCache — CRUD', () => {
  it('set+get → 返回设置的状态', () => {
    const cache = new FileReadStateCache();
    const state: FileReadCacheEntry = {
      content: 'hello world',
      timestamp: 1000,
      offset: 0,
      limit: undefined
    };
    cache.set('/test.txt', state);

    const result = cache.get('/test.txt');
    expect(result).toEqual(state);
  });

  it('无记录 → get返回undefined', () => {
    const cache = new FileReadStateCache();
    expect(cache.get('/nonexistent.txt')).toBeUndefined();
  });

  it('delete → 删除记录', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', {
      content: 'content',
      timestamp: 1000,
      offset: 0,
      limit: undefined
    });
    expect(cache.delete('/test.txt')).toBe(true);
    expect(cache.get('/test.txt')).toBeUndefined();
  });

  it('has → 检查记录是否存在', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', { content: 'x', timestamp: 1, offset: 0, limit: undefined });
    expect(cache.has('/test.txt')).toBe(true);
    expect(cache.has('/other.txt')).toBe(false);
  });

  it('size → 返回条目数', () => {
    const cache = new FileReadStateCache();
    expect(cache.size).toBe(0);
    cache.set('/a.txt', { content: 'a', timestamp: 1, offset: 0, limit: undefined });
    cache.set('/b.txt', { content: 'b', timestamp: 1, offset: 0, limit: undefined });
    expect(cache.size).toBe(2);
  });

  it('clear → 清空缓存', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', { content: 'x', timestamp: 1, offset: 0, limit: undefined });
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('/test.txt')).toBeUndefined();
  });

  it('set覆盖 → 更新已有记录', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', { content: 'old', timestamp: 1, offset: 0, limit: undefined });
    cache.set('/test.txt', { content: 'new', timestamp: 2, offset: 0, limit: undefined });

    const result = cache.get('/test.txt');
    expect(result?.content).toBe('new');
    expect(result?.timestamp).toBe(2);
  });
});

// ============================================================
// LRU淘汰策略
// ============================================================

describe('FileReadStateCache — LRU淘汰', () => {
  it('超过100条目 → 淘汰最早的', () => {
    const cache = new FileReadStateCache();
    // 填入101条记录
    for (let i = 0; i <= 100; i++) {
      cache.set(`/file${i}.txt`, {
        content: `content${i}`,
        timestamp: i,
        offset: 0,
        limit: undefined
      });
    }
    // 第0条应被淘汰
    expect(cache.has('/file0.txt')).toBe(false);
    // 第1条仍存在
    expect(cache.has('/file1.txt')).toBe(true);
    // 最后一条仍存在
    expect(cache.has('/file100.txt')).toBe(true);
    // size <= 100
    expect(cache.size).toBeLessThanOrEqual(100);
  });

  it('get刷新LRU → 访问后不被淘汰', () => {
    const cache = new FileReadStateCache();
    // 填入100条记录
    for (let i = 0; i < 100; i++) {
      cache.set(`/file${i}.txt`, {
        content: `c${i}`,
        timestamp: i,
        offset: 0,
        limit: undefined
      });
    }
    // 访问第0条 → 移到最近使用
    cache.get('/file0.txt');
    // 添加新条目 → 淘汰最早未使用的(第1条)
    cache.set('/new.txt', { content: 'new', timestamp: 100, offset: 0, limit: undefined });
    // 第0条不应被淘汰(因为刚访问)
    expect(cache.has('/file0.txt')).toBe(true);
  });
});

// ============================================================
// checkDedup — 去重检查
// ============================================================

describe('FileReadStateCache — checkDedup', () => {
  it('无缓存 → dedupHit=false', () => {
    const cache = new FileReadStateCache();
    const result = cache.checkDedup('/test.txt', 0, undefined, 1000);
    expect(result.dedupHit).toBe(false);
  });

  it('offset=undefined → 不去重(Edit/Write来源)', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', {
      content: 'content',
      timestamp: 1000,
      offset: undefined, // 来自Edit/Write
      limit: undefined
    });
    const result = cache.checkDedup('/test.txt', 0, undefined, 1000);
    expect(result.dedupHit).toBe(false);
  });

  it('isPartialView=true → 不去重', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', {
      content: 'auto-injected CLAUDE.md',
      timestamp: 1000,
      offset: 0,
      limit: undefined,
      isPartialView: true
    });
    const result = cache.checkDedup('/test.txt', 0, undefined, 1000);
    expect(result.dedupHit).toBe(false);
  });

  it('offset/limit不匹配 → 不去重', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', {
      content: 'content',
      timestamp: 1000,
      offset: 0,
      limit: 50
    });
    // 不同offset
    const result1 = cache.checkDedup('/test.txt', 10, 50, 1000);
    expect(result1.dedupHit).toBe(false);
    // 不同limit
    const result2 = cache.checkDedup('/test.txt', 0, 100, 1000);
    expect(result2.dedupHit).toBe(false);
  });

  it('mtime不一致 → 不去重(文件已修改)', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', {
      content: 'content',
      timestamp: 1000,
      offset: 0,
      limit: undefined
    });
    const result = cache.checkDedup('/test.txt', 0, undefined, 2000);
    expect(result.dedupHit).toBe(false);
  });

  it('完全匹配 → dedupHit=true + stub', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', {
      content: 'file content here',
      timestamp: 1000,
      offset: 0,
      limit: undefined
    });
    const result = cache.checkDedup('/test.txt', 0, undefined, 1000.4); // Math.floor(1000.4) = 1000
    expect(result.dedupHit).toBe(true);
    expect(result.stubMessage).toBe(FILE_UNCHANGED_STUB);
  });

  it('offset=10,limit=50匹配 → dedupHit=true', () => {
    const cache = new FileReadStateCache();
    cache.set('/test.txt', {
      content: 'partial content',
      timestamp: 500,
      offset: 10,
      limit: 50
    });
    const result = cache.checkDedup('/test.txt', 10, 50, 500);
    expect(result.dedupHit).toBe(true);
  });
});

// ============================================================
// FILE_UNCHANGED_STUB 常量
// ============================================================

describe('FILE_UNCHANGED_STUB', () => {
  it('包含关键提示文本', () => {
    expect(FILE_UNCHANGED_STUB).toContain('File unchanged');
    expect(FILE_UNCHANGED_STUB).toContain('earlier Read tool_result');
  });
});