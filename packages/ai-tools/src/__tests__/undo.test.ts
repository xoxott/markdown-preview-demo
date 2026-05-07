/** P100 Undo 测试 — InMemoryFileEditLog + undoTool */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { InMemoryFileEditLog, generateEditId, undoTool } from '../index';
import type { FileEditLogEntry, FileEditLogProvider } from '../types/file-edit-log';
import type { FileSystemProvider } from '../types/fs-provider';

// === Mock FileSystemProvider ===

class MockFSProvider implements FileSystemProvider {
  private files = new Map<string, string>();

  setFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  async stat(path: string) {
    const exists = this.files.has(path);
    return {
      exists,
      isFile: exists,
      isDirectory: false,
      size: exists ? this.files.get(path)!.length : 0,
      mtimeMs: Date.now()
    };
  }

  async readFile(path: string) {
    const content = this.files.get(path);
    if (!content) throw new Error(`File not found: ${path}`);
    return {
      content,
      mimeType: 'text/plain',
      lineCount: content.split('\n').length,
      mtimeMs: Date.now()
    };
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
  }

  async editFile(path: string, oldString: string, newString: string, replaceAll?: boolean) {
    const content = this.files.get(path);
    if (!content) return { applied: false, replacementCount: 0, error: `File not found: ${path}` };

    if (replaceAll) {
      const count = content.split(oldString).length - 1;
      if (count === 0) return { applied: false, replacementCount: 0, error: 'oldString not found' };
      const newContent = content.replaceAll(oldString, newString);
      this.files.set(path, newContent);
      return { applied: true, replacementCount: count, newContent };
    }

    const idx = content.indexOf(oldString);
    if (idx === -1) return { applied: false, replacementCount: 0, error: 'oldString not found' };
    const secondIdx = content.indexOf(oldString, idx + 1);
    if (secondIdx !== -1)
      return { applied: false, replacementCount: 0, error: 'oldString not unique' };

    const newContent = content.replace(oldString, newString);
    this.files.set(path, newContent);
    return { applied: true, replacementCount: 1, newContent };
  }

  async glob() {
    return [];
  }
  async grep() {
    return { mode: 'files-with-matches', totalMatches: 0 };
  }
  async ls() {
    return [];
  }
  async runCommand() {
    return { exitCode: 0, stdout: '', stderr: '', timedOut: false };
  }

  reset(): void {
    this.files.clear();
  }
}

// === Helper: 创建 EditLogEntry ===

function createEntry(filePath: string, oldContent: string, newContent: string): FileEditLogEntry {
  return {
    editId: generateEditId(),
    filePath,
    oldContent,
    newContent,
    oldString: '',
    newString: '',
    replaceAll: false,
    timestamp: Date.now()
  };
}

// === Helper: 创建 ExtendedToolUseContext ===

function createContext(logProvider?: FileEditLogProvider): Record<string, unknown> {
  return {
    fsProvider: new MockFSProvider(),
    tools: new ToolRegistry(),
    fileEditLogProvider: logProvider
  };
}

describe('InMemoryFileEditLog', () => {
  let fs: MockFSProvider;
  let log: InMemoryFileEditLog;

  beforeEach(() => {
    fs = new MockFSProvider();
    log = new InMemoryFileEditLog(fs);
  });

  afterEach(() => {
    log.reset();
  });

  it('record → 存储条目 + size 增长', () => {
    const entry = createEntry('/test.ts', 'old', 'new');
    log.record(entry);
    expect(log.size()).toBe(1);
    expect(log.getEditById(entry.editId)).toEqual(entry);
  });

  it('getRecentEdits → 按时间倒序返回指定文件的记录', () => {
    const e1 = createEntry('/a.ts', 'old1', 'new1');
    const e2 = createEntry('/b.ts', 'old2', 'new2');
    const e3 = createEntry('/a.ts', 'old3', 'new3');

    log.record(e1);
    log.record(e2);
    log.record(e3);

    const recentA = log.getRecentEdits('/a.ts', 5);
    expect(recentA.length).toBe(2);
    expect(recentA[0].editId).toBe(e3.editId); // 最新的在前
    expect(recentA[1].editId).toBe(e1.editId);

    const recentB = log.getRecentEdits('/b.ts', 5);
    expect(recentB.length).toBe(1);
  });

  it('getLatestEdit → 返回最近一条全局记录', () => {
    const e1 = createEntry('/a.ts', 'old1', 'new1');
    log.record(e1);
    expect(log.getLatestEdit()?.editId).toBe(e1.editId);

    const e2 = createEntry('/b.ts', 'old2', 'new2');
    log.record(e2);
    expect(log.getLatestEdit()?.editId).toBe(e2.editId);
  });

  it('revert → 恢复文件到 oldContent', async () => {
    fs.setFile('/test.ts', 'new content');
    const entry = createEntry('/test.ts', 'old content', 'new content');
    log.record(entry);

    const success = await log.revert(entry.editId);
    expect(success).toBe(true);

    // 文件应该恢复到旧内容
    const result = await fs.readFile('/test.ts');
    expect(result.content).toBe('old content');
  });

  it('revert → editId 不存在 → 返回 false', async () => {
    const success = await log.revert('nonexistent');
    expect(success).toBe(false);
  });

  it('reset → 清空所有记录', () => {
    log.record(createEntry('/a.ts', 'old', 'new'));
    log.record(createEntry('/b.ts', 'old2', 'new2'));
    expect(log.size()).toBe(2);
    log.reset();
    expect(log.size()).toBe(0);
    expect(log.getLatestEdit()).toBeUndefined();
  });
});

describe('undoTool', () => {
  let fs: MockFSProvider;
  let log: InMemoryFileEditLog;
  let ctx: Record<string, unknown>;

  beforeEach(() => {
    fs = new MockFSProvider();
    log = new InMemoryFileEditLog(fs);
    ctx = createContext(log);
  });

  afterEach(() => {
    log.reset();
  });

  it('撤销最近一次编辑 → reverted=true + 文件恢复', async () => {
    fs.setFile('/test.ts', 'new content');
    log.record(createEntry('/test.ts', 'old content', 'new content'));

    const result = await undoTool.call({} as any, ctx as any);
    expect(result.data.reverted).toBe(true);
    expect(result.data.filePath).toBe('/test.ts');

    const content = await fs.readFile('/test.ts');
    expect(content.content).toBe('old content');
  });

  it('撤销指定 editId → reverted=true', async () => {
    fs.setFile('/test.ts', 'new content');
    const entry = createEntry('/test.ts', 'old content', 'new content');
    log.record(entry);

    const result = await undoTool.call({ editId: entry.editId } as any, ctx as any);
    expect(result.data.reverted).toBe(true);
    expect(result.data.editId).toBe(entry.editId);
  });

  it('撤销指定 filePath 的最近编辑 → reverted=true', async () => {
    fs.setFile('/a.ts', 'new A');
    fs.setFile('/b.ts', 'new B');
    log.record(createEntry('/a.ts', 'old A', 'new A'));
    log.record(createEntry('/b.ts', 'old B', 'new B'));

    const result = await undoTool.call({ filePath: '/a.ts' } as any, ctx as any);
    expect(result.data.reverted).toBe(true);
    expect(result.data.filePath).toBe('/a.ts');
  });

  it('无 fileEditLogProvider → reverted=false + error', async () => {
    const emptyCtx = createContext(); // 无 logProvider
    const result = await undoTool.call({} as any, emptyCtx as any);
    expect(result.data.reverted).toBe(false);
    expect(result.data.error).toContain('No FileEditLogProvider');
  });

  it('无匹配记录 → reverted=false + error', async () => {
    const result = await undoTool.call({ editId: 'nonexistent' } as any, ctx as any);
    expect(result.data.reverted).toBe(false);
    expect(result.data.error).toContain('No matching edit record');
  });
});
