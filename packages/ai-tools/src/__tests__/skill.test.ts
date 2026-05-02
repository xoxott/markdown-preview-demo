/** @suga/ai-tools — SkillTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { SkillInput } from '../types/tool-inputs';
import { InMemorySkillProvider } from '../provider/InMemorySkillProvider';
import { skillTool } from '../tools/skill';

function createContext(provider?: InMemorySkillProvider): ExtendedToolUseContext {
  const skillProvider = provider ?? new InMemorySkillProvider();
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test',
    fsProvider: {} as any,
    skillProvider
  };
}

describe('SkillTool', () => {
  it('invoke(inline skill) → 返回prompt', async () => {
    const provider = new InMemorySkillProvider();
    provider.registerSkill({
      name: 'commit',
      description: 'Create a git commit',
      prompt: 'Create a commit for the staged changes',
      context: 'inline'
    });
    const result = await skillTool.call(
      { skill: 'commit' } as SkillInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(true);
    expect(result.data.commandName).toBe('commit');
    expect(result.data.status).toBe('inline');
    expect(result.data.result).toContain('commit');
  });

  it('invoke(fork skill) → 返回forked', async () => {
    const provider = new InMemorySkillProvider();
    provider.registerSkill({
      name: 'review-pr',
      description: 'Review a PR',
      prompt: 'Review the PR',
      context: 'fork'
    });
    const result = await skillTool.call(
      { skill: 'review-pr' } as SkillInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(true);
    expect(result.data.status).toBe('forked');
  });

  it('invoke(skill不存在) → 返回错误', async () => {
    const provider = new InMemorySkillProvider();
    const result = await skillTool.call(
      { skill: 'nonexistent' } as SkillInput,
      createContext(provider)
    );
    expect(result.data.success).toBe(false);
    expect(result.data.result).toContain('not found');
  });

  it('invoke(无provider) → 返回错误', async () => {
    const result = await skillTool.call(
      { skill: 'commit' } as SkillInput,
      { abortController: new AbortController(), tools: {} as ToolRegistry, sessionId: 'test', fsProvider: {} as any } as ExtendedToolUseContext
    );
    expect(result.data.success).toBe(false);
    expect(result.data.result).toContain('not available');
  });

  it('invoke(skill with allowedTools) → 返回allowedTools', async () => {
    const provider = new InMemorySkillProvider();
    provider.registerSkill({
      name: 'commit',
      description: 'Create a commit',
      prompt: 'Create a commit',
      allowedTools: ['bash', 'file-edit']
    });
    const result = await skillTool.call(
      { skill: 'commit' } as SkillInput,
      createContext(provider)
    );
    expect(result.data.allowedTools).toEqual(['bash', 'file-edit']);
  });

  it('validateInput(空skill名) → deny', () => {
    const ctx = createContext();
    const result = skillTool.validateInput!({ skill: '' } as SkillInput, ctx);
    expect(result.behavior).toBe('deny');
  });

  it('isReadOnly → false', () => {
    expect(skillTool.isReadOnly!({ skill: 'test' } as SkillInput)).toBe(false);
  });

  it('checkPermissions → ask', () => {
    const ctx = createContext();
    const result = skillTool.checkPermissions!({ skill: 'test' } as SkillInput, ctx);
    expect(result.behavior).toBe('ask');
  });
});