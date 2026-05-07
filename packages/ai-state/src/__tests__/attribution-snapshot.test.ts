import { describe, expect, it } from 'vitest';
import type { AttributionSnapshot } from '../types/attribution-snapshot';

describe('AttributionSnapshot', () => {
  it('constructs a valid snapshot', () => {
    const snapshot: AttributionSnapshot = {
      commitSha: 'abc123',
      author: 'user@example.com',
      timestamp: 1700000000,
      filesChanged: ['src/index.ts', 'README.md'],
      message: 'feat: add new feature'
    };
    expect(snapshot.commitSha).toBe('abc123');
    expect(snapshot.filesChanged).toHaveLength(2);
  });

  it('allows empty filesChanged', () => {
    const snapshot: AttributionSnapshot = {
      commitSha: 'def456',
      author: 'bot',
      timestamp: 1700000001,
      filesChanged: [],
      message: 'chore: update deps'
    };
    expect(snapshot.filesChanged).toHaveLength(0);
  });
});
