import { describe, expect, it } from 'vitest';
import type { FileHistorySnapshot } from '../types/file-history';

describe('FileHistorySnapshot', () => {
  it('constructs a valid snapshot with history', () => {
    const snapshot: FileHistorySnapshot = {
      filePath: '/src/app.ts',
      snapshots: [
        { sha: 'aaa111', timestamp: 1700000000, author: 'alice' },
        { sha: 'bbb222', timestamp: 1700000100, author: 'bob' }
      ],
      currentSha: 'bbb222'
    };
    expect(snapshot.filePath).toBe('/src/app.ts');
    expect(snapshot.snapshots).toHaveLength(2);
    expect(snapshot.currentSha).toBe('bbb222');
  });

  it('allows snapshots without currentSha', () => {
    const snapshot: FileHistorySnapshot = {
      filePath: '/README.md',
      snapshots: [{ sha: 'ccc333', timestamp: 1700000200, author: 'carol' }]
    };
    expect(snapshot.currentSha).toBeUndefined();
  });

  it('allows empty snapshots', () => {
    const snapshot: FileHistorySnapshot = {
      filePath: '/new-file.ts',
      snapshots: []
    };
    expect(snapshot.snapshots).toHaveLength(0);
  });
});
