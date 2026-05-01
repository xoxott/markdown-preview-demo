/** /add-dir 命令测试 */

import { describe, expect, it } from 'vitest';
import { addDirSkill, buildAddDirPrompt } from '../../commands/tier2/add-dir';

describe('buildAddDirPrompt — 纯函数', () => {
  it('成功 → 包含添加确认', () => {
    const prompt = buildAddDirPrompt({ path: '/project/src', success: true });
    expect(prompt).toContain('Directory Added');
    expect(prompt).toContain('/project/src');
  });

  it('失败 → 提示目录不存在', () => {
    const prompt = buildAddDirPrompt({ path: '/missing', success: false });
    expect(prompt).toContain('Not Found');
    expect(prompt).toContain('/missing');
  });
});

describe('addDirSkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(addDirSkill.name).toBe('add-dir');
    expect(addDirSkill.aliases).toContain('ad');
  });

  it('无 fsProvider → 返回错误', async () => {
    const result = await addDirSkill.getPromptForCommand('/project/src', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('FileSystemProvider');
  });
});
