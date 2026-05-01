import { describe, expect, it } from 'vitest';
import { createContentReplacementTracker } from '../core/ContentReplacementState';

describe('ContentReplacementTracker', () => {
  it('markSeen + classify 三路分流', () => {
    const tracker = createContentReplacementTracker();
    // 未见过 → fresh
    expect(tracker.classify('id_a')).toBe('fresh');

    // 标记 seen
    tracker.markSeen('id_a');
    // 未冻结时 seen 但未替换 → fresh（仍可替换）
    expect(tracker.classify('id_a')).toBe('fresh');

    // 标记 replacement → mustReapply
    tracker.recordReplacement('id_b', { originalSize: 100, compressionType: 'budget' });
    expect(tracker.classify('id_b')).toBe('mustReapply');
  });

  it('冻结机制 — frozen 后 seen 但未替换变为 frozen，已替换仍为 mustReapply', () => {
    const tracker = createContentReplacementTracker();
    // 先在冻结前记录
    tracker.markSeen('id_a');
    tracker.recordReplacement('id_b', { originalSize: 100, compressionType: 'budget' });
    tracker.freeze();

    // 已见过、未替换、已冻结 → frozen（不可替换）
    expect(tracker.classify('id_a')).toBe('frozen');
    // 已替换 → mustReapply（冻结不影响已有的替换记录）
    expect(tracker.classify('id_b')).toBe('mustReapply');
  });

  it('冻结后 markSeen 和 recordReplacement 不生效', () => {
    const tracker = createContentReplacementTracker();
    tracker.freeze();
    tracker.markSeen('id_new');
    tracker.recordReplacement('id_new2', { originalSize: 100, compressionType: 'budget' });

    // 冻结后的操作无效 → fresh
    expect(tracker.classify('id_new')).toBe('fresh');
    expect(tracker.classify('id_new2')).toBe('fresh');
  });
});
