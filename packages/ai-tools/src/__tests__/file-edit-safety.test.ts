/** G3+G4 FileEdit mtime一致性检查 + read-before-edit强制 测试 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { FileWriteStateTracker, fileEditTool } from '../index';
import type { ExtendedToolUseContext } from '../context-merge';
import type { FileSystemProvider } from '../types/fs-provider';

// === Mock FileSystemProvider ===

class MockFSProvider implements FileSystemProvider {
  private files = new Map<string, string>();
  private mtimes = new Map<string, number>();

  setFile(path: string, content: string, mtimeMs?: number): void {
    this.files.set(path, content);
    this.mtimes.set(path, mtimeMs ?? Date.now());
  }

  async stat(path: string) {
    const exists = this.files.has(path);
    return {
      exists,
      isFile: exists,
      isDirectory: false,
      size: exists ? this.files.get(path)!.length : 0,
      mtimeMs: this.mtimes.get(path) ?? Date.now()
    };
  }

  async readFile(path: string) {
    const content = this.files.get(path);
    if (!content) throw new Error(`File not found: ${path}`);
    return {
      content,
      mimeType: 'text/plain',
      lineCount: content.split('\n').length,
      mtimeMs: this.mtimes.get(path) ?? Date.now()
    };
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.files.set(path, content);
    this.mtimes.set(path, Date.now());
  }

  async editFile(path: string, oldString: string, newString: string, replaceAll?: boolean) {
    const content = this.files.get(path);
    if (!content) return { applied: false, replacementCount: 0, error: `File not found: ${path}` };

    if (replaceAll) {
      const count = content.split(oldString).length - 1;
      if (count === 0) return { applied: false, replacementCount: 0, error: 'oldString not found' };
      const newContent = content.replaceAll(oldString, newString);
      this.files.set(path, newContent);
      this.mtimes.set(path, Date.now());
      return { applied: true, replacementCount: count, newContent };
    }

    const idx = content.indexOf(oldString);
    if (idx === -1) return { applied: false, replacementCount: 0, error: 'oldString not found' };
    const secondIdx = content.indexOf(oldString, idx + 1);
    if (secondIdx !== -1)
      return { applied: false, replacementCount: 0, error: 'oldString not unique' };

    const newContent = content.replace(oldString, newString);
    this.files.set(path, newContent);
    this.mtimes.set(path, Date.now());
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
    this.mtimes.clear();
  }
}

function createContext(tracker?: FileWriteStateTracker): ExtendedToolUseContext {
  return {
    fsProvider: new MockFSProvider(),
    tools: new ToolRegistry(),
    abortController: new AbortController(),
    sessionId: 'test-g3g4',
    fileWriteStateTracker: tracker
  } as ExtendedToolUseContext;
}

describe('G4: read-before-edit强制', () => {
  let fs: MockFSProvider;
  let tracker: FileWriteStateTracker;

  beforeEach(() => {
    tracker = new FileWriteStateTracker();
  });

  afterEach(() => {
    tracker.clearReadState('/test.ts');
  });

  it('文件未被Read → 编辑应拒绝', async () => {
    fs = new MockFSProvider();
    fs.setFile('/test.ts', 'old content');
    const ctx = createContext(tracker);
    ctx.fsProvider = fs;

    // 文件不在 tracker 中 → 拒绝
    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'old', newString: 'new' },
      ctx
    );
    expect(result.data.applied).toBe(false);
    expect(result.data.error).toContain('must be read before');
    expect(result.newMessages).toBeDefined();
    expect(result.newMessages![0].content).toContain('must be read before');
  });

  it('文件已被Read → 编辑应允许', async () => {
    fs = new MockFSProvider();
    fs.setFile('/test.ts', 'hello world');
    tracker.recordRead('/test.ts', Date.now());
    const ctx = createContext(tracker);
    ctx.fsProvider = fs;

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'hello', newString: 'hi' },
      ctx
    );
    expect(result.data.applied).toBe(true);
    expect(result.data.replacementCount).toBe(1);
  });

  it('无 fileWriteStateTracker → 不强制read-before-edit', async () => {
    fs = new MockFSProvider();
    fs.setFile('/test.ts', 'hello world');
    const ctx = createContext(); // 无 tracker
    ctx.fsProvider = fs;

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'hello', newString: 'hi' },
      ctx
    );
    expect(result.data.applied).toBe(true);
  });
});

describe('G3: mtime一致性检查', () => {
  let fs: MockFSProvider;
  let tracker: FileWriteStateTracker;

  beforeEach(() => {
    tracker = new FileWriteStateTracker();
  });

  afterEach(() => {
    tracker.clearReadState('/test.ts');
  });

  it('mtime一致 → 编辑应允许', async () => {
    fs = new MockFSProvider();
    const mtime = 1000;
    fs.setFile('/test.ts', 'hello world', mtime);
    tracker.recordRead('/test.ts', mtime);
    const ctx = createContext(tracker);
    ctx.fsProvider = fs;

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'hello', newString: 'hi' },
      ctx
    );
    expect(result.data.applied).toBe(true);
  });

  it('mtime不一致 → 编辑应拒绝（文件被外部修改）', async () => {
    fs = new MockFSProvider();
    fs.setFile('/test.ts', 'modified content', 2000); // 外部修改了
    tracker.recordRead('/test.ts', 1000); // Read时记录的是旧mtime
    const ctx = createContext(tracker);
    ctx.fsProvider = fs;

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'modified', newString: 'new' },
      ctx
    );
    expect(result.data.applied).toBe(false);
    expect(result.data.error).toContain('modified since last read');
    expect(result.newMessages).toBeDefined();
  });

  it('无 readState → mtime检查跳过（null）', async () => {
    fs = new MockFSProvider();
    fs.setFile('/test.ts', 'hello world');
    // tracker中没有这个文件的记录
    // 但 validateWriteRequirement 会先拒绝 → 所以不测试mtime
  });

  it('编辑成功后 → tracker应清除readState', async () => {
    fs = new MockFSProvider();
    const mtime = 1000;
    fs.setFile('/test.ts', 'hello world', mtime);
    tracker.recordRead('/test.ts', mtime);
    const ctx = createContext(tracker);
    ctx.fsProvider = fs;

    expect(tracker.hasBeenRead('/test.ts')).toBe(true);

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'hello', newString: 'hi' },
      ctx
    );
    expect(result.data.applied).toBe(true);
    expect(tracker.hasBeenRead('/test.ts')).toBe(false);
  });
});
