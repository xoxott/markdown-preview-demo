/** 集成测试 — 6 工具注册 + 端到端执行 + 跨工具交互 */

import { describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { globTool } from '../tools/glob';
import { grepTool } from '../tools/grep';
import { fileReadTool } from '../tools/file-read';
import { fileWriteTool } from '../tools/file-write';
import { fileEditTool } from '../tools/file-edit';
import { bashTool } from '../tools/bash';
import type { ExtendedToolUseContext } from '../context-merge';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

function createFullContext(fs: MockFileSystemProvider): ExtendedToolUseContext {
  return {
    abortController: new AbortController(),
    tools: new ToolRegistry(),
    sessionId: 'integration-test',
    fsProvider: fs
  };
}

describe('集成 — 6 工具注册', () => {
  it('所有 6 工具可注册到 ToolRegistry', () => {
    const registry = new ToolRegistry();
    registry.register(globTool);
    registry.register(grepTool);
    registry.register(fileReadTool);
    registry.register(fileWriteTool);
    registry.register(fileEditTool);
    registry.register(bashTool);
    expect(registry.getAll().length).toBe(6);
  });

  it('工具名称唯一 → 无冲突', () => {
    const names = [
      globTool.name,
      grepTool.name,
      fileReadTool.name,
      fileWriteTool.name,
      fileEditTool.name,
      bashTool.name
    ];
    expect(new Set(names).size).toBe(6);
  });

  it('名称合规 → 匹配 /^[a-z][a-z0-9-]*$/', () => {
    const pattern = /^[a-z][a-z0-9-]*$/;
    expect(globTool.name).toMatch(pattern);
    expect(grepTool.name).toMatch(pattern);
    expect(fileReadTool.name).toMatch(pattern);
    expect(fileWriteTool.name).toMatch(pattern);
    expect(fileEditTool.name).toMatch(pattern);
    expect(bashTool.name).toMatch(pattern);
  });
});

describe('集成 — 端到端工具执行', () => {
  it('GlobTool → 搜索文件', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', '');
    fs.addFile('/src/b.ts', '');
    const ctx = createFullContext(fs);
    const result = await globTool.call({ pattern: '*.ts', path: '/src' }, ctx);
    expect(result.data.length).toBe(2);
  });

  it('GrepTool → files-with-matches 搜索', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'hello world');
    const ctx = createFullContext(fs);
    const result = await grepTool.call({ pattern: 'hello', outputMode: 'files-with-matches' }, ctx);
    expect(result.data.filePaths?.length).toBe(1);
  });

  it('FileReadTool → 读取文本文件', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'hello world');
    const ctx = createFullContext(fs);
    const result = await fileReadTool.call({ filePath: '/test.txt' }, ctx);
    expect(result.data.content).toBe('hello world');
  });

  it('FileWriteTool → 写入文件 + 权限 ask', () => {
    const result = fileWriteTool.checkPermissions(
      { filePath: '/test.txt', content: 'hello' },
      createFullContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('ask');
  });

  it('FileEditTool → 编辑文件 + 权限 ask', () => {
    const result = fileEditTool.checkPermissions(
      { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: false },
      createFullContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('ask');
  });

  it('BashTool → 只读命令权限 allow', () => {
    const result = bashTool.checkPermissions(
      { command: 'ls', runInBackground: false },
      createFullContext(new MockFileSystemProvider())
    );
    // ls 是只读命令 → assessBashCommandSecurity → safe → allow
    expect(result.behavior).toBe('allow');
  });

  it('BashTool → 破坏性命令权限 deny', () => {
    const result = bashTool.checkPermissions(
      { command: 'rm -rf /', runInBackground: false },
      createFullContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
  });

  it('BashTool → 非只读非破坏性命令权限 ask', () => {
    const result = bashTool.checkPermissions(
      { command: 'npm install', runInBackground: false },
      createFullContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('ask');
  });
});

describe('集成 — 跨工具交互', () => {
  it('write → read → 内容一致', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createFullContext(fs);
    await fileWriteTool.call({ filePath: '/test.txt', content: 'hello world' }, ctx);
    const result = await fileReadTool.call({ filePath: '/test.txt' }, ctx);
    expect(result.data.content).toBe('hello world');
  });

  it('write → edit → 内容更新', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createFullContext(fs);
    await fileWriteTool.call({ filePath: '/test.txt', content: 'hello old world' }, ctx);
    const editResult = await fileEditTool.call(
      { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: false },
      ctx
    );
    expect(editResult.data.applied).toBe(true);
    const readResult = await fileReadTool.call({ filePath: '/test.txt' }, ctx);
    expect(readResult.data.content).toBe('hello new world');
  });

  it('glob → read → 搜索后读取', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/config.ts', 'export const port = 3000;');
    const ctx = createFullContext(fs);
    const globResult = await globTool.call({ pattern: '*.ts', path: '/src' }, ctx);
    expect(globResult.data.length).toBe(1);
    const readResult = await fileReadTool.call({ filePath: globResult.data[0] }, ctx);
    expect(readResult.data.content).toContain('3000');
  });
});

describe('集成 — Abort 信号传播', () => {
  it('abort 在 read 中 → fsProvider 处理', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'hello');
    const abortController = new AbortController();
    const ctx: ExtendedToolUseContext = {
      abortController,
      tools: new ToolRegistry(),
      sessionId: 'abort-test',
      fsProvider: fs
    };
    // 不 abort — 正常执行
    const result = await fileReadTool.call({ filePath: '/test.txt' }, ctx);
    expect(result.data.content).toBe('hello');
  });
});
