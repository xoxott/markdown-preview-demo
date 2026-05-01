/** 记忆路径 — 计算 + 安全验证 + PathTraversalError */

import type { MemoryPathConfig, MemoryPaths } from '../types/memory-path';

/** 路径遍历错误 — 自定义 Error 含 basePath + targetPath */
export class PathTraversalError extends Error {
  readonly basePath: string;
  readonly targetPath: string;

  constructor(basePath: string, targetPath: string) {
    super(`Path traversal detected: target "${targetPath}" escapes base "${basePath}"`);
    this.name = 'PathTraversalError';
    this.basePath = basePath;
    this.targetPath = targetPath;
  }
}

/** 计算记忆路径集 — 从配置生成所有目录和文件路径 */
export function computeMemoryPaths(config: MemoryPathConfig): MemoryPaths {
  const sanitized = config.sanitizedGitRoot ?? sanitizeGitRoot(config.projectRoot);
  const autoMemPath = `${config.baseDir}projects/${sanitized}/memory/`;

  return {
    autoMemPath,
    entrypointPath: `${autoMemPath}MEMORY.md`,
    teamDir: `${autoMemPath}team/`,
    privateDir: autoMemPath
  };
}

/**
 * 规范化 git root 为目录名 /Users/dev/my-project → Users-dev-my-project /Users/dev/.hidden →
 * Users-dev-hidden (路径中间的 . 也移除) 深层嵌套路径 → 全路径编码（非仅末级目录名）
 */
export function sanitizeGitRoot(gitRoot: string): string {
  // 移除前导 /，替换所有 / 为 -，移除所有前导 .（每段路径中的前导点也移除）
  let result = gitRoot
    .replace(/^\/+/, '') // 移除前导斜杠
    .replace(/\/\./g, '/.') // 保留点后斜杠不变（为下一步做准备）- 不需要
    .replace(/\/+/g, '-') // 斜杠 → 横杠
    .replace(/-\./g, '-') // 横杠后的点 → 移除 (e.g., dev-.hidden → dev-hidden)
    .replace(/^\.+/, ''); // 移除整体字符串前导点

  // 确保非空
  if (!result) result = 'default-project';

  return result;
}

/** 验证记忆路径安全性 — 拒绝危险路径 拒绝: 相对路径、root `/`、UNC `\\`、null bytes `\0`、tilde 遍历 `~..` */
export function validateMemoryPath(path: string): boolean {
  return validateMemoryPathDetailed(path).valid;
}

/** 详细验证 — 返回 valid + reason */
export function validateMemoryPathDetailed(path: string): { valid: boolean; reason?: string } {
  // UNC 路径（\\开头） — 先检查，因为不以 / 开头
  if (path.startsWith('\\')) {
    return { valid: false, reason: 'unc_path' };
  }

  // 相对路径
  if (!path.startsWith('/') && !path.startsWith('~')) {
    return { valid: false, reason: 'relative_path' };
  }

  // root `/`
  if (path === '/') {
    return { valid: false, reason: 'root_path' };
  }

  // null bytes
  if (path.includes('\0')) {
    return { valid: false, reason: 'null_bytes' };
  }

  // tilde 遍历
  if (path.includes('~..')) {
    return { valid: false, reason: 'tilde_traversal' };
  }

  return { valid: true };
}

/** 规范化路径键 — 仅允许 alphanumeric + `-` + `_` 拒绝: null bytes, URL-encoded 遍历, Unicode 规范化攻击, 反斜杠, 绝对路径 */
export function sanitizePathKey(key: string): string {
  // 拒绝危险字符
  if (key.includes('\0')) return '';
  if (key.includes('%2e%2e%2f') || key.includes('%2e%2e/') || key.includes('..%2f')) return '';
  if (key.startsWith('/') || key.startsWith('\\')) return '';

  // 仅保留 alphanumeric + hyphen + underscore
  return key.replace(/[^a-zA-Z0-9\-_]/g, '');
}

/** 构建 team 记忆文件路径 — <teamDir>/<sanitizedKey>.md */
export function buildTeamMemFilePath(teamDir: string, key: string): string {
  const sanitized = sanitizePathKey(key);
  if (!sanitized) throw new PathTraversalError(teamDir, key);
  return `${teamDir + sanitized}.md`;
}

/** 检查路径遍历 — target 是否逃离 basePath 解析 `..` 路径段后再比较 注: 完整版需宿主通过 MemoryStorageProvider.realpath() 检测符号链接 */
export function isPathTraversal(basePath: string, targetPath: string): boolean {
  const normalizedBase = basePath.replace(/\/+$/, '');
  // 简化 resolve: 移除 `..` 路径段
  const resolvedTarget = resolvePath(targetPath);

  if (!resolvedTarget.startsWith(`${normalizedBase}/`)) {
    return resolvedTarget !== normalizedBase;
  }

  return false;
}

/** 简化路径 resolve — 处理 .. 路径段 */
function resolvePath(path: string): string {
  const parts = path.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      resolved.pop();
    } else if (part !== '.' && part !== '') {
      resolved.push(part);
    }
  }
  return `/${resolved.join('/')}`;
}
