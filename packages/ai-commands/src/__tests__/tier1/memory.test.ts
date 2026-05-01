/** /memory 命令测试 — prompt builders + SkillDefinition + MemoryCommandProvider */

import { describe, expect, it } from 'vitest';
import {
  buildMemoryForgetPrompt,
  buildMemoryRecallPrompt,
  buildMemoryRefreshPrompt,
  buildMemorySavePrompt,
  memorySkill
} from '../../commands/tier1/memory';
import { MockMemoryProvider } from '../mocks/MockMemoryProvider';

describe('buildMemorySavePrompt — 纯函数', () => {
  it('成功保存 → 包含路径和名称', () => {
    const prompt = buildMemorySavePrompt({
      result: { success: true, path: 'memory/user/test.md' },
      name: 'test',
      type: 'user'
    });
    expect(prompt).toContain('Successfully saved');
    expect(prompt).toContain('test');
    expect(prompt).toContain('user');
  });

  it('失败保存 → 包含错误', () => {
    const prompt = buildMemorySavePrompt({
      result: { success: false, path: '', error: 'Invalid path' },
      name: 'test',
      type: 'user'
    });
    expect(prompt).toContain('Failed');
    expect(prompt).toContain('Invalid path');
  });
});

describe('buildMemoryRecallPrompt — 纯函数', () => {
  it('有结果 → 格式化条目', () => {
    const prompt = buildMemoryRecallPrompt({
      entries: [
        {
          filePath: 'user/prefs.md',
          name: 'Prefs',
          description: 'Dark mode',
          type: 'user',
          body: 'VS Code',
          mtimeMs: Date.now()
        }
      ],
      query: 'dark'
    });
    expect(prompt).toContain('Prefs');
    expect(prompt).toContain('dark');
  });

  it('空结果 → 无匹配提示', () => {
    const prompt = buildMemoryRecallPrompt({ entries: [], query: 'React' });
    expect(prompt).toContain('No memories');
  });
});

describe('buildMemoryForgetPrompt — 纯函数', () => {
  it('成功 → 删除确认', () => {
    const prompt = buildMemoryForgetPrompt({ success: true, path: 'user/test.md' });
    expect(prompt).toContain('forgotten');
  });

  it('失败 → 错误提示', () => {
    const prompt = buildMemoryForgetPrompt({ success: false, path: 'user/test.md' });
    expect(prompt).toContain('Failed');
  });
});

describe('buildMemoryRefreshPrompt — 纯函数', () => {
  it('刷新结果 → 包含统计', () => {
    const prompt = buildMemoryRefreshPrompt({
      result: { filesLoaded: 5, filesSkipped: 1, errors: [] }
    });
    expect(prompt).toContain('Loaded: 5');
    expect(prompt).toContain('Skipped: 1');
  });
});

describe('memorySkill — SkillDefinition', () => {
  it('name 和 aliases', () => {
    expect(memorySkill.name).toBe('memory');
    expect(memorySkill.aliases).toContain('mem');
  });

  it('无 memoryProvider → 返回错误', async () => {
    const result = await memorySkill.getPromptForCommand('recall test', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {}
    });
    expect(result.content).toContain('Error');
    expect(result.content).toContain('MemoryCommandProvider');
  });

  it('recall 子命令 → 搜索记忆', async () => {
    const memoryProvider = new MockMemoryProvider();
    const result = await memorySkill.getPromptForCommand('recall dark', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      memoryProvider
    } as any);
    expect(result.content).toContain('Prefs');
  });

  it('refresh 子命令 → 刷新记忆', async () => {
    const memoryProvider = new MockMemoryProvider();
    const result = await memorySkill.getPromptForCommand('refresh', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      memoryProvider
    } as any);
    expect(result.content).toContain('Loaded');
  });

  it('save 子命令 → 保存记忆', async () => {
    const memoryProvider = new MockMemoryProvider();
    const result = await memorySkill.getPromptForCommand('save test-name some content', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      memoryProvider
    } as any);
    expect(result.content).toContain('Successfully saved');
    expect(result.content).toContain('test-name');
  });

  it('forget 子命令 → 删除记忆', async () => {
    const memoryProvider = new MockMemoryProvider();
    const result = await memorySkill.getPromptForCommand('forget user/test.md', {
      sessionId: 'test',
      toolRegistry: {} as any,
      abortSignal: new AbortController().signal,
      meta: {},
      memoryProvider
    } as any);
    expect(result.content).toContain('forgotten');
  });
});
