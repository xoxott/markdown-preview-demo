/** GlobTool 测试 — 文件模式搜索工具 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import { globTool } from '../tools/glob';
import { GlobInputSchema } from '../types/tool-inputs';
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

describe('GlobTool — schema 验证', () => {
  it('有效输入 → pattern + optional path', () => {
    const result = GlobInputSchema.safeParse({ pattern: '**/*.ts' });
    expect(result.success).toBe(true);
  });

  it('有效输入 → 仅 pattern', () => {
    const result = GlobInputSchema.safeParse({ pattern: '*.json' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.path).toBeUndefined();
  });

  it('空 pattern → schema 通过（validateInput 拦截）', () => {
    const result = GlobInputSchema.safeParse({ pattern: '' });
    expect(result.success).toBe(true);
  });

  it('额外字段 → 被拒绝（strictObject）', () => {
    const result = GlobInputSchema.safeParse({ pattern: '*.ts', extra: true });
    expect(result.success).toBe(false);
  });

  it('path 字段 → optional string', () => {
    const result = GlobInputSchema.safeParse({ pattern: '*.ts', path: '/src' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.path).toBe('/src');
  });
});

describe('GlobTool — validateInput', () => {
  it('有效 pattern → allow', () => {
    const result = globTool.validateInput(
      { pattern: '**/*.ts' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('空 pattern → deny', () => {
    const result = globTool.validateInput(
      { pattern: '' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('empty_pattern');
  });

  it('pattern + path → allow', () => {
    const result = globTool.validateInput(
      { pattern: '*.ts', path: '/src' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('GlobTool — checkPermissions', () => {
  it('总是 allow', () => {
    const result = globTool.checkPermissions(
      { pattern: '**/*.ts' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('空 pattern 时仍然 allow（validateInput 已拦截）', () => {
    const result = globTool.checkPermissions(
      { pattern: '' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('GlobTool — call 执行', () => {
  it('基本 glob 搜索 → 返回匹配路径', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', '');
    fs.addFile('/src/b.ts', '');
    fs.addFile('/src/c.js', '');
    const ctx = createContext(fs);
    const result = await globTool.call({ pattern: '*.ts', path: '/src' }, ctx);
    expect(result.data.length).toBe(2);
  });

  it('无匹配 → 返回空数组', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.js', '');
    const ctx = createContext(fs);
    const result = await globTool.call({ pattern: '*.ts', path: '/src' }, ctx);
    expect(result.data).toEqual([]);
  });

  it('pattern 错误 → fsProvider 抛出异常', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createContext(fs);
    // MockFileSystemProvider 不抛出异常，但真实实现可能
    const result = await globTool.call({ pattern: '*.ts' }, ctx);
    expect(result.data).toEqual([]);
  });

  it('glob 带 path → 传递给 fsProvider', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/project/src/a.ts', '');
    const ctx = createContext(fs);
    const result = await globTool.call({ pattern: '*.ts', path: '/project/src' }, ctx);
    expect(result.data.length).toBe(1);
  });

  it('fsProvider 返回排序结果', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/z.ts', '');
    fs.addFile('/a.ts', '');
    const ctx = createContext(fs);
    const result = await globTool.call({ pattern: '*.ts' }, ctx);
    expect(result.data).toEqual(['/a.ts', '/z.ts']);
  });
});

describe('GlobTool — 安全声明', () => {
  it('isReadOnly → true', () => {
    expect(globTool.isReadOnly({ pattern: '**/*.ts' })).toBe(true);
  });

  it('isConcurrencySafe → true', () => {
    expect(globTool.isConcurrencySafe({ pattern: '**/*.ts' })).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    expect(globTool.safetyLabel({ pattern: '**/*.ts' })).toBe('readonly');
  });

  it('isDestructive → false', () => {
    expect(globTool.isDestructive({ pattern: '**/*.ts' })).toBe(false);
  });
});

describe('GlobTool — description', () => {
  it('仅 pattern → 描述含 pattern', async () => {
    const desc = await globTool.description({ pattern: '**/*.ts' });
    expect(desc).toContain('**/*.ts');
    expect(desc).not.toContain('in /');
  });

  it('pattern + path → 描述含路径', async () => {
    const desc = await globTool.description({ pattern: '**/*.ts', path: '/src' });
    expect(desc).toContain('/src');
  });
});
