/**
 * NodeFileSystemProvider — 基于 Node.js 的真实 FileSystemProvider 实现
 *
 * 使用 fs/promises + glob + child_process 实现所有 7 个接口方法。 宿主在 Node.js 环境中直接使用此实现，无需自行适配。
 */

import type { Buffer } from 'node:buffer';
import * as fs from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { glob } from 'glob';
import { findActualString } from '../tools/find-actual-string';
import type {
  BackgroundTaskDetail,
  BackgroundTaskResult,
  BackgroundTaskStatus,
  CommandResult,
  EditResult,
  FileContent,
  FileLsEntry,
  FileStat,
  FileSystemProvider,
  GrepFileCount,
  GrepMatchLine,
  GrepOptions,
  GrepResult,
  RunCommandOptions,
  SpawnBackgroundOptions
} from '../types/fs-provider';

/** MIME 类型映射 — 常见扩展名到 MIME */
const MIME_MAP: Record<string, string> = {
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.js': 'text/javascript',
  '.jsx': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  '.css': 'text/css',
  '.html': 'text/html',
  '.py': 'text/x-python',
  '.rs': 'text/x-rust',
  '.go': 'text/x-go',
  '.vue': 'text/x-vue',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf'
};

function inferMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? 'text/plain';
}

/**
 * NodeFileSystemProvider — 真实 Node.js 实现
 *
 * - stat/readFile/writeFile/editFile: 基于 fs/promises
 * - glob: 基于 glob 包（支持通配符模式如 star-star/star.ts）
 * - grep: 基于 child_process 调用 grep/rg 命令
 * - runCommand: 基于 child_process.execFile
 */
export class NodeFileSystemProvider implements FileSystemProvider {
  /** 默认 glob 选项 */
  private readonly defaultGlobOptions = { nodir: true, absolute: true };

  // === G8: 后台任务管理 ===

  /** 后台任务存储 */
  private backgroundTasks = new Map<
    string,
    {
      process: ReturnType<typeof spawn>;
      command: string;
      startedAt: number;
      stdout: string;
      stderr: string;
      exitCode?: number;
      completedAt?: number;
      timedOut: boolean;
      status: BackgroundTaskStatus;
      notified: boolean;
      outputFilePath?: string;
      foregroundRefs: number;
      cwd?: string;
    }
  >();

  /** 任务 ID 计数器 */
  private taskIdCounter = 0;

  /** 默认命令超时（ms） */
  private readonly defaultCommandTimeout = 120_000;

  // === 文件操作 ===

  async stat(filePath: string): Promise<FileStat> {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtimeMs: stats.mtimeMs,
        mimeType: stats.isFile() ? inferMimeType(filePath) : undefined
      };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return { exists: false, isFile: false, isDirectory: false, size: 0, mtimeMs: 0 };
      }
      throw err;
    }
  }

  async readFile(
    filePath: string,
    options?: { offset?: number; limit?: number }
  ): Promise<FileContent> {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const lines = raw.split('\n');
    const totalLines = lines.length;

    let content = raw;
    if (options?.offset !== undefined) {
      const start = options.offset;
      const end = options.limit !== undefined ? start + options.limit : totalLines;
      content = lines.slice(start, end).join('\n');
    }

    const stats = await fs.promises.stat(filePath);
    return {
      content,
      mimeType: inferMimeType(filePath),
      lineCount: options?.offset !== undefined ? content.split('\n').length : totalLines,
      mtimeMs: stats.mtimeMs
    };
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  async editFile(
    filePath: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean
  ): Promise<EditResult> {
    const content = await fs.promises.readFile(filePath, 'utf-8');

    // 使用 findActualString 进行智能查找（精确匹配 + 引号规范化 + 多匹配检测）
    const found = findActualString(content, oldString, replaceAll);

    if (!found.found) {
      return {
        applied: false,
        replacementCount: 0,
        error: found.error ?? 'oldString not found in file'
      };
    }

    // 使用 actualOldString 替换（保留文件原有引号风格）
    const actualOldString = found.actualOldString;

    if (replaceAll || found.matchCount > 1) {
      const newContent = content.replaceAll(actualOldString, newString);
      await fs.promises.writeFile(filePath, newContent, 'utf-8');
      return { applied: true, replacementCount: found.matchCount, newContent };
    }

    const newContent = content.replace(actualOldString, newString);
    await fs.promises.writeFile(filePath, newContent, 'utf-8');
    return { applied: true, replacementCount: 1, newContent };
  }

  async glob(pattern: string, searchPath?: string): Promise<string[]> {
    const cwd = searchPath ?? process.cwd();
    const results = await glob(pattern, { ...this.defaultGlobOptions, cwd });

    // 按修改时间排序（最新优先）
    const withStats = await Promise.all(
      results.map(async filePath => {
        try {
          const stats = await fs.promises.stat(filePath);
          return { filePath, mtimeMs: stats.mtimeMs };
        } catch {
          return { filePath, mtimeMs: 0 };
        }
      })
    );
    withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return withStats.map(item => item.filePath);
  }

  async grep(pattern: string, options: GrepOptions): Promise<GrepResult> {
    const cwd = options.path ?? process.cwd();

    // 尝试使用 rg (ripgrep)，如果不可用则回退到 grep
    const rgAvailable = await this.isCommandAvailable('rg');

    if (rgAvailable) {
      return this.grepWithRg(pattern, options, cwd);
    }
    return this.grepWithNode(pattern, options, cwd);
  }

  async runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult> {
    const timeout = options?.timeout ?? this.defaultCommandTimeout;
    const cwd = options?.cwd ?? process.cwd();

    // G8: 后台命令 → spawn detached
    if (options?.runInBackground) {
      const bgResult = await this.spawnBackgroundCommand(command, {
        cwd,
        env: options?.env as Record<string, string> | undefined
      });
      return {
        exitCode: 0,
        stdout: `Background task started: ${bgResult.taskId}`,
        stderr: '',
        timedOut: false,
        cwd
      };
    }

    try {
      const result = await this.execShellCommand(command, cwd, timeout, options?.env);
      return {
        exitCode: 0,
        stdout: result.stdout,
        stderr: result.stderr,
        timedOut: false,
        cwd
      };
    } catch (err: any) {
      if (err.killed) {
        return {
          exitCode: -1,
          stdout: err.stdout ?? '',
          stderr: err.stderr ?? 'Command timed out',
          timedOut: true,
          cwd
        };
      }
      return {
        exitCode: err.code ?? 1,
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? err.message,
        timedOut: false,
        cwd
      };
    }
  }

  // === G8: 后台任务生命周期 ===

  async spawnBackgroundCommand(
    command: string,
    options?: SpawnBackgroundOptions
  ): Promise<BackgroundTaskResult> {
    const taskId = `bg-${++this.taskIdCounter}-${Date.now()}`;
    const cwd = options?.cwd ?? process.cwd();
    const envObj = options?.env ? { ...process.env, ...options.env } : process.env;

    const childProcess = spawn('sh', ['-c', command], {
      cwd,
      env: envObj,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const entry = {
      process: childProcess,
      command,
      startedAt: Date.now(),
      stdout: '',
      stderr: '',
      exitCode: undefined as number | undefined,
      completedAt: undefined as number | undefined,
      timedOut: false,
      status: 'running' as BackgroundTaskStatus,
      notified: false,
      outputFilePath: undefined as string | undefined,
      foregroundRefs: 0,
      cwd
    };

    this.backgroundTasks.set(taskId, entry);

    // 收集输出
    childProcess.stdout?.on('data', (data: Buffer) => {
      entry.stdout += data.toString();
    });
    childProcess.stderr?.on('data', (data: Buffer) => {
      entry.stderr += data.toString();
    });

    // 完成处理
    childProcess.on('close', (code: number | null) => {
      entry.exitCode = code ?? 0;
      entry.completedAt = Date.now();
      entry.status = code === 0 ? 'completed' : 'failed';

      // 调用完成回调
      if (options?.onCompleted) {
        options.onCompleted(this.toBackgroundTaskDetail(taskId, entry));
      }
    });

    childProcess.on('error', (err: Error) => {
      entry.stderr += err.message;
      entry.exitCode = -1;
      entry.completedAt = Date.now();
      entry.status = 'failed';

      if (options?.onCompleted) {
        options.onCompleted(this.toBackgroundTaskDetail(taskId, entry));
      }
    });

    // detached 进程不引用父进程（除非 registerForeground）
    childProcess.unref();

    return {
      taskId,
      status: 'running',
      command,
      startedAt: entry.startedAt
    };
  }

  async getBackgroundTask(taskId: string): Promise<BackgroundTaskDetail | null> {
    const entry = this.backgroundTasks.get(taskId);
    if (!entry) return null;
    return this.toBackgroundTaskDetail(taskId, entry);
  }

  async stopBackgroundTask(taskId: string): Promise<boolean> {
    const entry = this.backgroundTasks.get(taskId);
    if (!entry || entry.status !== 'running') return false;

    try {
      entry.process.kill('SIGTERM');
      entry.status = 'stopped';
      entry.completedAt = Date.now();
      entry.exitCode = -1;
      return true;
    } catch {
      return false;
    }
  }

  async listBackgroundTasks(): Promise<readonly BackgroundTaskDetail[]> {
    return [...this.backgroundTasks.entries()].map(([id, entry]) =>
      this.toBackgroundTaskDetail(id, entry)
    );
  }

  registerForeground(taskId: string): void {
    const entry = this.backgroundTasks.get(taskId);
    if (!entry) return;
    entry.foregroundRefs++;
    // ref() 进程 → 防止父进程退出
    entry.process.ref();
  }

  unregisterForeground(taskId: string): void {
    const entry = this.backgroundTasks.get(taskId);
    if (!entry) return;
    entry.foregroundRefs--;
    if (entry.foregroundRefs <= 0) {
      entry.foregroundRefs = 0;
      entry.process.unref();
    }
  }

  markTaskNotified(taskId: string): void {
    const entry = this.backgroundTasks.get(taskId);
    if (entry) entry.notified = true;
  }

  /** 转换为 BackgroundTaskDetail */
  private toBackgroundTaskDetail(
    taskId: string,
    entry: {
      process: ReturnType<typeof spawn>;
      command: string;
      startedAt: number;
      stdout: string;
      stderr: string;
      exitCode?: number;
      completedAt?: number;
      timedOut: boolean;
      status: BackgroundTaskStatus;
      notified: boolean;
      outputFilePath?: string;
      foregroundRefs: number;
      cwd?: string;
    }
  ): BackgroundTaskDetail {
    return {
      taskId,
      status: entry.status,
      command: entry.command,
      exitCode: entry.exitCode,
      stdout: entry.stdout,
      stderr: entry.stderr,
      timedOut: entry.timedOut,
      startedAt: entry.startedAt,
      completedAt: entry.completedAt,
      outputFilePath: entry.outputFilePath,
      cwd: entry.cwd
    };
  }

  // === 私有辅助方法 ===

  /** 检查命令是否可用 */
  private async isCommandAvailable(cmd: string): Promise<boolean> {
    try {
      await this.execShellCommand(`which ${cmd}`, process.cwd(), 5_000);
      return true;
    } catch {
      return false;
    }
  }

  /** 执行 shell 命令 */
  private execShellCommand(
    command: string,
    cwd: string,
    timeout: number,
    env?: Record<string, string>
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      execFile(
        'sh',
        ['-c', command],
        {
          cwd,
          timeout,
          env: env ? { ...process.env, ...env } : process.env,
          maxBuffer: 10 * 1024 * 1024
        },
        (err, stdout, stderr) => {
          if (err) {
            reject(Object.assign(err, { stdout: stdout ?? '', stderr: stderr ?? '' }));
          } else {
            resolve({ stdout: stdout ?? '', stderr: stderr ?? '' });
          }
        }
      );
    });
  }

  /** 使用 ripgrep 搜索 */
  private async grepWithRg(
    pattern: string,
    options: GrepOptions,
    cwd: string
  ): Promise<GrepResult> {
    const args: string[] = [];

    if (options.caseInsensitive) args.push('-i');
    if (options.glob) args.push('--glob', options.glob);

    const contextBefore = options.contextBefore ?? options.contextLines ?? 0;
    const contextAfter = options.contextAfter ?? options.contextLines ?? 0;
    if (contextBefore > 0) args.push('-B', String(contextBefore));
    if (contextAfter > 0) args.push('-A', String(contextAfter));

    if (options.headLimit) args.push('-m', String(options.headLimit));

    // 排除模式
    const excludePatterns = options.excludePatterns ?? ['.git', 'node_modules'];
    for (const exc of excludePatterns) {
      args.push('--glob', `!${exc}`);
    }

    switch (options.outputMode) {
      case 'files-with-matches':
        args.push('-l');
        break;
      case 'count':
        args.push('-c');
        break;
      default:
        args.push('-n'); // content mode with line numbers
        break;
    }

    args.push(pattern, cwd);

    try {
      const result = await this.execShellCommand(
        `rg ${args.map(a => `'${a}'`).join(' ')}`,
        cwd,
        30_000
      );

      switch (options.outputMode) {
        case 'files-with-matches':
          return {
            mode: 'files-with-matches',
            filePaths: result.stdout.trim().split('\n').filter(Boolean),
            totalMatches: result.stdout.trim().split('\n').filter(Boolean).length
          };
        case 'count': {
          const counts: GrepFileCount[] = result.stdout
            .trim()
            .split('\n')
            .filter(Boolean)
            .map(line => {
              const [filePath, countStr] = line.split(':');
              return { filePath, count: Number.parseInt(countStr, 10) };
            });
          return {
            mode: 'count',
            counts,
            totalMatches: counts.reduce((sum, c) => sum + c.count, 0)
          };
        }
        default: {
          const matches: GrepMatchLine[] = result.stdout
            .trim()
            .split('\n')
            .filter(Boolean)
            .map(line => {
              const firstColon = line.indexOf(':');
              const secondColon = line.indexOf(':', firstColon + 1);
              const filePath = line.slice(0, firstColon);
              const lineNumber = Number.parseInt(line.slice(firstColon + 1, secondColon), 10);
              const content = line.slice(secondColon + 1);
              return { filePath, lineNumber, content };
            });
          return { mode: 'content', matches, totalMatches: matches.length };
        }
      }
    } catch (err: any) {
      // rg 返回 exit code 1 表示无匹配，这不是错误
      if (err.code === 1) {
        return this.emptyGrepResult(options.outputMode);
      }
      // 回退到 Node.js 实现
      return this.grepWithNode(pattern, options, cwd);
    }
  }

  /** 使用 Node.js 线性搜索（无 rg 时回退） */
  private async grepWithNode(
    pattern: string,
    options: GrepOptions,
    cwd: string
  ): Promise<GrepResult> {
    const regex = new RegExp(pattern, options.caseInsensitive ? 'gi' : 'g');
    const excludePatterns = options.excludePatterns ?? ['.git', 'node_modules'];

    // 先用 glob 找到文件
    const globPattern = options.glob ?? '**/*';
    const allFiles = await glob(globPattern, { cwd, nodir: true, absolute: true });

    // 过滤排除目录
    const filteredFiles = allFiles.filter(filePath => {
      const relative = path.relative(cwd, filePath);
      return !excludePatterns.some(exc => relative.split('/').includes(exc));
    });

    const headLimit = options.headLimit ?? 250;

    switch (options.outputMode) {
      case 'files-with-matches': {
        const filePaths: string[] = [];
        for (const filePath of filteredFiles.slice(0, headLimit)) {
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            if (regex.test(content)) {
              filePaths.push(filePath);
            }
            regex.lastIndex = 0;
          } catch {
            // 跳过不可读文件
          }
        }
        return { mode: 'files-with-matches', filePaths, totalMatches: filePaths.length };
      }
      case 'count': {
        const counts: GrepFileCount[] = [];
        for (const filePath of filteredFiles.slice(0, headLimit)) {
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const matches = content.match(regex);
            if (matches && matches.length > 0) {
              counts.push({ filePath, count: matches.length });
            }
            regex.lastIndex = 0;
          } catch {
            // 跳过不可读文件
          }
        }
        return { mode: 'count', counts, totalMatches: counts.reduce((sum, c) => sum + c.count, 0) };
      }
      default: {
        const matches: GrepMatchLine[] = [];
        for (const filePath of filteredFiles.slice(0, headLimit)) {
          if (matches.length >= headLimit) break;
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (matches.length >= headLimit) break;
              regex.lastIndex = 0;
              if (regex.test(lines[i])) {
                const before = lines.slice(Math.max(0, i - (options.contextBefore ?? 0)), i);
                const after = lines.slice(i + 1, i + 1 + (options.contextAfter ?? 0));
                matches.push({
                  filePath,
                  lineNumber: i + 1,
                  content: lines[i],
                  beforeContext: before,
                  afterContext: after
                });
              }
            }
            regex.lastIndex = 0;
          } catch {
            // 跳过不可读文件
          }
        }
        return { mode: 'content', matches, totalMatches: matches.length };
      }
    }
  }

  /** 空 grep 结果 */
  private emptyGrepResult(mode: GrepOptions['outputMode']): GrepResult {
    switch (mode) {
      case 'files-with-matches':
        return { mode: 'files-with-matches', filePaths: [], totalMatches: 0 };
      case 'count':
        return { mode: 'count', counts: [], totalMatches: 0 };
      default:
        return { mode: 'content', matches: [], totalMatches: 0 };
    }
  }

  // ─── 目录列表 ───

  async ls(dirPath: string, options?: { recursive?: boolean }): Promise<FileLsEntry[]> {
    const absolutePath = path.resolve(dirPath);
    const entries: FileLsEntry[] = [];

    const readDir = async (dir: string) => {
      const items = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        try {
          const stat = await fs.promises.stat(fullPath);
          const type: FileLsEntry['type'] = item.isDirectory()
            ? 'directory'
            : item.isFile()
              ? 'file'
              : item.isSymbolicLink()
                ? 'symlink'
                : 'other';

          entries.push({
            name: path.relative(absolutePath, fullPath) || item.name,
            type,
            size: stat.size,
            mtimeMs: stat.mtimeMs
          });

          // 递归遍历子目录
          if (options?.recursive && item.isDirectory()) {
            await readDir(fullPath);
          }
        } catch {
          // 权限不足或文件消失 → skip
        }
      }
    };

    await readDir(absolutePath);
    return entries;
  }
}
