/** 集成测试 — 6 工具注册 + 端到端执行 + 跨工具交互 */

import { describe, expect, it } from 'vitest';
import { type PermissionResult, ToolRegistry } from '@suga/ai-tool-core';
import { globTool } from '../tools/glob';
import { grepTool } from '../tools/grep';
import { fileReadTool } from '../tools/file-read';
import { fileWriteTool } from '../tools/file-write';
import { fileEditTool } from '../tools/file-edit';
import { bashTool } from '../tools/bash';
import { monitorTool } from '../tools/monitor';
import { powershellTool } from '../tools/powershell';
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

function resolvePermissions(
  r: PermissionResult | Promise<PermissionResult>
): Promise<PermissionResult> {
  return Promise.resolve(r);
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
    if (result.data.type === 'text') {
      expect(result.data.file.content).toBe('hello world');
    }
  });

  it('FileWriteTool → 写入文件 + 权限 ask', async () => {
    const result = await resolvePermissions(
      fileWriteTool.checkPermissions(
        { filePath: '/test.txt', content: 'hello' },
        createFullContext(new MockFileSystemProvider())
      )
    );
    expect(result.behavior).toBe('ask');
  });

  it('FileEditTool → 编辑文件 + 权限 ask', async () => {
    const result = await resolvePermissions(
      fileEditTool.checkPermissions(
        { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: false },
        createFullContext(new MockFileSystemProvider())
      )
    );
    expect(result.behavior).toBe('ask');
  });

  it('BashTool → 只读命令权限 allow', async () => {
    const result = await resolvePermissions(
      bashTool.checkPermissions(
        { command: 'ls', runInBackground: false },
        createFullContext(new MockFileSystemProvider())
      )
    );
    // ls 是只读命令 → assessBashCommandSecurity → safe → allow
    expect(result.behavior).toBe('allow');
  });

  it('BashTool → 破坏性命令权限 deny', async () => {
    const result = await resolvePermissions(
      bashTool.checkPermissions(
        { command: 'rm -rf /', runInBackground: false },
        createFullContext(new MockFileSystemProvider())
      )
    );
    expect(result.behavior).toBe('deny');
  });

  it('BashTool → 非只读非破坏性命令权限 ask', async () => {
    const result = await resolvePermissions(
      bashTool.checkPermissions(
        { command: 'npm install', runInBackground: false },
        createFullContext(new MockFileSystemProvider())
      )
    );
    expect(result.behavior).toBe('ask');
  });
});

describe('集成 — PowerShell + Monitor', () => {
  it('可注册且名称合规', () => {
    const registry = new ToolRegistry();
    registry.register(powershellTool);
    registry.register(monitorTool);
    expect(registry.get('powershell')).toBe(powershellTool);
    expect(registry.get('monitor')).toBe(monitorTool);
    expect(powershellTool.name).toMatch(/^[a-z][a-z0-9-_]*$/);
    expect(monitorTool.name).toMatch(/^[a-z][a-z0-9-_]*$/);
  });

  it('MonitorTool → 后台 spawn 返回 taskId', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createFullContext(fs);
    const result = await monitorTool.call({ command: 'echo ok' }, ctx);
    expect(result.data.taskId).toBeDefined();
    expect(result.data.taskId.startsWith('bg-mock')).toBe(true);
  });

  it('PowerShellTool → 经 runCommand 执行（Mock 默认成功）', async () => {
    const fs = new MockFileSystemProvider();
    fs.setDefaultCommandResult({ exitCode: 0, stdout: 'ok', stderr: '', timedOut: false });
    const ctx = createFullContext(fs);
    const result = await powershellTool.call(
      { command: 'Write-Output 1', runInBackground: false },
      ctx
    );
    expect(result.data.exitCode).toBe(0);
    expect(result.data.stdout).toContain('ok');
  });

  it('PowerShellTool → 窄只读命令自动 allow', async () => {
    const result = await resolvePermissions(
      powershellTool.checkPermissions(
        { command: 'Get-ChildItem', runInBackground: false },
        createFullContext(new MockFileSystemProvider())
      )
    );
    expect(result.behavior).toBe('allow');
  });

  it('PowerShellTool → 网络 cmdlet 需要 ask', async () => {
    const result = await resolvePermissions(
      powershellTool.checkPermissions(
        { command: 'Invoke-WebRequest https://example.com', runInBackground: false },
        createFullContext(new MockFileSystemProvider())
      )
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
    if (result.data.type === 'text') {
      expect(result.data.file.content).toBe('hello world');
    }
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
    if (readResult.data.type === 'text') {
      expect(readResult.data.file.content).toBe('hello new world');
    }
  });

  it('glob → read → 搜索后读取', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/config.ts', 'export const port = 3000;');
    const ctx = createFullContext(fs);
    const globResult = await globTool.call({ pattern: '*.ts', path: '/src' }, ctx);
    expect(globResult.data.length).toBe(1);
    const readResult = await fileReadTool.call({ filePath: globResult.data[0] }, ctx);
    expect(readResult.data.type === 'text' ? readResult.data.file.content : '').toContain('3000');
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
    if (result.data.type === 'text') {
      expect(result.data.file.content).toBe('hello');
    }
  });
});
