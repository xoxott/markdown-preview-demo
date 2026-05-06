import { describe, it, expect } from 'vitest';
import {
  createInitialQueryTurnState,
  recordPermissionDenial,
  addDiscoveredSkill,
  addLoadedMemoryPath,
  hasPermissionDenial
} from '../types/query-state';

describe('createInitialQueryTurnState', () => {
  it('creates empty state', () => {
    const state = createInitialQueryTurnState();
    expect(state.permissionDenials).toEqual([]);
    expect(state.discoveredSkillNames).toEqual([]);
    expect(state.loadedNestedMemoryPaths).toEqual([]);
    expect(state.snipReplay.enabled).toBe(false);
  });
});

describe('recordPermissionDenial', () => {
  it('records a denial', () => {
    const state = createInitialQueryTurnState();
    const updated = recordPermissionDenial(state, 'bash', 'hash1', 'user denied');
    expect(updated.permissionDenials).toHaveLength(1);
    expect(updated.permissionDenials[0].toolName).toBe('bash');
    expect(updated.permissionDenials[0].reason).toBe('user denied');
  });

  it('accumulates multiple denials', () => {
    let state = createInitialQueryTurnState();
    state = recordPermissionDenial(state, 'bash', 'h1', 'denied');
    state = recordPermissionDenial(state, 'file-edit', 'h2', 'unsafe');
    expect(state.permissionDenials).toHaveLength(2);
  });

  it('preserves other fields', () => {
    let state = addDiscoveredSkill(createInitialQueryTurnState(), 'commit');
    state = recordPermissionDenial(state, 'bash', 'h1', 'denied');
    expect(state.discoveredSkillNames).toContain('commit');
    expect(state.permissionDenials).toHaveLength(1);
  });
});

describe('addDiscoveredSkill', () => {
  it('adds skill', () => {
    const state = createInitialQueryTurnState();
    const updated = addDiscoveredSkill(state, 'commit');
    expect(updated.discoveredSkillNames).toContain('commit');
  });

  it('deduplicates', () => {
    let state = createInitialQueryTurnState();
    state = addDiscoveredSkill(state, 'commit');
    state = addDiscoveredSkill(state, 'commit');
    expect(state.discoveredSkillNames).toHaveLength(1);
  });
});

describe('addLoadedMemoryPath', () => {
  it('adds path', () => {
    const state = createInitialQueryTurnState();
    const updated = addLoadedMemoryPath(state, '/project/.claude/memory');
    expect(updated.loadedNestedMemoryPaths).toContain('/project/.claude/memory');
  });

  it('deduplicates', () => {
    let state = createInitialQueryTurnState();
    state = addLoadedMemoryPath(state, '/a');
    state = addLoadedMemoryPath(state, '/a');
    expect(state.loadedNestedMemoryPaths).toHaveLength(1);
  });
});

describe('hasPermissionDenial', () => {
  it('finds matching denial', () => {
    const state = recordPermissionDenial(createInitialQueryTurnState(), 'bash', 'h1', 'denied');
    expect(hasPermissionDenial(state, 'bash', 'h1')).toBe(true);
  });

  it('no match returns false', () => {
    expect(hasPermissionDenial(createInitialQueryTurnState(), 'bash', 'h1')).toBe(false);
  });

  it('wrong hash returns false', () => {
    const state = recordPermissionDenial(createInitialQueryTurnState(), 'bash', 'h1', 'denied');
    expect(hasPermissionDenial(state, 'bash', 'h2')).toBe(false);
  });
});