/** InMemoryFileEditLog — 内存文件编辑历史实现（测试+轻量宿主） */

import type { FileSystemProvider } from '../types/fs-provider';
import type { FileEditLogEntry, FileEditLogProvider } from '../types/file-edit-log';

/** 生成唯一编辑 ID */
function generateEditId(): string {
  return `edit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * InMemoryFileEditLog — Map 存储编辑记录
 *
 * 适用于测试和轻量宿主。revert 操作通过注入的 FileSystemProvider 写文件恢复旧内容。
 */
export class InMemoryFileEditLog implements FileEditLogProvider {
  private readonly entries = new Map<string, FileEditLogEntry>();
  /** 按时间排序的 editId 列表（最新的在前） */
  private readonly orderedIds: string[] = [];
  private readonly fsProvider: FileSystemProvider;

  constructor(fsProvider: FileSystemProvider) {
    this.fsProvider = fsProvider;
  }

  record(entry: FileEditLogEntry): void {
    this.entries.set(entry.editId, entry);
    // 维护有序列表（最新在前）
    this.orderedIds.unshift(entry.editId);
  }

  getRecentEdits(filePath: string, limit: number = 10): readonly FileEditLogEntry[] {
    const result: FileEditLogEntry[] = [];
    for (const id of this.orderedIds) {
      const entry = this.entries.get(id);
      if (entry && entry.filePath === filePath) {
        result.push(entry);
        if (result.length >= limit) break;
      }
    }
    return result;
  }

  getEditById(editId: string): FileEditLogEntry | undefined {
    return this.entries.get(editId);
  }

  getLatestEdit(): FileEditLogEntry | undefined {
    if (this.orderedIds.length === 0) return undefined;
    return this.entries.get(this.orderedIds[0]);
  }

  async revert(editId: string): Promise<boolean> {
    const entry = this.entries.get(editId);
    if (!entry) return false;

    try {
      await this.fsProvider.writeFile(entry.filePath, entry.oldContent);
      return true;
    } catch {
      return false;
    }
  }

  size(): number {
    return this.entries.size;
  }

  reset(): void {
    this.entries.clear();
    this.orderedIds.length = 0;
  }
}

export { generateEditId };
