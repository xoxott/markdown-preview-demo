/** MockMemoryProvider — 测试用的记忆命令模拟 */

import type {
  MemoryCommandProvider,
  MemoryEntry,
  MemoryHeaderInput,
  RefreshResult,
  SaveResult
} from '../../types/providers';

const DEFAULT_ENTRIES: MemoryEntry[] = [
  {
    filePath: 'user/prefs.md',
    name: 'Prefs',
    description: 'User prefers dark mode',
    type: 'user',
    body: 'Dark mode and VS Code',
    mtimeMs: Date.now() - 1000
  },
  {
    filePath: 'feedback/db-rules.md',
    name: 'DB Rules',
    description: 'No mock DB',
    type: 'feedback',
    body: '**Why**: Incident. **HowToApply**: Use real DB.',
    mtimeMs: Date.now() - 2000
  }
];

export class MockMemoryProvider implements MemoryCommandProvider {
  private _entries: MemoryEntry[] = DEFAULT_ENTRIES;
  private _saved: Map<string, { content: string; header: MemoryHeaderInput }> = new Map();
  private _forgotten: Set<string> = new Set();

  setEntries(entries: MemoryEntry[]): this {
    this._entries = entries;
    return this;
  }

  async save(path: string, content: string, header: MemoryHeaderInput): Promise<SaveResult> {
    this._saved.set(path, { content, header });
    return { success: true, path };
  }

  async recall(query: string, limit?: number): Promise<MemoryEntry[]> {
    if (query === '') return this._entries;
    const filtered = this._entries.filter(
      e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.description.toLowerCase().includes(query.toLowerCase()) ||
        e.body.toLowerCase().includes(query.toLowerCase())
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async forget(path: string): Promise<boolean> {
    this._forgotten.add(path);
    return true;
  }

  async refresh(): Promise<RefreshResult> {
    return { filesLoaded: this._entries.length, filesSkipped: 0, errors: [] };
  }

  /** 测试辅助: 获取已保存的记忆 */
  getSaved(): Map<string, { content: string; header: MemoryHeaderInput }> {
    return this._saved;
  }

  /** 测试辅助: 获取已删除的记忆路径 */
  getForgotten(): Set<string> {
    return this._forgotten;
  }
}
