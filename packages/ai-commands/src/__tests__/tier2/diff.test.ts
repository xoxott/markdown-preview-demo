/** /diff 命令测试 */

import { describe, expect, it } from 'vitest';
import { buildDiffPrompt, diffSkill } from '../../commands/tier2/diff';
import { MockGitProvider } from '../mocks/MockGitProvider';

describe('buildDiffPrompt — 纯函数', () => {
  it('完整 diff → 包含标题和分支', () => {
    const prompt = buildDiffPrompt({
      diff: 'some diff content',
      branch: 'main'
    });
    expect(prompt).toContain('Git Diff');
    expect(prompt).toContain('Branch: main');
    expect(prompt).toContain('some diff content');
  });

  it('stagedOnly → 包含标记', () => {
    const prompt = buildDiffPrompt({
      diff: 'staged diff',
      stagedOnly: true,
      branch: 'feature'
    });
    expect(prompt).toContain('staged changes only');
  });

  it('filter → 仅显示匹配路径', () => {
    const diffContent =
      'diff --git a/src/index.ts b/src/index.ts\nchanges\ndiff --git a/package.json b/package.json\nother changes';
    const prompt = buildDiffPrompt({
      diff: diffContent,
      branch: 'main',
      filter: 'src'
    });
    expect(prompt).toContain('src/index.ts');
  });
});

describe('diffSkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(diffSkill.name).toBe('diff');
    expect(diffSkill.aliases).toContain('d');
  });

  it('无 gitProvider → 返回错误', async () => {
    const result = await diffSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('GitProvider');
  });

  it('有 gitProvider → 生成 diff prompt', async () => {
    const gitProvider = new MockGitProvider();
    const result = await diffSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      gitProvider
    } as any);
    expect(result.content).toContain('Git Diff');
  });

  it('staged 参数 → 仅 staged diff', async () => {
    const gitProvider = new MockGitProvider();
    const result = await diffSkill.getPromptForCommand('staged', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      gitProvider
    } as any);
    expect(result.content).toContain('staged changes only');
  });
});
