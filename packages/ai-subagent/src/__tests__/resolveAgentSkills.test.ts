import { describe, expect, it } from 'vitest';
import { buildSkillSystemPrompt, resolveAgentSkills } from '../core/resolveAgentSkills';
import type { SkillDescriptor, SkillResolver } from '../core/resolveAgentSkills';
import type { SubagentDefinition } from '../types/subagent';

const mockResolver: SkillResolver = {
  resolve(name: string): SkillDescriptor | undefined {
    const skills: Record<string, SkillDescriptor> = {
      'commit': { name: 'commit', description: 'Create git commits', prompt: '/commit' },
      'review-pr': { name: 'review-pr', description: 'Review pull requests' }
    };
    return skills[name];
  }
};

describe('resolveAgentSkills', () => {
  it('resolves skills from definition', () => {
    const def: SubagentDefinition = {
      agentType: 'coder',
      description: 'Code agent',
      whenToUse: 'For coding tasks',
      skills: ['commit', 'review-pr']
    };
    const result = resolveAgentSkills(def, mockResolver);
    expect(result.size).toBe(2);
    expect(result.get('commit')?.description).toBe('Create git commits');
    expect(result.get('review-pr')?.description).toBe('Review pull requests');
  });

  it('skips unknown skills', () => {
    const def: SubagentDefinition = {
      agentType: 'coder',
      description: 'Code agent',
      whenToUse: 'For coding tasks',
      skills: ['commit', 'unknown-skill']
    };
    const result = resolveAgentSkills(def, mockResolver);
    expect(result.size).toBe(1);
    expect(result.get('commit')?.description).toBe('Create git commits');
  });

  it('returns empty map when no skills defined', () => {
    const def: SubagentDefinition = {
      agentType: 'coder',
      description: 'Code agent',
      whenToUse: 'For coding'
    };
    const result = resolveAgentSkills(def, mockResolver);
    expect(result.size).toBe(0);
  });

  it('returns empty map when skills array is empty', () => {
    const def: SubagentDefinition = {
      agentType: 'coder',
      description: 'Code agent',
      whenToUse: 'For coding',
      skills: []
    };
    const result = resolveAgentSkills(def, mockResolver);
    expect(result.size).toBe(0);
  });
});

describe('buildSkillSystemPrompt', () => {
  it('builds prompt from resolved skills', () => {
    const skills = new Map<string, SkillDescriptor>();
    skills.set('commit', { name: 'commit', description: 'Create commits', prompt: '/commit' });
    skills.set('review-pr', { name: 'review-pr', description: 'Review PRs' });
    const prompt = buildSkillSystemPrompt(skills);
    expect(prompt).toContain('commit');
    expect(prompt).toContain('Create commits');
    expect(prompt).toContain('review-pr');
    expect(prompt).toContain('/skill');
    expect(prompt).toContain('Available Skills');
  });

  it('returns empty string when no skills', () => {
    expect(buildSkillSystemPrompt(new Map())).toBe('');
  });

  it('includes prompt field when present', () => {
    const skills = new Map<string, SkillDescriptor>();
    skills.set('commit', { name: 'commit', description: 'Create commits', prompt: '/commit' });
    const prompt = buildSkillSystemPrompt(skills);
    expect(prompt).toContain('Prompt: /commit');
  });
});
