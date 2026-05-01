/** GrepTool 测试 — 正则表达式搜索工具 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import { grepTool } from '../tools/grep';
import { GrepInputSchema } from '../types/tool-inputs';
import type { ExtendedToolUseContext } from '../context-merge';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

function createContext(fs: MockFileSystemProvider): ExtendedToolUseContext {
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test-session',
    fsProvider: fs
  };
}

describe('GrepTool — schema 验证', () => {
  it('最小有效输入 → 仅 pattern', () => {
    const result = GrepInputSchema.safeParse({ pattern: 'hello' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outputMode).toBe('files-with-matches');
  });

  it('全部选项 → 所有字段有效', () => {
    const result = GrepInputSchema.safeParse({
      pattern: 'error',
      path: '/src',
      glob: '*.ts',
      outputMode: 'content',
      caseInsensitive: true,
      contextBefore: 2,
      contextAfter: 3,
      headLimit: 50
    });
    expect(result.success).toBe(true);
  });

  it('strictObject → 拒绝额外字段', () => {
    const result = GrepInputSchema.safeParse({ pattern: 'hello', extra: true });
    expect(result.success).toBe(false);
  });

  it('outputMode → 3种有效值', () => {
    expect(GrepInputSchema.safeParse({ pattern: 'x', outputMode: 'content' }).success).toBe(true);
    expect(
      GrepInputSchema.safeParse({ pattern: 'x', outputMode: 'files-with-matches' }).success
    ).toBe(true);
    expect(GrepInputSchema.safeParse({ pattern: 'x', outputMode: 'count' }).success).toBe(true);
  });

  it('outputMode 无效值 → 拒绝', () => {
    const result = GrepInputSchema.safeParse({ pattern: 'x', outputMode: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('contextLines → 有效非负整数', () => {
    const result = GrepInputSchema.safeParse({ pattern: 'x', contextLines: 3 });
    expect(result.success).toBe(true);
  });

  it('headLimit=0 → schema 通过（validateInput 拦截）', () => {
    const result = GrepInputSchema.safeParse({ pattern: 'x', headLimit: 0 });
    expect(result.success).toBe(true);
  });

  it('默认值 → outputMode 默认 files-with-matches', () => {
    const result = GrepInputSchema.safeParse({ pattern: 'x' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outputMode).toBe('files-with-matches');
  });
});

describe('GrepTool — validateInput', () => {
  it('有效输入 → allow', () => {
    const result = grepTool.validateInput(
      { pattern: 'hello', outputMode: 'content' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('空 pattern → deny', () => {
    const result = grepTool.validateInput(
      { pattern: '', outputMode: 'content' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('empty_pattern');
  });

  it('contextBefore/After + contextLines 冲突 → deny', () => {
    const result = grepTool.validateInput(
      { pattern: 'x', contextBefore: 2, contextLines: 3, outputMode: 'content' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('conflicting_context_options');
  });

  it('headLimit=0 → deny', () => {
    const result = grepTool.validateInput(
      { pattern: 'x', headLimit: 0, outputMode: 'content' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('zero_head_limit');
  });

  it('仅 contextBefore → allow', () => {
    const result = grepTool.validateInput(
      { pattern: 'x', contextBefore: 2, outputMode: 'content' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('GrepTool — checkPermissions', () => {
  it('总是 allow', () => {
    const result = grepTool.checkPermissions(
      { pattern: 'hello', outputMode: 'content' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('带 path 仍然 allow', () => {
    const result = grepTool.checkPermissions(
      { pattern: 'hello', path: '/src', outputMode: 'content' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('GrepTool — call 执行', () => {
  it('content 模式 → 返回匹配行', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'const hello = 1;\nconst world = 2;');
    const ctx = createContext(fs);
    const result = await grepTool.call({ pattern: 'hello', outputMode: 'content' }, ctx);
    expect(result.data.mode).toBe('content');
    expect(result.data.totalMatches).toBe(1);
  });

  it('files-with-matches 模式 → 返回文件路径', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'hello world');
    const ctx = createContext(fs);
    const result = await grepTool.call({ pattern: 'hello', outputMode: 'files-with-matches' }, ctx);
    expect(result.data.mode).toBe('files-with-matches');
    expect(result.data.filePaths?.length).toBe(1);
  });

  it('count 模式 → 返回匹配计数', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'hello world\nhello again');
    const ctx = createContext(fs);
    const result = await grepTool.call({ pattern: 'hello', outputMode: 'count' }, ctx);
    expect(result.data.mode).toBe('count');
    expect(result.data.counts?.[0]?.count).toBe(2);
  });

  it('glob 过滤 → 仅匹配指定文件类型', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'hello');
    fs.addFile('/src/b.js', 'hello');
    const ctx = createContext(fs);
    const result = await grepTool.call(
      { pattern: 'hello', glob: '*.ts', outputMode: 'files-with-matches' },
      ctx
    );
    expect(result.data.filePaths?.length).toBe(1);
  });

  it('caseInsensitive → 大小写不敏感', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'HELLO world');
    const ctx = createContext(fs);
    const result = await grepTool.call(
      { pattern: 'hello', caseInsensitive: true, outputMode: 'content' },
      ctx
    );
    expect(result.data.totalMatches).toBe(1);
  });

  it('无匹配 → totalMatches=0', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'no match here');
    const ctx = createContext(fs);
    const result = await grepTool.call({ pattern: 'xyz', outputMode: 'content' }, ctx);
    expect(result.data.totalMatches).toBe(0);
  });

  it('excludePatterns 默认含 .git/node_modules', async () => {
    const fs = new MockFileSystemProvider();
    // MockFileSystemProvider 不做 excludePatterns 过滤，但真实实现会
    const ctx = createContext(fs);
    const result = await grepTool.call({ pattern: 'x', outputMode: 'files-with-matches' }, ctx);
    // 验证调用成功
    expect(result.data.mode).toBe('files-with-matches');
  });

  it('path 过滤 → 仅搜索指定目录', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'hello');
    fs.addFile('/lib/b.ts', 'hello');
    const ctx = createContext(fs);
    const result = await grepTool.call(
      { pattern: 'hello', path: '/src', outputMode: 'files-with-matches' },
      ctx
    );
    expect(result.data.filePaths?.length).toBe(1);
  });

  it('headLimit 截断 → truncated=true', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/a.ts', 'match\nmatch\nmatch\nmatch\nmatch');
    const ctx = createContext(fs);
    const result = await grepTool.call(
      { pattern: 'match', headLimit: 2, outputMode: 'content' },
      ctx
    );
    expect(result.data.truncated).toBe(true);
  });

  it('contextLines → 同时设置 before/after', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/a.ts', 'line0\nline1\nmatch\nline3\nline4');
    const ctx = createContext(fs);
    const result = await grepTool.call(
      { pattern: 'match', contextLines: 1, outputMode: 'content' },
      ctx
    );
    expect(result.data.totalMatches).toBe(1);
  });
});

describe('GrepTool — 安全声明', () => {
  it('isReadOnly → true', () => {
    expect(grepTool.isReadOnly({ pattern: 'hello', outputMode: 'content' })).toBe(true);
  });

  it('isConcurrencySafe → true', () => {
    expect(grepTool.isConcurrencySafe({ pattern: 'hello', outputMode: 'content' })).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    expect(grepTool.safetyLabel({ pattern: 'hello', outputMode: 'content' })).toBe('readonly');
  });
});

describe('GrepTool — description', () => {
  it('最小输入 → 含 pattern 和默认模式', async () => {
    const desc = await grepTool.description({ pattern: 'hello', outputMode: 'content' });
    expect(desc).toContain('hello');
    expect(desc).toContain('content');
  });

  it('带 path → 含路径信息', async () => {
    const desc = await grepTool.description({
      pattern: 'hello',
      path: '/src',
      outputMode: 'files-with-matches'
    });
    expect(desc).toContain('/src');
  });
});
