/**
 * NodeFileStorageAdapter — 基于 Node.js fs 的持久化会话存储
 *
 * 使用 JSON 文件存储序列化会话，每个会话一个文件。
 * 文件存储在指定目录中，会话 ID 作为文件名。
 * 适合 Node.js 服务端持久化场景。
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { StorageAdapter } from '../types/storage';
import type { SerializedSession } from '../types/serialized';

/**
 * NodeFileStorageAdapter — 文件系统持久化实现
 *
 * @param basePath 存储目录路径（宿主指定）
 * @param ext 文件扩展名（默认 .json）
 */
export class NodeFileStorageAdapter implements StorageAdapter {
  private readonly ext: string;

  constructor(
    private readonly basePath: string,
    ext: string = '.json'
  ) {
    this.ext = ext;
    // 确保存储目录存在
    fs.mkdirSync(basePath, { recursive: true });
  }

  /** 会话ID → 文件路径 */
  private filePath(sessionId: string): string {
    // 安全化：替换路径分隔符
    const safeName = sessionId.replace(/[/\\]/g, '_');
    return path.join(this.basePath, `${safeName}${this.ext}`);
  }

  async save(sessionId: string, data: SerializedSession): Promise<void> {
    const content = JSON.stringify(data, null, 2);
    await fs.promises.writeFile(this.filePath(sessionId), content, 'utf-8');
  }

  async load(sessionId: string): Promise<SerializedSession | null> {
    const fp = this.filePath(sessionId);
    try {
      const content = await fs.promises.readFile(fp, 'utf-8');
      return JSON.parse(content) as SerializedSession;
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async remove(sessionId: string): Promise<void> {
    const fp = this.filePath(sessionId);
    try {
      await fs.promises.unlink(fp);
    } catch (err: any) {
      if (err.code === 'ENOENT') return; // 文件不存在也算删除成功
      throw err;
    }
  }

  async list(): Promise<string[]> {
    const entries = await fs.promises.readdir(this.basePath);
    return entries
      .filter(e => e.endsWith(this.ext))
      .map(e => e.slice(0, e.length - this.ext.length));
  }
}