/**
 * NodeFileMemoryStorageProvider — 基于 Node.js fs 的真实 MemoryStorageProvider 实现
 *
 * 使用 Node.js fs/promises 实现所有 7 个接口方法。
 * 宿主在 Node.js 环境中直接使用此实现，无需自行适配。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MemoryStorageProvider } from '../types/memory-storage';

/**
 * NodeFileMemoryStorageProvider — 真实文件系统实现
 *
 * 所有方法直接操作文件系统，无模拟行为。
 * mkdir 自动 recursive，realpath 使用 fs.realpath.native。
 */
export class NodeFileMemoryStorageProvider implements MemoryStorageProvider {
  async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async mkdir(dirPath: string): Promise<void> {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }

  async listFiles(dir: string, extension?: string): Promise<string[]> {
    try {
      const exists = await fs.promises.access(dir, fs.constants.F_OK).then(() => true).catch(() => false);
      if (!exists) return [];

      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      const results: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subFiles = await this.listFiles(path.join(dir, entry.name), extension);
          results.push(...subFiles);
        } else if (entry.isFile()) {
          const filePath = path.join(dir, entry.name);
          if (extension === undefined || filePath.endsWith(extension)) {
            results.push(filePath);
          }
        }
      }

      return results.sort();
    } catch {
      return [];
    }
  }

  async stat(filePath: string): Promise<{ mtimeMs: number; size: number }> {
    const stats = await fs.promises.stat(filePath);
    return { mtimeMs: stats.mtimeMs, size: stats.size };
  }

  async realpath(filePath: string): Promise<string> {
    try {
      return await fs.promises.realpath(filePath);
    } catch {
      // 如果路径不存在，返回原始路径
      return filePath;
    }
  }
}