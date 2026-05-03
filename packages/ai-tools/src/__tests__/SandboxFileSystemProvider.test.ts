/**
 * P50 测试 — SandboxFileSystemProvider 装饰器 + pathMatchesPattern + isPathAllowed + buildProviderMap
 * sandbox 贯通
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SandboxSettings } from '@suga/ai-sdk';
import { buildProviderMap } from '@suga/ai-runtime';
import type { RuntimeConfig } from '@suga/ai-runtime';
import { SandboxIgnoreViolationsSchema, SandboxSettingsSchema } from '@suga/ai-sdk';
import type {
  CommandResult,
  FileLsEntry,
  FileSystemProvider,
  GrepResult
} from '../types/fs-provider';
import {
  SandboxDenyError,
  SandboxFileSystemProvider,
  isPathAllowed,
  pathMatchesPattern
} from '../provider/SandboxFileSystemProvider';

// ============================================================
// Mock FileSystemProvider
// ============================================================

function createMockFsProvider(): FileSystemProvider {
  return {
    stat: vi.fn().mockResolvedValue({
      exists: true,
      isFile: true,
      isDirectory: false,
      size: 100,
      mtimeMs: Date.now()
    }),
    readFile: vi.fn().mockResolvedValue({
      content: 'hello',
      mimeType: 'text/plain',
      lineCount: 1,
      mtimeMs: Date.now()
    }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    editFile: vi.fn().mockResolvedValue({ applied: true, replacementCount: 1 }),
    glob: vi.fn().mockResolvedValue(['/tmp/a.ts', '/tmp/b.ts', '/etc/passwd']),
    grep: vi.fn().mockResolvedValue({
      mode: 'files-with-matches',
      filePaths: ['/tmp/a.ts', '/tmp/b.ts', '/etc/shadow'],
      totalMatches: 3
    } as GrepResult),
    ls: vi
      .fn()
      .mockResolvedValue([
        { name: 'a.ts', type: 'file', size: 100, mtimeMs: Date.now() } as FileLsEntry
      ]),
    runCommand: vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: 'ok',
      stderr: '',
      timedOut: false
    } as CommandResult)
  };
}

// ============================================================
// pathMatchesPattern tests
// ============================================================

describe('pathMatchesPattern', () => {
  it('精确匹配 → true', () => {
    expect(pathMatchesPattern('/etc/passwd', '/etc/passwd')).toBe(true);
  });

  it('精确不匹配 → false', () => {
    expect(pathMatchesPattern('/etc/shadow', '/etc/passwd')).toBe(false);
  });

  it('/** 后缀 → 匹配前缀路径和子路径', () => {
    expect(pathMatchesPattern('/tmp', '/tmp/**')).toBe(true);
    expect(pathMatchesPattern('/tmp/foo', '/tmp/**')).toBe(true);
    expect(pathMatchesPattern('/tmp/foo/bar.ts', '/tmp/**')).toBe(true);
    expect(pathMatchesPattern('/tmpx', '/tmp/**')).toBe(false);
  });

  it('单层 * → 匹配单路径段', () => {
    expect(pathMatchesPattern('/home/user/docs', '/home/*/docs')).toBe(true);
    expect(pathMatchesPattern('/home/user/sub/docs', '/home/*/docs')).toBe(false);
  });

  it('多层 ** → 匹配任意路径段', () => {
    expect(pathMatchesPattern('/src/utils/helpers.ts', '/src/**/helpers.ts')).toBe(true);
    expect(pathMatchesPattern('/src/deep/nested/helpers.ts', '/src/**/helpers.ts')).toBe(true);
    // /src/helpers.ts 无中间路径段 → 不匹配 /src/**/helpers.ts（**需至少一层）
    expect(pathMatchesPattern('/src/helpers.ts', '/src/**/helpers.ts')).toBe(false);
    // 但匹配 /src/helpers.ts 精确模式
    expect(pathMatchesPattern('/src/helpers.ts', '/src/helpers.ts')).toBe(true);
  });

  it('尾部斜杠规范化', () => {
    expect(pathMatchesPattern('/tmp/', '/tmp')).toBe(true);
    expect(pathMatchesPattern('/tmp', '/tmp/')).toBe(true);
  });
});

// ============================================================
// isPathAllowed tests
// ============================================================

describe('isPathAllowed', () => {
  it('无 filesystem 配置 → 允许所有', () => {
    const settings: SandboxSettings = {};
    expect(isPathAllowed('/any/path', settings).allowed).toBe(true);
  });

  it('deny 规则优先 — 匹配 deny → 拒绝', () => {
    const settings: SandboxSettings = {
      filesystem: { deny: ['/etc/**'] }
    };
    expect(isPathAllowed('/etc/passwd', settings).allowed).toBe(false);
  });

  it('deny 规则 — 不匹配 → 允许', () => {
    const settings: SandboxSettings = {
      filesystem: { deny: ['/etc/**'] }
    };
    expect(isPathAllowed('/tmp/file', settings).allowed).toBe(true);
  });

  it('allow 白名单 — 在白名单内 → 允许', () => {
    const settings: SandboxSettings = {
      filesystem: { allow: ['/tmp/**', '/home/user/**'] }
    };
    expect(isPathAllowed('/tmp/file', settings).allowed).toBe(true);
  });

  it('allow 白名单 — 不在白名单内 → 拒绝', () => {
    const settings: SandboxSettings = {
      filesystem: { allow: ['/tmp/**'] }
    };
    const result = isPathAllowed('/etc/passwd', settings);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.rule).toBe('allow_list');
  });

  it('deny + allow 同时存在 → deny 优先', () => {
    const settings: SandboxSettings = {
      filesystem: {
        allow: ['/tmp/**', '/etc/**'],
        deny: ['/etc/shadow']
      }
    };
    // /etc/passwd 在 allow 且不在 deny → 允许
    expect(isPathAllowed('/etc/passwd', settings).allowed).toBe(true);
    // /etc/shadow 在 deny → 拒绝（即使也在 allow）
    expect(isPathAllowed('/etc/shadow', settings).allowed).toBe(false);
  });
});

// ============================================================
// SandboxFileSystemProvider 装饰器 tests
// ============================================================

describe('SandboxFileSystemProvider', () => {
  let provider: SandboxFileSystemProvider;
  let inner: FileSystemProvider;
  let sandbox: SandboxSettings;

  beforeEach(() => {
    inner = createMockFsProvider();
    sandbox = {
      filesystem: {
        allow: ['/tmp/**', '/home/user/**'],
        deny: ['/etc/shadow', '/etc/**/secret*']
      }
    };
    provider = new SandboxFileSystemProvider({ inner, sandbox });
  });

  it('stat — 允许路径 → 正常调用', async () => {
    const result = await provider.stat('/tmp/file');
    expect(result.exists).toBe(true);
    expect(inner.stat).toHaveBeenCalledWith('/tmp/file');
  });

  it('stat — deny 路径 → SandboxDenyError', async () => {
    await expect(provider.stat('/etc/shadow')).rejects.toThrow(SandboxDenyError);
    await expect(provider.stat('/etc/shadow')).rejects.toThrow(/Sandbox denied/);
  });

  it('readFile — 允许路径 → 正常调用', async () => {
    const result = await provider.readFile('/tmp/file');
    expect(result.content).toBe('hello');
  });

  it('readFile — deny 路径 → SandboxDenyError', async () => {
    await expect(provider.readFile('/etc/passwd')).rejects.toThrow(SandboxDenyError);
  });

  it('writeFile — 允许路径 → 正常调用', async () => {
    await provider.writeFile('/tmp/file', 'content');
    expect(inner.writeFile).toHaveBeenCalledWith('/tmp/file', 'content');
  });

  it('writeFile — deny 路径 → SandboxDenyError', async () => {
    await expect(provider.writeFile('/etc/secret', 'content')).rejects.toThrow(SandboxDenyError);
  });

  it('editFile — 允许路径 → 正常调用', async () => {
    const result = await provider.editFile('/tmp/file', 'old', 'new');
    expect(result.applied).toBe(true);
  });

  it('editFile — deny 路径 → SandboxDenyError', async () => {
    await expect(provider.editFile('/etc/shadow', 'old', 'new')).rejects.toThrow(SandboxDenyError);
  });

  it('glob — 过滤结果中不符合沙箱规则的路径', async () => {
    const results = await provider.glob('**/*.ts', '/tmp');
    // mock 返回 ['/tmp/a.ts', '/tmp/b.ts', '/etc/passwd']
    // /etc/passwd 被 deny 过滤掉
    expect(results).toEqual(['/tmp/a.ts', '/tmp/b.ts']);
  });

  it('grep — filePaths 模式过滤', async () => {
    const result = await provider.grep('pattern', {
      outputMode: 'files-with-matches',
      path: '/tmp'
    });
    // mock 返回 filePaths: ['/tmp/a.ts', '/tmp/b.ts', '/etc/shadow']
    // /etc/shadow 被 deny 过滤掉
    expect(result.filePaths!.length).toBe(2);
    expect(result.filePaths).not.toContain('/etc/shadow');
  });

  it('ls — deny 路径 → SandboxDenyError', async () => {
    await expect(provider.ls('/etc')).rejects.toThrow(SandboxDenyError);
  });

  it('runCommand — cwd 被 deny → SandboxDenyError', async () => {
    await expect(provider.runCommand('ls', { cwd: '/etc' })).rejects.toThrow(SandboxDenyError);
  });

  it('runCommand — 无 cwd 或允许 cwd → 正常调用', async () => {
    const result = await provider.runCommand('ls', { cwd: '/tmp' });
    expect(result.exitCode).toBe(0);
  });

  it('SandboxDenyError — 包含路径和规则信息', () => {
    const err = new SandboxDenyError('/etc/shadow', '/etc/shadow');
    expect(err.name).toBe('SandboxDenyError');
    expect(err.path).toBe('/etc/shadow');
    expect(err.rule).toBe('/etc/shadow');
    expect(err.message).toContain('/etc/shadow');
  });
});

// ============================================================
// Schema 修复测试
// ============================================================

describe('SandboxSettingsSchema 修复', () => {
  it('ignoreViolations 字段现在被 schema 校验', () => {
    const result = SandboxSettingsSchema.safeParse({
      network: { deny: ['evil.com'] },
      filesystem: { allow: ['/tmp'] },
      ignoreViolations: { network: ['localhost'], filesystem: ['/dev/null'] }
    });
    expect(result.success).toBe(true);
  });

  it('SandboxIgnoreViolationsSchema 校验', () => {
    const result = SandboxIgnoreViolationsSchema.safeParse({
      network: ['localhost'],
      filesystem: ['/dev/null']
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// buildProviderMap sandbox 贯通测试
// ============================================================

describe('buildProviderMap sandbox 贯通', () => {
  it('sandbox 配置 → fsProvider 被 SandboxFileSystemProvider 包装', () => {
    const mockFs = createMockFsProvider();
    const config: RuntimeConfig = {
      provider: {} as any,
      fsProvider: mockFs,
      sandbox: {
        filesystem: { allow: ['/tmp/**'] }
      }
    };

    const providerMap = buildProviderMap(config);

    expect(providerMap.fsProvider).toBeInstanceOf(SandboxFileSystemProvider);
  });

  it('无 sandbox 配置 → fsProvider 不被包装', () => {
    const mockFs = createMockFsProvider();
    const config: RuntimeConfig = {
      provider: {} as any,
      fsProvider: mockFs
    };

    const providerMap = buildProviderMap(config);

    expect(providerMap.fsProvider).toBe(mockFs);
  });
});
