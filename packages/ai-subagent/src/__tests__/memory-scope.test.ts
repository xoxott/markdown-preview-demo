import { describe, expect, it } from 'vitest';
import { computeScopedMemoryPath } from '../types/memory-scope';
import type { AgentMemoryScope } from '../types/memory-scope';

describe('computeScopedMemoryPath', () => {
  it('computes scoped path with base root and agent type', () => {
    expect(computeScopedMemoryPath('/home/user/.claude/memory', 'explorer')).toBe(
      '/home/user/.claude/memory/agents/explorer'
    );
  });

  it('handles nested project paths', () => {
    expect(computeScopedMemoryPath('/project/.claude/memory', 'code-reviewer')).toBe(
      '/project/.claude/memory/agents/code-reviewer'
    );
  });

  it('strips trailing slashes from base root', () => {
    expect(computeScopedMemoryPath('/home/user/.claude/memory/', 'explorer')).toBe(
      '/home/user/.claude/memory/agents/explorer'
    );
  });

  it('strips multiple trailing slashes', () => {
    expect(computeScopedMemoryPath('/home/user/.claude/memory///', 'explorer')).toBe(
      '/home/user/.claude/memory/agents/explorer'
    );
  });

  it('handles short agent type names', () => {
    expect(computeScopedMemoryPath('/tmp/.claude/memory', 'a')).toBe(
      '/tmp/.claude/memory/agents/a'
    );
  });
});

describe('AgentMemoryScope type', () => {
  it('creates a valid scope with enabled=true', () => {
    const scope: AgentMemoryScope = {
      memoryRoot: computeScopedMemoryPath('/home/user/.claude/memory', 'explorer'),
      agentType: 'explorer',
      enabled: true
    };
    expect(scope.enabled).toBe(true);
    expect(scope.memoryRoot).toContain('agents/explorer');
    expect(scope.agentType).toBe('explorer');
  });

  it('creates a scope with enabled=false (disabled scoped memory)', () => {
    const scope: AgentMemoryScope = {
      memoryRoot: '/home/user/.claude/memory',
      agentType: 'explorer',
      enabled: false
    };
    expect(scope.enabled).toBe(false);
  });
});
