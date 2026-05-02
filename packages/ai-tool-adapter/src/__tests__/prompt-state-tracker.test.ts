/** @suga/ai-tool-adapter — Prompt State Tracker 测试 */

import { describe, expect, it } from 'vitest';
import type { UserMessage } from '@suga/ai-agent-loop';
import {
  PromptStateTracker,
  checkPromptStateForCacheBreak,
  computePromptHash,
  recordPromptState
} from '../retry/prompt-state-tracker';
import type { PromptStateSnapshot } from '../types/prompt-state';
import type { LLMUsageInfo } from '../types/usage';

describe('computePromptHash', () => {
  it('相同字符串 → 相同hash', () => {
    const hash1 = computePromptHash('hello world');
    const hash2 = computePromptHash('hello world');
    expect(hash1).toBe(hash2);
  });

  it('不同字符串 → 不同hash', () => {
    const hash1 = computePromptHash('hello world');
    const hash2 = computePromptHash('hello universe');
    expect(hash1).not.toBe(hash2);
  });

  it('空字符串 → 返回hash', () => {
    const hash = computePromptHash('');
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });

  it('长字符串 → 返回hash', () => {
    const longStr = 'a'.repeat(10000);
    const hash = computePromptHash(longStr);
    expect(hash).toBeDefined();
  });

  it('unicode字符串 → 返回hash', () => {
    const hash = computePromptHash('你好世界 🌍');
    expect(hash).toBeDefined();
  });

  it('确定性hash — 同输入总是同输出', () => {
    for (let i = 0; i < 10; i++) {
      expect(computePromptHash('test string')).toBe(computePromptHash('test string'));
    }
  });
});

describe('recordPromptState', () => {
  it('生成快照 → 包含contentHash/timestamp/inputTokenCount/cachePrefixLength', () => {
    const messages: UserMessage[] = [{ id: '1', role: 'user', content: 'hello', timestamp: 1000 }];

    const snapshot = recordPromptState('system prompt', messages);
    expect(snapshot.contentHash).toBeDefined();
    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.inputTokenCount).toBeGreaterThan(0);
    expect(snapshot.cachePrefixLength).toBeGreaterThan(0);
  });

  it('指定timestamp → 使用指定值', () => {
    const snapshot = recordPromptState('sys', [], 12345);
    expect(snapshot.timestamp).toBe(12345);
  });

  it('相同prompt+messages → 相同hash', () => {
    const messages: UserMessage[] = [{ id: '1', role: 'user', content: 'hello', timestamp: 1000 }];
    const s1 = recordPromptState('sys', messages);
    const s2 = recordPromptState('sys', messages);
    expect(s1.contentHash).toBe(s2.contentHash);
  });

  it('不同prompt → 不同hash', () => {
    const messages: UserMessage[] = [];
    const s1 = recordPromptState('sys A', messages);
    const s2 = recordPromptState('sys B', messages);
    expect(s1.contentHash).not.toBe(s2.contentHash);
  });
});

describe('checkPromptStateForCacheBreak', () => {
  const makeSnapshot = (
    hash: string,
    ts: number,
    tokens: number,
    prefixLen?: number
  ): PromptStateSnapshot => ({
    contentHash: hash,
    timestamp: ts,
    inputTokenCount: tokens,
    cachePrefixLength: prefixLen ?? 100
  });

  const makeUsage = (input: number, cacheRead?: number, cacheCreation?: number): LLMUsageInfo => ({
    inputTokens: input,
    outputTokens: 50,
    cacheReadInputTokens: cacheRead ?? 0,
    cacheCreationInputTokens: cacheCreation ?? 0
  });

  it('hash变化 → hash_changed', () => {
    const prev = makeSnapshot('hash-a', 1000, 1000);
    const curr = makeSnapshot('hash-b', 2000, 1000);
    const usage = makeUsage(1000);

    const result = checkPromptStateForCacheBreak(usage, prev, curr);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('hash_changed');
    expect(result.recommendedAction).toBe('accept_and_continue');
  });

  it('hash相同 + TTL过期 + cache read为0 → ttl_expired', () => {
    const prev = makeSnapshot('same-hash', 1000, 1000);
    const curr = makeSnapshot('same-hash', 400000, 1000); // 超过300s TTL
    const usage = makeUsage(1000, 0, 500); // cache read=0, cache creation>0

    const result = checkPromptStateForCacheBreak(usage, prev, curr);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('ttl_expired');
    expect(result.estimatedTTL).toBe(300);
  });

  it('inputToken数过低 → 不做检测', () => {
    const prev = makeSnapshot('hash', 1000, 50);
    const curr = makeSnapshot('hash', 2000, 50);
    const usage = makeUsage(50); // < minInputTokens=100

    const result = checkPromptStateForCacheBreak(usage, prev, curr);
    expect(result.isCacheBreak).toBe(false);
  });

  it('从有缓存到完全无缓存 → input_prefix_changed', () => {
    // previousSnapshot: cachePrefixLength=2000 > inputTokenCount*4*0.3 = 1200
    // → previousCacheHitRate = min(1, 2000/(1000*4)) = 0.5 > 0.3 ✓
    const prev = makeSnapshot('hash', 1000, 1000, 2000);
    const curr = makeSnapshot('hash', 2000, 1000);
    const usage = makeUsage(1000, 0, 800); // cache read=0, cache creation>0

    const result = checkPromptStateForCacheBreak(usage, prev, curr);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('input_prefix_changed');
  });

  it('cache hit rate突降 → cache_read_drop', () => {
    // previousSnapshot: cachePrefixLength=2000 → previousCacheHitRate = min(1, 2000/(1000*4)) = 0.5
    // currentUsage: cacheRead=100, cacheCreation=100 → currentHitRate = 100/(100+100+1000) = 0.083
    // 0.083 < 0.5*0.5=0.25 → cache_read_drop ✓
    const prev = makeSnapshot('hash', 1000, 1000, 2000);
    const curr = makeSnapshot('hash', 2000, 1000);
    const usage = makeUsage(1000, 100, 100);

    const result = checkPromptStateForCacheBreak(usage, prev, curr);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('cache_read_drop');
  });

  it('cache creation突增 → cache_creation_spike', () => {
    const prev = makeSnapshot('hash', 1000, 1000);
    const curr = makeSnapshot('hash', 2000, 1000);
    const usage: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 50,
      cacheCreationInputTokens: 600, // 600/1000 > 0.5
      cacheReadInputTokens: 400
    };

    const result = checkPromptStateForCacheBreak(usage, prev, curr);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('cache_creation_spike');
  });

  it('无cache break → isCacheBreak=false', () => {
    const prev = makeSnapshot('hash', 1000, 1000);
    const curr = makeSnapshot('hash', 2000, 1000);
    const usage = makeUsage(1000, 800, 200); // 高cache hit rate

    const result = checkPromptStateForCacheBreak(usage, prev, curr);
    expect(result.isCacheBreak).toBe(false);
  });

  it('包含previousSnapshot和currentSnapshot', () => {
    const prev = makeSnapshot('hash', 1000, 1000);
    const curr = makeSnapshot('hash', 2000, 1000);
    const usage = makeUsage(1000, 800, 200);

    const result = checkPromptStateForCacheBreak(usage, prev, curr);
    expect(result.previousSnapshot).toEqual(prev);
    expect(result.currentSnapshot).toEqual(curr);
  });
});

describe('PromptStateTracker', () => {
  it('recordBeforeRequest → 生成快照并保存为previous', () => {
    const tracker = new PromptStateTracker();
    const messages: UserMessage[] = [{ id: '1', role: 'user', content: 'hello', timestamp: 1000 }];

    const snapshot = tracker.recordBeforeRequest('system', messages);
    expect(tracker.getPreviousSnapshot()).toEqual(snapshot);
  });

  it('checkAfterResponse(无previous) → isCacheBreak=false', () => {
    const tracker = new PromptStateTracker();
    const curr: PromptStateSnapshot = {
      contentHash: 'abc',
      timestamp: 2000,
      inputTokenCount: 1000,
      cachePrefixLength: 100
    };
    const usage: LLMUsageInfo = { inputTokens: 1000, outputTokens: 50 };

    const result = tracker.checkAfterResponse(usage, curr);
    expect(result.isCacheBreak).toBe(false);
  });

  it('checkAfterResponse(hash变化) → hash_changed', () => {
    const tracker = new PromptStateTracker();
    tracker.recordBeforeRequest('system A', [], 1000);

    const curr: PromptStateSnapshot = {
      contentHash: 'different-hash',
      timestamp: 2000,
      inputTokenCount: 1000,
      cachePrefixLength: 100
    };
    const usage: LLMUsageInfo = {
      inputTokens: 1000,
      outputTokens: 50,
      cacheCreationInputTokens: 500
    };

    const result = tracker.checkAfterResponse(usage, curr);
    expect(result.isCacheBreak).toBe(true);
    expect(result.reason).toBe('hash_changed');
  });

  it('notifyCompaction → 重置previous baseline', () => {
    const tracker = new PromptStateTracker();
    tracker.recordBeforeRequest('system', [], 1000);
    tracker.notifyCompaction();
    expect(tracker.getPreviousSnapshot()).toBeUndefined();
  });

  it('notifyCacheDeletion → 将previous inputTokenCount设为0', () => {
    const tracker = new PromptStateTracker();
    tracker.recordBeforeRequest('system', [], 1000);
    tracker.notifyCacheDeletion();
    expect(tracker.getPreviousSnapshot()!.inputTokenCount).toBe(0);
  });

  it('reset → 清除previous', () => {
    const tracker = new PromptStateTracker();
    tracker.recordBeforeRequest('system', [], 1000);
    tracker.reset();
    expect(tracker.getPreviousSnapshot()).toBeUndefined();
  });
});
