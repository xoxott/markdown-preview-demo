/** MemoryPaths 测试 — 路径计算 + 安全验证 + PathTraversalError */

import { describe, expect, it } from 'vitest';
import {
  PathTraversalError,
  buildTeamMemFilePath,
  computeMemoryPaths,
  isPathTraversal,
  sanitizeGitRoot,
  sanitizePathKey,
  validateMemoryPath,
  validateMemoryPathDetailed
} from '../core/memory-paths';

describe('MemoryPaths — computeMemoryPaths', () => {
  it('基本配置 → 生成 4 个路径', () => {
    const paths = computeMemoryPaths({
      baseDir: '/home/.claude/',
      projectRoot: '/Users/dev/my-project'
    });
    expect(paths.autoMemPath).toContain('memory/');
    expect(paths.entrypointPath).toContain('MEMORY.md');
    expect(paths.teamDir).toContain('team/');
    expect(paths.privateDir).toBe(paths.autoMemPath);
  });

  it('预计算 sanitizedGitRoot → 直接使用', () => {
    const paths = computeMemoryPaths({
      baseDir: '/home/.claude/',
      projectRoot: '/Users/dev/project',
      sanitizedGitRoot: 'custom-name'
    });
    expect(paths.autoMemPath).toContain('custom-name');
  });

  it('路径结构正确', () => {
    const paths = computeMemoryPaths({
      baseDir: '/home/.claude/',
      projectRoot: '/Users/dev/my-app'
    });
    expect(paths.entrypointPath).toBe(`${paths.autoMemPath}MEMORY.md`);
    expect(paths.teamDir).toBe(`${paths.autoMemPath}team/`);
  });
});

describe('MemoryPaths — sanitizeGitRoot', () => {
  it('正常路径 → 移除前导斜杠，替换 / 为 -', () => {
    expect(sanitizeGitRoot('/Users/dev/my-project')).toBe('Users-dev-my-project');
  });

  it('前导点 → 移除', () => {
    expect(sanitizeGitRoot('/Users/dev/.hidden')).toBe('Users-dev-hidden');
  });

  it('多层嵌套 → 全路径编码', () => {
    expect(sanitizeGitRoot('/Users/dev/projects/app')).toBe('Users-dev-projects-app');
  });

  it('空路径 → default-project', () => {
    expect(sanitizeGitRoot('')).toBe('default-project');
  });

  it('仅斜杠 → default-project', () => {
    expect(sanitizeGitRoot('/')).toBe('default-project');
  });
});

describe('MemoryPaths — validateMemoryPath', () => {
  it('有效绝对路径 → true', () => {
    expect(validateMemoryPath('/home/.claude/memory')).toBe(true);
    expect(validateMemoryPath('/Users/dev/project')).toBe(true);
  });

  it('相对路径 → false', () => {
    expect(validateMemoryPath('relative/path')).toBe(false);
  });

  it('root `/` → false', () => {
    expect(validateMemoryPath('/')).toBe(false);
  });

  it('UNC 路径 → false', () => {
    expect(validateMemoryPath('\\server\\share')).toBe(false);
  });

  it('null bytes → false', () => {
    expect(validateMemoryPath('/home/\0/memory')).toBe(false);
  });

  it('tilde 遍历 → false', () => {
    expect(validateMemoryPath('/home/~..')).toBe(false);
  });

  it('~ 开头有效路径 → true', () => {
    expect(validateMemoryPath('~/.claude/memory')).toBe(true);
  });
});

describe('MemoryPaths — validateMemoryPathDetailed', () => {
  it('相对路径 → reason=relative_path', () => {
    const result = validateMemoryPathDetailed('relative/path');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('relative_path');
  });

  it('root → reason=root_path', () => {
    const result = validateMemoryPathDetailed('/');
    expect(result.reason).toBe('root_path');
  });

  it('UNC → reason=unc_path', () => {
    const result = validateMemoryPathDetailed('\\\\server\\share');
    expect(result.reason).toBe('unc_path');
  });

  it('null bytes → reason=null_bytes', () => {
    const result = validateMemoryPathDetailed('/\0path');
    expect(result.reason).toBe('null_bytes');
  });

  it('tilde 遍历 → reason=tilde_traversal', () => {
    const result = validateMemoryPathDetailed('/home/~..');
    expect(result.reason).toBe('tilde_traversal');
  });

  it('有效 → reason undefined', () => {
    const result = validateMemoryPathDetailed('/home/memory');
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe('MemoryPaths — sanitizePathKey', () => {
  it('有效 alphanumeric → 不改变', () => {
    expect(sanitizePathKey('my-project')).toBe('my-project');
    expect(sanitizePathKey('project_123')).toBe('project_123');
  });

  it('特殊字符 → 移除', () => {
    expect(sanitizePathKey('my project')).toBe('myproject');
    expect(sanitizePathKey('path/to/file')).toBe('pathtofile');
  });

  it('null bytes → 空字符串', () => {
    expect(sanitizePathKey('path\0file')).toBe('');
  });

  it('URL-encoded 遍历 → 空字符串', () => {
    expect(sanitizePathKey('%2e%2e%2f')).toBe('');
    expect(sanitizePathKey('..%2fpath')).toBe('');
  });

  it('绝对路径 → 空字符串', () => {
    expect(sanitizePathKey('/absolute')).toBe('');
  });

  it('反斜杠 → 空字符串', () => {
    expect(sanitizePathKey('\\path')).toBe('');
  });
});

describe('MemoryPaths — buildTeamMemFilePath', () => {
  it('有效 key → 正确路径', () => {
    const result = buildTeamMemFilePath('/mem/team/', 'my-entry');
    expect(result).toBe('/mem/team/my-entry.md');
  });

  it('无效 key → 抛 PathTraversalError', () => {
    expect(() => buildTeamMemFilePath('/mem/team/', '\0path')).toThrow(PathTraversalError);
  });

  it('key 含特殊字符 → 规范化后拼接', () => {
    const result = buildTeamMemFilePath('/mem/team/', 'my entry name');
    expect(result).toBe('/mem/team/myentryname.md');
  });
});

describe('MemoryPaths — isPathTraversal', () => {
  it('target 在 base 内 → false', () => {
    expect(isPathTraversal('/mem/', '/mem/user.md')).toBe(false);
    expect(isPathTraversal('/mem/', '/mem/team/project.md')).toBe(false);
  });

  it('target 等于 base → false', () => {
    expect(isPathTraversal('/mem/', '/mem/')).toBe(false);
  });

  it('target 逃离 base → true', () => {
    expect(isPathTraversal('/mem/', '/etc/passwd')).toBe(true);
    expect(isPathTraversal('/mem/', '/home/user')).toBe(true);
  });

  it('target 试图用 ../ 遍历 → true', () => {
    expect(isPathTraversal('/mem/', '/mem/../etc')).toBe(true);
  });
});

describe('MemoryPaths — PathTraversalError', () => {
  it('构造 → 含 basePath + targetPath', () => {
    const err = new PathTraversalError('/mem/', '/etc/passwd');
    expect(err.name).toBe('PathTraversalError');
    expect(err.basePath).toBe('/mem/');
    expect(err.targetPath).toBe('/etc/passwd');
    expect(err.message).toContain('/etc/passwd');
    expect(err.message).toContain('/mem/');
  });

  it('是 Error 实例', () => {
    const err = new PathTraversalError('/base/', '/target/');
    expect(err instanceof Error).toBe(true);
  });
});
