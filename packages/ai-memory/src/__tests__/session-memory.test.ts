import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOKEN_ESTIMATION_CONFIG,
  estimateMessageTokens,
  estimateTokensCharRatio,
  estimateTokensClaudeSpecific
} from '@suga/ai-context';
import {
  DEFAULT_SESSION_MEMORY_CONFIG,
  addSessionNote,
  buildSessionMemoryAutoSavePrompt,
  createInitialSessionMemoryState,
  formatSessionNotesForPrompt,
  removeSessionNote
} from '../core/session-memory';

describe('SessionMemory', () => {
  it('creates initial empty state', () => {
    const state = createInitialSessionMemoryState();
    expect(state.notes).toHaveLength(0);
    expect(state.totalChars).toBe(0);
  });

  it('adds observation note', () => {
    const state = createInitialSessionMemoryState();
    const updated = addSessionNote(state, 'User prefers short responses', 'observation');
    expect(updated.notes).toHaveLength(1);
    expect(updated.notes[0].category).toBe('observation');
    expect(updated.totalChars).toBeGreaterThan(0);
  });

  it('adds decision note', () => {
    const state = createInitialSessionMemoryState();
    const updated = addSessionNote(state, 'Using React hooks pattern', 'decision');
    expect(updated.notes[0].category).toBe('decision');
  });

  it('removes note by id', () => {
    const state = createInitialSessionMemoryState();
    const added = addSessionNote(state, 'test note', 'progress');
    const removed = removeSessionNote(added, added.notes[0].id);
    expect(removed.notes).toHaveLength(0);
    expect(removed.totalChars).toBe(0);
  });

  it('formatSessionNotesForPrompt', () => {
    let state = createInitialSessionMemoryState();
    state = addSessionNote(state, 'obs1', 'observation');
    state = addSessionNote(state, 'dec1', 'decision');
    const prompt = formatSessionNotesForPrompt(state);
    expect(prompt).toContain('Session Notes');
    expect(prompt).toContain('[observation]');
    expect(prompt).toContain('[decision]');
  });

  it('formatSessionNotesForPrompt empty state', () => {
    const state = createInitialSessionMemoryState();
    expect(formatSessionNotesForPrompt(state)).toBe('');
  });

  it('buildSessionMemoryAutoSavePrompt', () => {
    const prompt = buildSessionMemoryAutoSavePrompt(['obs1', 'obs2'], ['dec1']);
    expect(prompt).toContain('Observations');
    expect(prompt).toContain('obs1');
    expect(prompt).toContain('dec1');
  });

  it('DEFAULT_SESSION_MEMORY_CONFIG values', () => {
    expect(DEFAULT_SESSION_MEMORY_CONFIG.enabled).toBe(true);
    expect(DEFAULT_SESSION_MEMORY_CONFIG.preservedInCompact).toBe(true);
  });
});

describe('TokenEstimation', () => {
  it('charRatio estimates tokens', () => {
    const result = estimateTokensCharRatio('hello world test');
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.strategy).toBe('char_ratio');
    expect(result.confidence).toBe('low');
  });

  it('claudeSpecific handles English', () => {
    const result = estimateTokensClaudeSpecific('This is a test sentence.');
    expect(result.estimatedTokens).toBeGreaterThan(0);
    expect(result.strategy).toBe('claude_specific');
    expect(result.confidence).toBe('medium');
  });

  it('claudeSpecific handles CJK text', () => {
    const result = estimateTokensClaudeSpecific('这是一个中文测试');
    expect(result.estimatedTokens).toBeGreaterThan(0);
    // CJK should have higher token estimate than char ratio
    const charResult = estimateTokensCharRatio('这是一个中文测试');
    expect(result.estimatedTokens).toBeGreaterThanOrEqual(charResult.estimatedTokens);
  });

  it('estimateMessageTokens for string content', () => {
    const tokens = estimateMessageTokens({ role: 'user', content: 'hello world' });
    expect(tokens).toBeGreaterThan(0);
  });

  it('estimateMessageTokens for array content', () => {
    const tokens = estimateMessageTokens({
      role: 'assistant',
      content: [{ type: 'text', text: 'response text' }]
    });
    expect(tokens).toBeGreaterThan(0);
  });

  it('DEFAULT_TOKEN_ESTIMATION_CONFIG', () => {
    expect(DEFAULT_TOKEN_ESTIMATION_CONFIG.defaultStrategy).toBe('char_ratio');
    expect(DEFAULT_TOKEN_ESTIMATION_CONFIG.charRatio).toBe(4);
  });
});
