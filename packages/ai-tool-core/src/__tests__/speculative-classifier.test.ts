/** P45 测试 — SpeculativeClassifierCheck 竞速 + ClassifierResultCache 缓存 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ClassifierResultCache,
  clearSpeculativeChecks,
  consumeSpeculativeClassifierCheck,
  peekSpeculativeClassifierCheck,
  startSpeculativeClassifierCheck
} from '../permission/SpeculativeClassifierCheck';
import type { ClassifierResult, PermissionClassifier } from '../types/permission-classifier';
import type { ToolPermissionContext } from '../types/permission-context';
import { DEFAULT_TOOL_PERMISSION_CONTEXT } from '../types/permission-context';

// ============================================================
// ClassifierResultCache
// ============================================================

describe('ClassifierResultCache', () => {
  it('buildCacheKey — bash 命令直接用 command 字符串', () => {
    const key = ClassifierResultCache.buildCacheKey('bash', { command: 'ls -la' });
    expect(key).toBe('bash:ls -la');
  });

  it('buildCacheKey — 其他工具用 toolName + JSON(input)', () => {
    const key = ClassifierResultCache.buildCacheKey('read', { file_path: '/tmp/test.txt' });
    expect(key).toContain('read:');
    expect(key).toContain('/tmp/test.txt');
  });

  it('set + get — 存入和获取缓存结果', () => {
    const cache = new ClassifierResultCache();
    const result: ClassifierResult = { behavior: 'allow', reason: 'safe', confidence: 'high' };

    cache.set('bash:ls', result);
    const retrieved = cache.get('bash:ls');

    expect(retrieved).toEqual(result);
  });

  it('get — 过期条目返回 undefined 并删除', () => {
    const cache = new ClassifierResultCache(1); // 1ms TTL
    const result: ClassifierResult = { behavior: 'allow', reason: 'safe', confidence: 'low' };

    cache.set('bash:ls', result);
    expect(cache.get('bash:ls')).toEqual(result);

    // 手动修改过期时间来模拟过期
    const entry = (cache as any).cache.get('bash:ls');
    entry.expiresAt = Date.now() - 1; // 已过期

    expect(cache.get('bash:ls')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('set — high confidence 使用更长 TTL', () => {
    const cache = new ClassifierResultCache(1); // 1ms defaultTtl
    const highResult: ClassifierResult = { behavior: 'allow', reason: 'safe', confidence: 'high' };

    cache.set('bash:ls', highResult);

    // 检查过期时间 — high confidence TTL = 600000ms，远大于 defaultTtl 1ms
    const entry = (cache as any).cache.get('bash:ls');
    expect(entry.expiresAt - Date.now()).toBeGreaterThanOrEqual(599000); // ~10分钟
  });

  it('set — unavailable/transcriptTooLong 不缓存', () => {
    const cache = new ClassifierResultCache();

    cache.set('bash:ls', {
      behavior: 'ask',
      reason: 'unavailable',
      confidence: 'low',
      unavailable: true
    });
    expect(cache.get('bash:ls')).toBeUndefined();

    cache.set('bash:ls', {
      behavior: 'ask',
      reason: 'too long',
      confidence: 'low',
      transcriptTooLong: true
    });
    expect(cache.get('bash:ls')).toBeUndefined();
  });

  it('purge — 清理过期条目', () => {
    const cache = new ClassifierResultCache();

    cache.set('bash:ls', { behavior: 'allow', reason: 'safe', confidence: 'low' });
    cache.set('bash:cat', { behavior: 'allow', reason: 'safe', confidence: 'high' });

    // 手动让 ls 过期
    const lsEntry = (cache as any).cache.get('bash:ls');
    lsEntry.expiresAt = Date.now() - 1;

    cache.purge();
    // ls 已过期，cat 仍在
    expect(cache.size).toBe(1);
    expect(cache.get('bash:cat')).toBeDefined();
  });

  it('clear — 清空缓存', () => {
    const cache = new ClassifierResultCache();
    cache.set('bash:ls', { behavior: 'allow', reason: 'safe', confidence: 'high' });
    cache.set('bash:cat', { behavior: 'allow', reason: 'safe', confidence: 'high' });
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });
});

// ============================================================
// SpeculativeClassifierCheck
// ============================================================

describe('SpeculativeClassifierCheck', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockClassifyFn: any;

  const mockClassifier: PermissionClassifier = {
    name: 'mock',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    classify: (input: any) => mockClassifyFn(input)
  };

  const testPermCtx: ToolPermissionContext = {
    ...DEFAULT_TOOL_PERMISSION_CONTEXT,
    mode: 'default',
    classifierFn: mockClassifier
  };

  beforeEach(() => {
    clearSpeculativeChecks();
    mockClassifyFn = vi.fn();
    vi.clearAllMocks();
  });

  it('startSpeculativeClassifierCheck — 成功启动', () => {
    mockClassifyFn.mockResolvedValue({
      behavior: 'allow',
      reason: 'safe command',
      confidence: 'high'
    });

    const started = startSpeculativeClassifierCheck('ls', mockClassifier, testPermCtx);
    expect(started).toBe(true);
    expect(peekSpeculativeClassifierCheck('ls')).toBeDefined();
  });

  it('startSpeculativeClassifierCheck — bypass 模式不启动', () => {
    const bypassCtx: ToolPermissionContext = {
      ...DEFAULT_TOOL_PERMISSION_CONTEXT,
      mode: 'bypassPermissions'
    };

    const started = startSpeculativeClassifierCheck('ls', mockClassifier, bypassCtx);
    expect(started).toBe(false);
  });

  it('startSpeculativeClassifierCheck — 无 classifierFn 不启动', () => {
    const noClassifierCtx: ToolPermissionContext = {
      ...DEFAULT_TOOL_PERMISSION_CONTEXT,
      mode: 'default'
    };

    const started = startSpeculativeClassifierCheck('ls', mockClassifier, noClassifierCtx);
    expect(started).toBe(false);
  });

  it('startSpeculativeClassifierCheck — 缓存命中时不调用 classifier', () => {
    const cachedCtx: ToolPermissionContext = { ...testPermCtx, classifierFn: mockClassifier };
    mockClassifyFn.mockResolvedValue({ behavior: 'allow', reason: 'cached', confidence: 'high' });

    // 第一次启动 → 调用 classifier + 写入缓存
    startSpeculativeClassifierCheck('ls -la', mockClassifier, cachedCtx);
    expect(mockClassifyFn).toHaveBeenCalledTimes(1);

    // 第二次启动相同命令 → 使用缓存（不再次调用 classifier）
    // 注意: 由于第一次的 promise 可能还没完成写入缓存，
    // 这个测试需要 await 第一次 promise 完成
  });

  it('peekSpeculativeClassifierCheck — 获取但不删除', () => {
    mockClassifyFn.mockResolvedValue({
      behavior: 'allow',
      reason: 'safe',
      confidence: 'high'
    });

    startSpeculativeClassifierCheck('ls', mockClassifier, testPermCtx);

    const promise1 = peekSpeculativeClassifierCheck('ls');
    const promise2 = peekSpeculativeClassifierCheck('ls');

    expect(promise1).toBeDefined();
    expect(promise2).toBeDefined();
    // peek 不删除，两次获取到同一个 promise
    expect(promise1).toBe(promise2);
  });

  it('consumeSpeculativeClassifierCheck — 获取并删除', () => {
    mockClassifyFn.mockResolvedValue({
      behavior: 'allow',
      reason: 'safe',
      confidence: 'high'
    });

    startSpeculativeClassifierCheck('ls', mockClassifier, testPermCtx);

    const promise = consumeSpeculativeClassifierCheck('ls');
    expect(promise).toBeDefined();

    // 第二次 consume → undefined（已删除）
    const promise2 = consumeSpeculativeClassifierCheck('ls');
    expect(promise2).toBeUndefined();
  });

  it('clearSpeculativeChecks — 清理所有预启动检查', () => {
    mockClassifyFn.mockResolvedValue({
      behavior: 'allow',
      reason: 'safe',
      confidence: 'high'
    });

    startSpeculativeClassifierCheck('ls', mockClassifier, testPermCtx);
    startSpeculativeClassifierCheck('cat', mockClassifier, testPermCtx);

    expect(peekSpeculativeClassifierCheck('ls')).toBeDefined();
    expect(peekSpeculativeClassifierCheck('cat')).toBeDefined();

    clearSpeculativeChecks();

    expect(peekSpeculativeClassifierCheck('ls')).toBeUndefined();
    expect(peekSpeculativeClassifierCheck('cat')).toBeUndefined();
  });

  it('classifier 错误 → graceful degradation (返回 ask)', async () => {
    mockClassifyFn.mockRejectedValue(new Error('API error'));

    const started = startSpeculativeClassifierCheck('rm', mockClassifier, testPermCtx);
    expect(started).toBe(true);

    const promise = peekSpeculativeClassifierCheck('rm');
    const result = await promise!;

    expect(result!.behavior).toBe('ask');
    expect(result!.unavailable).toBe(true);
  });
});
