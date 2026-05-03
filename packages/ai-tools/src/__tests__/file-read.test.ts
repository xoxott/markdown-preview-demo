/** FileReadTool 测试 — 文件读取工具 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import { fileReadTool } from '../tools/file-read';
import { FileReadInputSchema } from '../types/tool-inputs';
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

describe('FileReadTool — schema 验证', () => {
  it('最小有效输入 → filePath', () => {
    const result = FileReadInputSchema.safeParse({ filePath: '/test.txt' });
    expect(result.success).toBe(true);
  });

  it('filePath + offset + limit → 有效', () => {
    const result = FileReadInputSchema.safeParse({ filePath: '/test.txt', offset: 10, limit: 50 });
    expect(result.success).toBe(true);
  });

  it('filePath + pages → 有效', () => {
    const result = FileReadInputSchema.safeParse({ filePath: '/test.pdf', pages: '1-5' });
    expect(result.success).toBe(true);
  });

  it('strictObject → 拒绝额外字段', () => {
    const result = FileReadInputSchema.safeParse({ filePath: '/test.txt', extra: true });
    expect(result.success).toBe(false);
  });

  it('offset=0 → 有效', () => {
    const result = FileReadInputSchema.safeParse({ filePath: '/test.txt', offset: 0 });
    expect(result.success).toBe(true);
  });

  it('相对路径 → schema 通过（validateInput 拦截）', () => {
    const result = FileReadInputSchema.safeParse({ filePath: 'test.txt' });
    expect(result.success).toBe(true);
  });
});

describe('FileReadTool — validateInput', () => {
  it('有效路径 → allow', () => {
    const result = fileReadTool.validateInput(
      { filePath: '/test.txt' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('空路径 → deny', () => {
    const result = fileReadTool.validateInput(
      { filePath: '' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('empty_path');
  });

  it('相对路径 → deny', () => {
    const result = fileReadTool.validateInput(
      { filePath: 'test.txt' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('relative_path');
  });

  it('offset + pages 冲突 → deny', () => {
    const result = fileReadTool.validateInput(
      { filePath: '/test.pdf', offset: 0, pages: '1-5' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('conflicting_read_options');
  });

  it('带 offset → allow', () => {
    const result = fileReadTool.validateInput(
      { filePath: '/test.txt', offset: 10 },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('带 pages → allow', () => {
    const result = fileReadTool.validateInput(
      { filePath: '/test.pdf', pages: '1-5' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('FileReadTool — checkPermissions', () => {
  it('总是 allow', () => {
    const result = fileReadTool.checkPermissions(
      { filePath: '/test.txt' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('FileReadTool — call 执行', () => {
  it('读取文本文件 → 返回内容', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'hello world');
    const ctx = createContext(fs);
    const result = await fileReadTool.call({ filePath: '/test.txt' }, ctx);
    if (result.data.type === 'text') {
      expect(result.data.file.content).toBe('hello world');
      expect(result.data.file.mimeType).toBe('text/plain');
    }
  });

  it('offset 读取 → 返回行范围', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/lines.txt', 'line0\nline1\nline2\nline3\nline4');
    const ctx = createContext(fs);
    const result = await fileReadTool.call({ filePath: '/lines.txt', offset: 2, limit: 2 }, ctx);
    if (result.data.type === 'text') {
      expect(result.data.file.content).toBe('line2\nline3');
    }
  });

  it('文件不存在 → fsProvider 抛出异常', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createContext(fs);
    await expect(fileReadTool.call({ filePath: '/nonexistent.txt' }, ctx)).rejects.toThrow();
  });

  it('mtimeMs 在 metadata 中', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'content', 12345);
    const ctx = createContext(fs);
    const result = await fileReadTool.call({ filePath: '/test.txt' }, ctx);
    if (result.data.type === 'text') {
      expect(result.data.file.mtimeMs).toBe(12345);
    }
  });

  it('lineCount 正确', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'a\nb\nc');
    const ctx = createContext(fs);
    const result = await fileReadTool.call({ filePath: '/test.txt' }, ctx);
    if (result.data.type === 'text') {
      expect(result.data.file.lineCount).toBe(3);
    }
  });

  it('大文件截断 → metadata.truncated=true', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/large.txt', 'x'.repeat(200_000));
    const ctx = createContext(fs);
    const result = await fileReadTool.call({ filePath: '/large.txt' }, ctx);
    expect(result.metadata?.truncated).toBe(true);
    if (result.data.type === 'text') {
      expect(result.data.file.content.length).toBeLessThan(200_000);
    }
  });

  it('小文件不截断 → 无 metadata', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/small.txt', 'hello');
    const ctx = createContext(fs);
    const result = await fileReadTool.call({ filePath: '/small.txt' }, ctx);
    expect(result.metadata).toBeUndefined();
    if (result.data.type === 'text') {
      expect(result.data.file.content).toBe('hello');
    }
  });
});

describe('FileReadTool — 安全声明', () => {
  it('isReadOnly → true', () => {
    expect(fileReadTool.isReadOnly({ filePath: '/test.txt' })).toBe(true);
  });

  it('isConcurrencySafe → true', () => {
    expect(fileReadTool.isConcurrencySafe({ filePath: '/test.txt' })).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    expect(fileReadTool.safetyLabel({ filePath: '/test.txt' })).toBe('readonly');
  });

  it('isDestructive → false', () => {
    expect(fileReadTool.isDestructive({ filePath: '/test.txt' })).toBe(false);
  });
});

describe('FileReadTool — description', () => {
  it('基本描述 → 含文件路径', async () => {
    const desc = await fileReadTool.description({ filePath: '/test.txt' });
    expect(desc).toContain('/test.txt');
  });

  it('offset 描述 → 含行范围', async () => {
    const desc = await fileReadTool.description({ filePath: '/test.txt', offset: 10, limit: 20 });
    expect(desc).toContain('10');
  });
});
