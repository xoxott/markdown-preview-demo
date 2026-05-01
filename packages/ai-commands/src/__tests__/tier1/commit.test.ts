/** /commit 命令测试 — buildCommitPrompt + SkillDefinition + GitProvider */

import { describe, expect, it } from 'vitest';
import { buildCommitPrompt, commitSkill } from '../../commands/tier1/commit';
import type { GitLogEntry, GitStatusResult } from '../../types/providers';
import { MockGitProvider } from '../mocks/MockGitProvider';

const MOCK_STATUS: GitStatusResult = {
  staged: [{ path: 'src/index.ts', status: 'modified' }],
  unstaged: [],
  untracked: [],
  branch: 'main'
};

const MOCK_LOG: GitLogEntry[] = [
  { hash: 'abc1234', subject: 'feat: add feature', author: 'dev', date: '2026-04-28' }
];

describe('buildCommitPrompt — 纯函数', () => {
  it('基本输入 → 包含 Git Commit 标题', () => {
    const prompt = buildCommitPrompt({
      status: MOCK_STATUS,
      diff: 'some diff content',
      recentLog: MOCK_LOG
    });
    expect(prompt).toContain('## Git Commit');
    expect(prompt).toContain('Branch: main');
    expect(prompt).toContain('Staged Changes');
    expect(prompt).toContain('some diff content');
  });

  it('自定义 instruction → 包含指令', () => {
    const prompt = buildCommitPrompt({
      status: MOCK_STATUS,
      diff: 'diff',
      recentLog: MOCK_LOG,
      instruction: 'fix the login bug'
    });
    expect(prompt).toContain('fix the login bug');
  });

  it('amend → 包含 amend 标记', () => {
    const prompt = buildCommitPrompt({
      status: MOCK_STATUS,
      diff: 'diff',
      recentLog: MOCK_LOG,
      amend: true
    });
    expect(prompt).toContain('Amend');
  });

  it('超长 diff → 截断', () => {
    const longDiff = Array.from({ length: 400 }, (_, i) => `line ${i}`).join('\n');
    const prompt = buildCommitPrompt({
      status: MOCK_STATUS,
      diff: longDiff,
      recentLog: MOCK_LOG
    });
    expect(prompt).toContain('truncated');
  });

  it('最近 commit 日志 → 包含风格参考', () => {
    const prompt = buildCommitPrompt({
      status: MOCK_STATUS,
      diff: 'diff',
      recentLog: MOCK_LOG
    });
    expect(prompt).toContain('Recent commits');
    expect(prompt).toContain('abc1234');
  });
});

describe('commitSkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(commitSkill.name).toBe('commit');
    expect(commitSkill.aliases).toContain('ci');
  });

  it('allowedTools 包含 bash 和 file-read', () => {
    expect(commitSkill.allowedTools).toContain('bash');
    expect(commitSkill.allowedTools).toContain('file-read');
  });

  it('无 gitProvider → 返回错误', async () => {
    const result = await commitSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('GitProvider');
  });

  it('有 gitProvider → 生成 prompt', async () => {
    const gitProvider = new MockGitProvider();
    const result = await commitSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      gitProvider
    } as any);
    expect(result.content).toContain('## Git Commit');
    expect(result.content).toContain('main');
  });

  it('instruction 参数 → 传递到 prompt', async () => {
    const gitProvider = new MockGitProvider();
    const result = await commitSkill.getPromptForCommand('fix the bug', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      gitProvider
    } as any);
    expect(result.content).toContain('fix the bug');
  });
});
