/** MockMemoryStorageProvider — 内存模拟存储，用于测试 */

import type { MemoryStorageProvider } from '../types/memory-storage';

/** 内存文件条目 */
interface MockFileEntry {
  content: string;
  mtimeMs: number;
}

/** 内存模拟存储提供者 — Map<string, MockFileEntry> */
export class MockMemoryStorageProvider implements MemoryStorageProvider {
  private files = new Map<string, MockFileEntry>();

  /** 预添加文件 — 测试辅助 */
  addFile(path: string, content: string, mtimeMs: number = Date.now()): void {
    this.files.set(path, { content, mtimeMs });
  }

  /** 重置所有状态 */
  reset(): void {
    this.files.clear();
  }

  /** 获取内部文件数量 — 测试辅助 */
  get fileCount(): number {
    return this.files.size;
  }

  async readFile(path: string): Promise<string> {
    const entry = this.files.get(path);
    if (!entry) throw new Error(`File not found: ${path}`);
    return entry.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, { content, mtimeMs: Date.now() });
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async mkdir(path: string): Promise<void> {
    // Mock: 无需真实创建目录，文件路径即存在
  }

  async listFiles(dir: string, extension?: string): Promise<string[]> {
    const results: string[] = [];
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(dir)) {
        if (extension === undefined || filePath.endsWith(extension)) {
          results.push(filePath);
        }
      }
    }
    return results.sort();
  }

  async stat(path: string): Promise<{ mtimeMs: number; size: number }> {
    const entry = this.files.get(path);
    if (!entry) throw new Error(`File not found: ${path}`);
    return { mtimeMs: entry.mtimeMs, size: entry.content.length };
  }

  async realpath(path: string): Promise<string> {
    // Mock: 无符号链接，直接返回路径
    return path;
  }
}
