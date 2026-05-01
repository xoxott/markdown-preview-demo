/** /compact 命令测试 — buildCompactPrompt + SkillDefinition */

import { describe, expect, it } from 'vitest';
import { buildCompactPrompt, compactSkill } from '../../commands/tier1/compact';

describe('buildCompactPrompt — 纯函数', () => {
  it('基本输入 → 包含标题和指令', () => {
    const prompt = buildCompactPrompt({});
    expect(prompt).toContain('## Context Compaction');
    expect(prompt).toContain('Preserve all important');
    expect(prompt).toContain('Remove redundant');
  });

  it('force → 包含 force 标记', () => {
    const prompt = buildCompactPrompt({ force: true });
    expect(prompt).toContain('Force compaction');
  });

  it('自定义 instruction → 包含指令', () => {
    const prompt = buildCompactPrompt({ instruction: 'keep the API design discussion' });
    expect(prompt).toContain('keep the API design discussion');
  });
});

describe('compactSkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(compactSkill.name).toBe('compact');
    expect(compactSkill.aliases).toContain('compress');
  });

  it('disableModelInvocation → true', () => {
    expect(compactSkill.disableModelInvocation).toBe(true);
  });

  it('allowedTools → undefined', () => {
    expect(compactSkill.allowedTools).toBeUndefined();
  });

  it('空参数 → 生成标准 prompt', async () => {
    const result = await compactSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('## Context Compaction');
    expect(result.contextModifier).toBeDefined();
  });

  it('force 参数 → force prompt', async () => {
    const result = await compactSkill.getPromptForCommand('force=true', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Force compaction');
  });

  it('instruction 参数 → 自定义指令', async () => {
    const result = await compactSkill.getPromptForCommand('keep API notes', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('keep API notes');
  });
});
