/** /init 命令测试 */

import { describe, expect, it } from 'vitest';
import { buildInitPrompt, initSkill } from '../../commands/tier2/init';

describe('buildInitPrompt — 纯函数', () => {
  it('default 模板 → 包含文件列表', () => {
    const prompt = buildInitPrompt({
      template: 'default',
      projectRoot: '/project',
      filesCreated: ['/project/CLAUDE.md', '/project/.claude/settings.json']
    });
    expect(prompt).toContain('Project Initialization');
    expect(prompt).toContain('CLAUDE.md');
    expect(prompt).toContain('settings.json');
  });

  it('minimal 模板 → 仅 CLAUDE.md', () => {
    const prompt = buildInitPrompt({
      template: 'minimal',
      projectRoot: '/project',
      filesCreated: ['/project/CLAUDE.md']
    });
    expect(prompt).toContain('minimal');
  });
});

describe('initSkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(initSkill.name).toBe('init');
    expect(initSkill.aliases).toContain('setup');
  });

  it('无 fsProvider → 返回错误', async () => {
    const result = await initSkill.getPromptForCommand('', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('FileSystemProvider');
  });
});
