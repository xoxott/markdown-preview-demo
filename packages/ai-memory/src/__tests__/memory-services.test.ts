import { describe, expect, it } from 'vitest';
import { extractMemoriesFromTranscript } from '../core/extract-memories';
import type { ExtractMemoriesFn } from '../core/extract-memories';
import { shouldTriggerAutoDream } from '../core/auto-dream';
import type { AutoDreamState } from '../core/auto-dream';
import { computeDelta, scanForSecrets } from '../core/team-memory-sync';

describe('extractMemoriesFromTranscript', () => {
  const mockFn: ExtractMemoriesFn = async () => [
    {
      type: 'feedback',
      content: 'User prefers concise responses',
      confidence: 0.9,
      reason: 'explicitly stated'
    },
    {
      type: 'project',
      content: 'Working on feature X',
      confidence: 0.8,
      reason: 'mentioned multiple times'
    },
    { type: 'user', content: 'Likes dark mode', confidence: 0.3, reason: 'low confidence' }
  ];

  it('extracts and filters by confidence', async () => {
    const result = await extractMemoriesFromTranscript('transcript text', mockFn);
    expect(result).toHaveLength(2);
  });

  it('disabled → empty', async () => {
    const result = await extractMemoriesFromTranscript('text', mockFn, {
      enabled: false,
      maxExtractions: 5,
      minConfidence: 0.7,
      forkOnSessionEnd: true
    });
    expect(result).toHaveLength(0);
  });

  it('maxExtractions limits output', async () => {
    const result = await extractMemoriesFromTranscript('text', mockFn, {
      enabled: true,
      maxExtractions: 1,
      minConfidence: 0.5,
      forkOnSessionEnd: true
    });
    expect(result).toHaveLength(1);
  });
});

describe('shouldTriggerAutoDream', () => {
  it('triggers when time + session gates met', () => {
    const state: AutoDreamState = {
      lastDreamTime: Date.now() - 2000000,
      sessionInteractionCount: 10,
      isRunning: false,
      lockAcquired: false
    };
    expect(shouldTriggerAutoDream(state)).toBe(true);
  });

  it('does not trigger if running', () => {
    const state: AutoDreamState = {
      lastDreamTime: 0,
      sessionInteractionCount: 10,
      isRunning: true,
      lockAcquired: false
    };
    expect(shouldTriggerAutoDream(state)).toBe(false);
  });

  it('does not trigger if too soon', () => {
    const state: AutoDreamState = {
      lastDreamTime: Date.now() - 100,
      sessionInteractionCount: 10,
      isRunning: false,
      lockAcquired: false
    };
    expect(shouldTriggerAutoDream(state)).toBe(false);
  });

  it('does not trigger if not enough interactions', () => {
    const state: AutoDreamState = {
      lastDreamTime: 0,
      sessionInteractionCount: 2,
      isRunning: false,
      lockAcquired: false
    };
    expect(shouldTriggerAutoDream(state)).toBe(false);
  });
});

describe('scanForSecrets', () => {
  it('detects password pattern', () => {
    const result = scanForSecrets('password=secret123');
    expect(result.hasSecrets).toBe(true);
    expect(result.secretPatterns[0].severity).toBe('critical');
  });

  it('detects API key pattern', () => {
    const result = scanForSecrets('api_key=sk-12345');
    expect(result.hasSecrets).toBe(true);
  });

  it('no secrets → empty', () => {
    const result = scanForSecrets('normal code content');
    expect(result.hasSecrets).toBe(false);
  });

  it('detects AWS key', () => {
    const result = scanForSecrets('AKIAIOSFODNN7EXAMPLE');
    expect(result.hasSecrets).toBe(true);
  });
});

describe('computeDelta', () => {
  it('computes additions', () => {
    const delta = computeDelta(['a', 'b'], ['a', 'b', 'c']);
    expect(delta.added).toContain('c');
    expect(delta.removed).toHaveLength(0);
  });

  it('computes removals', () => {
    const delta = computeDelta(['a', 'b', 'c'], ['a']);
    expect(delta.removed).toContain('b');
    expect(delta.removed).toContain('c');
    expect(delta.added).toHaveLength(0);
  });

  it('computes modifications', () => {
    const delta = computeDelta(['a', 'b'], ['a', 'b']);
    expect(delta.modified).toEqual(['a', 'b']);
  });

  it('empty old → all added', () => {
    const delta = computeDelta([], ['a', 'b']);
    expect(delta.added).toEqual(['a', 'b']);
  });
});
