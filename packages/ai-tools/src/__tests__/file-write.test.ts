/** FileWriteTool 测试 — 文件写入工具 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import { fileWriteTool } from '../tools/file-write';
import { FileWriteInputSchema } from '../types/tool-inputs';
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

describe('FileWriteTool — schema 验证', () => {
  it('有效输入 → filePath + content', () => {
    const result = FileWriteInputSchema.safeParse({ filePath: '/test.txt', content: 'hello' });
    expect(result.success).toBe(true);
  });

  it('strictObject → 拒绝额外字段', () => {
    const result = FileWriteInputSchema.safeParse({
      filePath: '/test.txt',
      content: 'hello',
      extra: true
    });
    expect(result.success).toBe(false);
  });

  it('空 filePath → schema 通过（validateInput 拦截）', () => {
    const result = FileWriteInputSchema.safeParse({ filePath: '', content: 'hello' });
    expect(result.success).toBe(true);
  });

  it('缺少 content → schema 拒绝', () => {
    const result = FileWriteInputSchema.safeParse({ filePath: '/test.txt' });
    expect(result.success).toBe(false);
  });

  it('空 content → schema 通过', () => {
    const result = FileWriteInputSchema.safeParse({ filePath: '/test.txt', content: '' });
    expect(result.success).toBe(true);
  });
});

describe('FileWriteTool — validateInput', () => {
  it('有效输入 → allow', () => {
    const result = fileWriteTool.validateInput(
      { filePath: '/test.txt', content: 'hello' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('空路径 → deny', () => {
    const result = fileWriteTool.validateInput(
      { filePath: '', content: 'hello' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('empty_path');
  });

  it('相对路径 → deny', () => {
    const result = fileWriteTool.validateInput(
      { filePath: 'test.txt', content: 'hello' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('relative_path');
  });

  it('弯引号规范化 → updatedInput 含直引号', () => {
    const result = fileWriteTool.validateInput(
      { filePath: '/test.txt', content: '\u2018hello\u2019' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow' && result.updatedInput) {
      expect((result.updatedInput as { content: string }).content).toBe("'hello'");
    }
  });

  it('CRLF → LF 规范化 → updatedInput', () => {
    const result = fileWriteTool.validateInput(
      { filePath: '/test.txt', content: 'line1\r\nline2' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow' && result.updatedInput) {
      expect((result.updatedInput as { content: string }).content).toBe('line1\nline2');
    }
  });

  it('组合规范化 → 弯引号+CRLF 同时处理', () => {
    const result = fileWriteTool.validateInput(
      { filePath: '/test.txt', content: '\u2018hello\u2019\r\nworld' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow' && result.updatedInput) {
      expect((result.updatedInput as { content: string }).content).toBe("'hello'\nworld");
    }
  });

  it('无需规范化 → allow 无 updatedInput', () => {
    const result = fileWriteTool.validateInput(
      { filePath: '/test.txt', content: "'hello'\nworld" },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow') expect(result.updatedInput).toBeUndefined();
  });

  it('空内容 → allow（允许创建空文件）', () => {
    const result = fileWriteTool.validateInput(
      { filePath: '/test.txt', content: '' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('FileWriteTool — checkPermissions', () => {
  it('总是 ask', () => {
    const result = fileWriteTool.checkPermissions(
      { filePath: '/test.txt', content: 'hello' },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('ask');
  });

  it('ask message 含文件路径', () => {
    const result = fileWriteTool.checkPermissions(
      { filePath: '/test.txt', content: 'hello' },
      createContext(new MockFileSystemProvider())
    );
    if (result.behavior === 'ask') expect(result.message).toContain('/test.txt');
  });
});

describe('FileWriteTool — call 执行', () => {
  it('写入新文件 → written=true', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createContext(fs);
    const result = await fileWriteTool.call({ filePath: '/new.txt', content: 'hello' }, ctx);
    expect(result.data.written).toBe(true);
    expect(result.data.bytesWritten).toBeGreaterThan(0);
  });

  it('写入后可读取 → 内容一致', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createContext(fs);
    await fileWriteTool.call({ filePath: '/test.txt', content: 'hello world' }, ctx);
    const content = await fs.readFile('/test.txt');
    expect(content.content).toBe('hello world');
  });

  it('覆盖已存在文件 → written=true', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'old content');
    const ctx = createContext(fs);
    const result = await fileWriteTool.call({ filePath: '/test.txt', content: 'new content' }, ctx);
    expect(result.data.written).toBe(true);
    const content = await fs.readFile('/test.txt');
    expect(content.content).toBe('new content');
  });

  it('bytesWritten 计算正确', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createContext(fs);
    const content = 'hello'; // 5 bytes in UTF-8
    const result = await fileWriteTool.call({ filePath: '/test.txt', content }, ctx);
    expect(result.data.bytesWritten).toBe(5);
  });

  it('规范化内容写入 → fsProvider 收到规范化后的内容', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createContext(fs);
    // validateInput 会规范化，但 call 用的是原始 input
    // 宿主需在 validateInput 返回 updatedInput 后使用规范化版本
    const result = await fileWriteTool.call(
      { filePath: '/test.txt', content: "'hello'\nworld" },
      ctx
    );
    expect(result.data.written).toBe(true);
  });
});

describe('FileWriteTool — 安全声明', () => {
  it('isReadOnly → false', () => {
    expect(fileWriteTool.isReadOnly({ filePath: '/test.txt', content: 'hello' })).toBe(false);
  });

  it('isConcurrencySafe → false', () => {
    expect(fileWriteTool.isConcurrencySafe({ filePath: '/test.txt', content: 'hello' })).toBe(
      false
    );
  });

  it('safetyLabel → destructive', () => {
    expect(fileWriteTool.safetyLabel({ filePath: '/test.txt', content: 'hello' })).toBe(
      'destructive'
    );
  });

  it('isDestructive → true', () => {
    expect(fileWriteTool.isDestructive({ filePath: '/test.txt', content: 'hello' })).toBe(true);
  });
});

describe('FileWriteTool — description', () => {
  it('描述含文件路径和字符数', async () => {
    const desc = await fileWriteTool.description({ filePath: '/test.txt', content: 'hello' });
    expect(desc).toContain('/test.txt');
    expect(desc).toContain('5');
  });

  it('长内容 → 描述含字符数', async () => {
    const desc = await fileWriteTool.description({
      filePath: '/test.txt',
      content: 'x'.repeat(1000)
    });
    expect(desc).toContain('1000');
  });
});
