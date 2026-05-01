/** BashTool 测试 — Shell 命令执行工具 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import { bashTool } from '../tools/bash';
import { BashInputSchema } from '../types/tool-inputs';
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

describe('BashTool — schema 验证', () => {
  it('最小有效输入 → command', () => {
    const result = BashInputSchema.safeParse({ command: 'ls' });
    expect(result.success).toBe(true);
  });

  it('含 timeout → 有效', () => {
    const result = BashInputSchema.safeParse({ command: 'ls', timeout: 30000 });
    expect(result.success).toBe(true);
  });

  it('含 description → 有效', () => {
    const result = BashInputSchema.safeParse({ command: 'ls', description: 'List files' });
    expect(result.success).toBe(true);
  });

  it('含 runInBackground → 有效', () => {
    const result = BashInputSchema.safeParse({ command: 'sleep 10', runInBackground: true });
    expect(result.success).toBe(true);
  });

  it('strictObject → 拒绝额外字段', () => {
    const result = BashInputSchema.safeParse({ command: 'ls', extra: true });
    expect(result.success).toBe(false);
  });

  it('空 command → schema 通过（validateInput 拦截）', () => {
    const result = BashInputSchema.safeParse({ command: '' });
    expect(result.success).toBe(true);
  });

  it('timeout > 600000 → schema 通过（validateInput 拦截）', () => {
    const result = BashInputSchema.safeParse({ command: 'ls', timeout: 700000 });
    expect(result.success).toBe(true);
  });
});

describe('BashTool — validateInput', () => {
  it('有效命令 → allow', () => {
    const result = bashTool.validateInput(
      { command: 'ls', runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('空命令 → deny', () => {
    const result = bashTool.validateInput(
      { command: '', runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('empty_command');
  });

  it('timeout > 600000 → deny', () => {
    const result = bashTool.validateInput(
      { command: 'ls', timeout: 700000, runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('timeout_exceeded');
  });

  it('timeout = 600000 → allow（边界值）', () => {
    const result = bashTool.validateInput(
      { command: 'ls', timeout: 600000, runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('含 description → allow', () => {
    const result = bashTool.validateInput(
      { command: 'ls', description: 'List files', runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('含 runInBackground → allow', () => {
    const result = bashTool.validateInput(
      { command: 'sleep 10', runInBackground: true },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('BashTool — checkPermissions', () => {
  it('总是 ask', () => {
    const result = bashTool.checkPermissions(
      { command: 'ls', runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('ask');
  });

  it('有 description → message 含 description', () => {
    const result = bashTool.checkPermissions(
      { command: 'ls', description: 'List files', runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    if (result.behavior === 'ask') expect(result.message).toBe('List files');
  });

  it('无 description → message 含命令', () => {
    const result = bashTool.checkPermissions(
      { command: 'ls -la', runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    if (result.behavior === 'ask') expect(result.message).toContain('ls -la');
  });

  it('message 格式正确', () => {
    const result = bashTool.checkPermissions(
      { command: 'npm test', runInBackground: false },
      createContext(new MockFileSystemProvider())
    );
    if (result.behavior === 'ask') expect(result.message).toBeDefined();
  });
});

describe('BashTool — call 执行', () => {
  it('基本命令 → exitCode=0', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('ls', { exitCode: 0, stdout: 'a.txt b.txt', stderr: '', timedOut: false });
    const ctx = createContext(fs);
    const result = await bashTool.call({ command: 'ls', runInBackground: false }, ctx);
    expect(result.data.exitCode).toBe(0);
    expect(result.data.stdout).toBe('a.txt b.txt');
  });

  it('命令带 timeout → 传递给 fsProvider', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('sleep 1', { exitCode: 0, stdout: '', stderr: '', timedOut: false });
    const ctx = createContext(fs);
    const result = await bashTool.call(
      { command: 'sleep 1', timeout: 5000, runInBackground: false },
      ctx
    );
    expect(result.data.exitCode).toBe(0);
  });

  it('命令失败 → exitCode 非 0', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('false', { exitCode: 1, stdout: '', stderr: 'error', timedOut: false });
    const ctx = createContext(fs);
    const result = await bashTool.call({ command: 'false', runInBackground: false }, ctx);
    expect(result.data.exitCode).toBe(1);
    expect(result.data.stderr).toBe('error');
  });

  it('超时终止 → timedOut=true', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('long-cmd', {
      exitCode: -1,
      stdout: '',
      stderr: 'timed out',
      timedOut: true
    });
    const ctx = createContext(fs);
    const result = await bashTool.call(
      { command: 'long-cmd', timeout: 1000, runInBackground: false },
      ctx
    );
    expect(result.data.timedOut).toBe(true);
  });

  it('stdout 截断 → metadata.truncated=true', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('big-output', {
      exitCode: 0,
      stdout: 'x'.repeat(200_000),
      stderr: '',
      timedOut: false
    });
    const ctx = createContext(fs);
    const result = await bashTool.call({ command: 'big-output', runInBackground: false }, ctx);
    expect(result.metadata?.truncated).toBe(true);
    expect(result.data.stdout.length).toBeLessThan(200_000);
  });

  it('stderr 截断 → metadata.truncated=true', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('error-output', {
      exitCode: 1,
      stdout: '',
      stderr: 'e'.repeat(200_000),
      timedOut: false
    });
    const ctx = createContext(fs);
    const result = await bashTool.call({ command: 'error-output', runInBackground: false }, ctx);
    expect(result.metadata?.truncated).toBe(true);
  });

  it('小输出不截断 → 无 metadata', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('ls', { exitCode: 0, stdout: 'a.txt', stderr: '', timedOut: false });
    const ctx = createContext(fs);
    const result = await bashTool.call({ command: 'ls', runInBackground: false }, ctx);
    expect(result.metadata).toBeUndefined();
  });

  it('未预置命令 → 使用默认结果', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createContext(fs);
    const result = await bashTool.call({ command: 'unknown-cmd', runInBackground: false }, ctx);
    expect(result.data.exitCode).toBe(0);
  });

  it('description 不影响执行', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('ls', { exitCode: 0, stdout: 'files', stderr: '', timedOut: false });
    const ctx = createContext(fs);
    const result = await bashTool.call(
      { command: 'ls', description: 'List files', runInBackground: false },
      ctx
    );
    expect(result.data.stdout).toBe('files');
  });

  it('background 命令 → 传递 runInBackground', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('sleep 10', { exitCode: 0, stdout: '', stderr: '', timedOut: false });
    const ctx = createContext(fs);
    const result = await bashTool.call({ command: 'sleep 10', runInBackground: true }, ctx);
    expect(result.data.exitCode).toBe(0);
  });
});

describe('BashTool — 安全声明', () => {
  it('isReadOnly → false', () => {
    expect(bashTool.isReadOnly({ command: 'ls', runInBackground: false })).toBe(false);
  });

  it('isConcurrencySafe → false', () => {
    expect(bashTool.isConcurrencySafe({ command: 'ls', runInBackground: false })).toBe(false);
  });

  it('safetyLabel → system（最保守）', () => {
    expect(bashTool.safetyLabel({ command: 'ls', runInBackground: false })).toBe('system');
  });

  it('isDestructive → false', () => {
    expect(bashTool.isDestructive({ command: 'ls', runInBackground: false })).toBe(false);
  });

  it('toAutoClassifierInput → safetyLabel=system', () => {
    const classifierInput = bashTool.toAutoClassifierInput({
      command: 'ls',
      runInBackground: false
    });
    expect(classifierInput.safetyLabel).toBe('system');
    expect(classifierInput.isReadOnly).toBe(false);
  });

  it('maxResultSizeChars → 100000', () => {
    expect(bashTool.maxResultSizeChars).toBe(100_000);
  });
});

describe('BashTool — description', () => {
  it('无 description → 使用命令前 50 字符', async () => {
    const desc = await bashTool.description({
      command: 'ls -la /home/user',
      runInBackground: false
    });
    expect(desc).toContain('ls -la /home/user');
  });

  it('有 description → 使用 description', async () => {
    const desc = await bashTool.description({
      command: 'ls',
      description: 'List files',
      runInBackground: false
    });
    expect(desc).toContain('List files');
  });
});
