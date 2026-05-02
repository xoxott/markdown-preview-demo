/** MockFileSystemProvider — 内存模拟文件系统，用于测试 */

import type {
  CommandResult,
  EditResult,
  FileContent,
  FileLsEntry,
  FileStat,
  FileSystemProvider,
  GrepFileCount,
  GrepMatchLine,
  GrepOptions,
  GrepOutputMode,
  GrepResult,
  RunCommandOptions
} from '../../types/fs-provider';

interface MockFileEntry {
  content: string;
  mtimeMs: number;
}

/** 内存模拟 FileSystemProvider — 宿主测试用 */
export class MockFileSystemProvider implements FileSystemProvider {
  private files = new Map<string, MockFileEntry>();
  private commands = new Map<string, CommandResult>();
  private defaultCommandResult: CommandResult = {
    exitCode: 0,
    stdout: '',
    stderr: '',
    timedOut: false
  };

  /** 预置文件 */
  addFile(path: string, content: string, mtimeMs = Date.now()): void {
    this.files.set(path, { content, mtimeMs });
  }

  /** 预置命令结果 */
  addCommandResult(command: string, result: CommandResult): void {
    this.commands.set(command, result);
  }

  /** 设置默认命令结果（未预置命令时使用） */
  setDefaultCommandResult(result: CommandResult): void {
    this.defaultCommandResult = result;
  }

  /** 清空所有模拟数据 */
  reset(): void {
    this.files.clear();
    this.commands.clear();
    this.defaultCommandResult = { exitCode: 0, stdout: '', stderr: '', timedOut: false };
  }

  // === FileSystemProvider 实现 ===

  async stat(path: string): Promise<FileStat> {
    const entry = this.files.get(path);
    if (!entry) {
      return { exists: false, isFile: false, isDirectory: false, size: 0, mtimeMs: 0 };
    }
    return {
      exists: true,
      isFile: true,
      isDirectory: false,
      size: entry.content.length,
      mtimeMs: entry.mtimeMs,
      mimeType: guessMimeType(path)
    };
  }

  async readFile(
    path: string,
    options?: { offset?: number; limit?: number }
  ): Promise<FileContent> {
    const entry = this.files.get(path);
    if (!entry) {
      throw new Error(`File not found: ${path}`);
    }

    let content = entry.content;
    if (options?.offset !== undefined || options?.limit !== undefined) {
      const lines = content.split('\n');
      const offset = options?.offset ?? 0;
      const limit = options?.limit ?? lines.length - offset;
      content = lines.slice(offset, offset + limit).join('\n');
    }

    return {
      content,
      mimeType: guessMimeType(path),
      lineCount: entry.content.split('\n').length,
      mtimeMs: entry.mtimeMs
    };
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, { content, mtimeMs: Date.now() });
  }

  async editFile(
    path: string,
    oldString: string,
    newString: string,
    replaceAll?: boolean
  ): Promise<EditResult> {
    const entry = this.files.get(path);
    if (!entry) {
      return { applied: false, replacementCount: 0, error: `File not found: ${path}` };
    }

    if (!entry.content.includes(oldString)) {
      return { applied: false, replacementCount: 0, error: 'oldString not found in file' };
    }

    const occurrences = countOccurrences(entry.content, oldString);
    if (occurrences > 1 && !replaceAll) {
      return {
        applied: false,
        replacementCount: 0,
        error: `oldString is not unique (found ${occurrences} occurrences). Use replaceAll: true to replace all.`
      };
    }

    const newContent = replaceAll
      ? entry.content.split(oldString).join(newString)
      : entry.content.replace(oldString, newString);

    this.files.set(path, { content: newContent, mtimeMs: Date.now() });

    return {
      applied: true,
      replacementCount: replaceAll ? occurrences : 1,
      newContent
    };
  }

  async glob(pattern: string, path?: string): Promise<string[]> {
    const regex = globToRegex(pattern);
    const results: string[] = [];

    for (const filePath of this.files.keys()) {
      const relativePath = path ? filePath.replace(`${path}/`, '') : filePath;
      if (regex.test(relativePath)) {
        results.push(filePath);
      }
    }

    return results.sort();
  }

  async grep(pattern: string, options: GrepOptions): Promise<GrepResult> {
    const regex = new RegExp(pattern, options.caseInsensitive ? 'i' : '');
    const searchPath = options.path ?? '';
    const matchingLines: GrepMatchLine[] = [];
    const matchingFiles: string[] = [];
    const fileCounts: GrepFileCount[] = [];
    let totalMatches = 0;

    for (const [filePath, entry] of this.files.entries()) {
      if (searchPath && !filePath.startsWith(searchPath)) continue;
      if (options.glob && !globToRegex(options.glob).test(filePath)) continue;

      const lines = entry.content.split('\n');
      let fileMatchCount = 0;

      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          fileMatchCount++;
          totalMatches++;

          const beforeContext = options.contextBefore ?? options.contextLines ?? 0;
          const afterContext = options.contextAfter ?? options.contextLines ?? 0;

          matchingLines.push({
            filePath,
            lineNumber: i + 1,
            content: lines[i],
            beforeContext: lines.slice(Math.max(0, i - beforeContext), i),
            afterContext: lines.slice(i + 1, i + 1 + afterContext)
          });
        }
      }

      if (fileMatchCount > 0) {
        matchingFiles.push(filePath);
        fileCounts.push({ filePath, count: fileMatchCount });
      }
    }

    const mode = options.outputMode ?? 'files-with-matches';

    // headLimit 截断
    let truncated = false;
    if (options.headLimit !== undefined && totalMatches > options.headLimit) {
      truncated = true;
      if (mode === 'content') {
        matchingLines.splice(options.headLimit);
      }
      totalMatches = Math.min(totalMatches, options.headLimit);
    }

    return buildGrepResult(mode, matchingLines, matchingFiles, fileCounts, totalMatches, truncated);
  }

  async runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult> {
    const preconfigured = this.commands.get(command);
    if (preconfigured) {
      return { ...preconfigured, cwd: options?.cwd ?? preconfigured.cwd };
    }
    return { ...this.defaultCommandResult, cwd: options?.cwd };
  }

  async ls(dirPath: string, _options?: { recursive?: boolean }): Promise<FileLsEntry[]> {
    const entries: FileLsEntry[] = [];
    for (const [filePath] of this.files.entries()) {
      if (filePath.startsWith(dirPath)) {
        const name = filePath.replace(`${dirPath}/`, '');
        entries.push({
          name,
          type: 'file',
          size: this.files.get(filePath)?.content.length ?? 0,
          mtimeMs: this.files.get(filePath)?.mtimeMs ?? 0
        });
      }
    }
    return entries;
  }
}

// === 辅助函数 ===

function guessMimeType(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'text/x-typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'text/x-javascript';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.md')) return 'text/markdown';
  if (path.endsWith('.py')) return 'text/x-python';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.pdf')) return 'application/pdf';
  return 'text/plain';
}

function countOccurrences(content: string, substring: string): number {
  let count = 0;
  let pos = 0;
  while (true) {
    pos = content.indexOf(substring, pos);
    if (pos === -1) break;
    count++;
    pos += substring.length;
  }
  return count;
}

function buildGrepResult(
  mode: GrepOutputMode,
  matchingLines: GrepMatchLine[],
  matchingFiles: string[],
  fileCounts: GrepFileCount[],
  totalMatches: number,
  truncated: boolean
): GrepResult {
  if (mode === 'content') {
    return { mode, matches: matchingLines, totalMatches, truncated };
  }
  if (mode === 'files-with-matches') {
    return { mode, filePaths: matchingFiles, totalMatches, truncated };
  }
  return { mode, counts: fileCounts, totalMatches, truncated };
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}
