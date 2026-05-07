/**
 * SandboxFileSystemProvider — 装饰器模式，在 FileSystemProvider 之上加入 allow/deny 过滤
 *
 * 包裹底层 FileSystemProvider（如 NodeFileSystemProvider），在每个 I/O 操作前 检查 SandboxSettings 的 filesystem
 * allow/deny 规则：
 *
 * - deny 规则优先：路径匹配 deny 列表 → 直接拒绝访问
 * - allow 规则白名单：如果 allow 列表存在，路径不在 allow 列表 → 拒绝访问
 * - 两者都不存在 → 允许所有（等同于无沙箱）
 *
 * runCommand 特殊处理：
 *
 * - 命令本身不做过滤（命令内容无法可靠匹配路径规则）
 * - 但 cwd 受 filesystem 规则约束
 *
 * 网络规则暂不在此装饰器中实现 — 网络拦截需要底层 transport 层支持， 当前仅在类型层面预留 network 配置。
 */

import type { SandboxSettings } from '@suga/ai-sdk';
import type {
  BackgroundTaskDetail,
  BackgroundTaskResult,
  CommandResult,
  EditResult,
  FileContent,
  FileLsEntry,
  FileStat,
  FileSystemProvider,
  GrepOptions,
  GrepResult,
  RunCommandOptions,
  SpawnBackgroundOptions
} from '../types/fs-provider';

/** 沙箱拒绝错误 — 路径或命令被 deny 规则拦截 */
export class SandboxDenyError extends Error {
  readonly path: string;
  readonly rule: string;

  constructor(path: string, rule: string) {
    super(`Sandbox denied: ${path} (rule: ${rule})`);
    this.name = 'SandboxDenyError';
    this.path = path;
    this.rule = rule;
  }
}

// pathMatchesPattern: check if filePath matches glob-style pattern
// Supports: exact match, * single-segment wildcard, ** multi-segment wildcard
function pathMatchesPattern(filePath: string, pattern: string): boolean {
  // 将 pattern 和 filePath 都规范化（去除尾部斜杠）
  const normalizedPattern = pattern.replace(/\/+$/, '');
  const normalizedPath = filePath.replace(/\/+$/, '');

  // 精确匹配
  if (normalizedPattern === normalizedPath) return true;

  // 前缀匹配: pattern 以 /** 结尾 → 匹配所有子路径
  if (normalizedPattern.endsWith('/**')) {
    const prefix = normalizedPattern.slice(0, -3);
    return normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`);
  }

  // 单层通配符: 替换 * 为 [^/]+ 的简单 glob
  if (normalizedPattern.includes('*') && !normalizedPattern.includes('**')) {
    const regexStr = normalizedPattern
      .replace(/\//g, '\\/') // 转义 /
      .replace(/\*/g, '[^\\/]+'); // * → 匹配单层
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(normalizedPath);
  }

  // 多层通配符: 替换 ** 为 .* 的 glob
  if (normalizedPattern.includes('**')) {
    const parts = normalizedPattern.split('**');
    const regexParts = parts.map(p => p.replace(/\//g, '\\/').replace(/\*/g, '[^\\/]+'));
    const regexStr = regexParts.join('.*');
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(normalizedPath);
  }

  return false;
}

/**
 * isPathAllowed — 检查路径是否被沙箱规则允许
 *
 * 逻辑:
 *
 * 1. deny 列表优先 — 路径匹配任何 deny 规则 → 拒绝
 * 2. allow 列表白名单 — 如果 allow 列表存在且路径不在其中 → 拒绝
 * 3. 两者都无规则 → 允许
 *
 * @returns {allowed: true} 或 { allowed: false, rule: string }
 */
function isPathAllowed(
  filePath: string,
  settings: SandboxSettings
): { allowed: true } | { allowed: false; rule: string } {
  const fsConfig = settings.filesystem;
  if (!fsConfig) return { allowed: true };

  // 1. deny 优先
  if (fsConfig.deny) {
    for (const pattern of fsConfig.deny) {
      if (pathMatchesPattern(filePath, pattern)) {
        return { allowed: false, rule: pattern };
      }
    }
  }

  // 2. allow 白名单
  if (fsConfig.allow) {
    for (const pattern of fsConfig.allow) {
      if (pathMatchesPattern(filePath, pattern)) {
        return { allowed: true };
      }
    }
    // allow 列表存在但路径不在其中 → 拒绝
    return { allowed: false, rule: 'allow_list' };
  }

  return { allowed: true };
}

/** SandboxFileSystemProvider 配置 */
export interface SandboxFileSystemProviderConfig {
  /** 底层 FileSystemProvider（被装饰的真实实现） */
  readonly inner: FileSystemProvider;
  /** 沙箱配置 */
  readonly sandbox: SandboxSettings;
}

/**
 * SandboxFileSystemProvider — 装饰器模式沙箱实现
 *
 * 包裹 inner FileSystemProvider，在每个 I/O 方法中加入路径过滤。 deny 规则触发 SandboxDenyError（工具可捕获并返回友好消息）。
 */
export class SandboxFileSystemProvider implements FileSystemProvider {
  private readonly inner: FileSystemProvider;
  private readonly sandbox: SandboxSettings;

  constructor(config: SandboxFileSystemProviderConfig) {
    this.inner = config.inner;
    this.sandbox = config.sandbox;
  }

  async stat(path: string): Promise<FileStat> {
    checkPath(path, this.sandbox);
    return this.inner.stat(path);
  }

  async readFile(
    path: string,
    options?: { offset?: number; limit?: number }
  ): Promise<FileContent> {
    checkPath(path, this.sandbox);
    return this.inner.readFile(path, options);
  }

  async writeFile(path: string, content: string): Promise<void> {
    checkPath(path, this.sandbox);
    return this.inner.writeFile(path, content);
  }

  async editFile(
    path: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean
  ): Promise<EditResult> {
    checkPath(path, this.sandbox);
    return this.inner.editFile(path, oldString, newString, replaceAll);
  }

  async glob(pattern: string, path?: string): Promise<string[]> {
    if (path) checkPath(path, this.sandbox);
    const results = await this.inner.glob(pattern, path);
    // 过滤结果中不符合沙箱规则的路径
    return results.filter(p => isPathAllowed(p, this.sandbox).allowed);
  }

  async grep(pattern: string, options: GrepOptions): Promise<GrepResult> {
    if (options.path) checkPath(options.path, this.sandbox);
    const result = await this.inner.grep(pattern, options);
    // 过滤文件路径结果
    if (result.filePaths) {
      const filteredPaths = result.filePaths.filter(p => isPathAllowed(p, this.sandbox).allowed);
      return { ...result, filePaths: filteredPaths, totalMatches: filteredPaths.length };
    }
    if (result.matches) {
      const filteredMatches = result.matches.filter(
        m => isPathAllowed(m.filePath, this.sandbox).allowed
      );
      return { ...result, matches: filteredMatches, totalMatches: filteredMatches.length };
    }
    if (result.counts) {
      const filteredCounts = result.counts.filter(
        c => isPathAllowed(c.filePath, this.sandbox).allowed
      );
      return {
        ...result,
        counts: filteredCounts,
        totalMatches: filteredCounts.reduce((sum, c) => sum + c.count, 0)
      };
    }
    return result;
  }

  async ls(path: string, options?: { recursive?: boolean }): Promise<FileLsEntry[]> {
    checkPath(path, this.sandbox);
    return this.inner.ls(path, options);
  }

  async runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult> {
    // cwd 受沙箱约束
    if (options?.cwd) checkPath(options.cwd, this.sandbox);
    return this.inner.runCommand(command, options);
  }

  // === G8: 后台任务生命周期（委托到 inner） ===

  async spawnBackgroundCommand(
    command: string,
    options?: SpawnBackgroundOptions
  ): Promise<BackgroundTaskResult> {
    if (options?.cwd) checkPath(options.cwd, this.sandbox);
    return this.inner.spawnBackgroundCommand(command, options);
  }

  async getBackgroundTask(taskId: string): Promise<BackgroundTaskDetail | null> {
    return this.inner.getBackgroundTask(taskId);
  }

  async stopBackgroundTask(taskId: string): Promise<boolean> {
    return this.inner.stopBackgroundTask(taskId);
  }

  async listBackgroundTasks(): Promise<readonly BackgroundTaskDetail[]> {
    return this.inner.listBackgroundTasks();
  }

  registerForeground(taskId: string): void {
    this.inner.registerForeground(taskId);
  }

  unregisterForeground(taskId: string): void {
    this.inner.unregisterForeground(taskId);
  }

  markTaskNotified(taskId: string): void {
    this.inner.markTaskNotified(taskId);
  }
}

/** 内部: 路径检查 — 不允许则抛出 SandboxDenyError */
function checkPath(filePath: string, sandbox: SandboxSettings): void {
  const result = isPathAllowed(filePath, sandbox);
  if (!result.allowed) {
    throw new SandboxDenyError(filePath, result.rule);
  }
}

// 导出内部函数供测试使用
export { pathMatchesPattern, isPathAllowed };
