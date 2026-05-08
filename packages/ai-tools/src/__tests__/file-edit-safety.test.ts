/** G3+G4 FileEdit mtime一致性检查 + read-before-edit强制 测试 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import { FileWriteStateTracker, fileEditTool } from '../index';
import type { ExtendedToolUseContext } from '../context-merge';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

function createContext(tracker?: FileWriteStateTracker, fs?: MockFileSystemProvider): ExtendedToolUseContext {
  return {
    fsProvider: fs ?? new MockFileSystemProvider(),
    tools: new ToolRegistry(),
    abortController: new AbortController(),
    sessionId: 'test-g3g4',
    fileWriteStateTracker: tracker
  };
}

describe('G4: read-before-edit强制', () => {
  let fs: MockFileSystemProvider;
  let tracker: FileWriteStateTracker;

  beforeEach(() => {
    tracker = new FileWriteStateTracker();
  });

  afterEach(() => {
    tracker.clearReadState('/test.ts');
  });

  it('文件未被Read → 编辑应拒绝', async () => {
    fs = new MockFileSystemProvider();
    fs.addFile('/test.ts', 'old content');
    const ctx = createContext(tracker, fs);

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'old', newString: 'new', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(false);
    expect(result.data.error).toContain('must be read before');
    expect(result.newMessages).toBeDefined();
    expect(result.newMessages![0].content).toContain('must be read before');
  });

  it('文件已被Read → 编辑应允许', async () => {
    fs = new MockFileSystemProvider();
    fs.addFile('/test.ts', 'hello world');
    tracker.recordRead('/test.ts', Date.now());
    const ctx = createContext(tracker, fs);

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'hello', newString: 'hi', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(true);
    expect(result.data.replacementCount).toBe(1);
  });

  it('无 fileWriteStateTracker → 不强制read-before-edit', async () => {
    fs = new MockFileSystemProvider();
    fs.addFile('/test.ts', 'hello world');
    const ctx = createContext(undefined, fs);

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'hello', newString: 'hi', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(true);
  });
});

describe('G3: mtime一致性检查', () => {
  let fs: MockFileSystemProvider;
  let tracker: FileWriteStateTracker;

  beforeEach(() => {
    tracker = new FileWriteStateTracker();
  });

  afterEach(() => {
    tracker.clearReadState('/test.ts');
  });

  it('mtime一致 → 编辑应允许', async () => {
    fs = new MockFileSystemProvider();
    const mtime = 1000;
    fs.addFile('/test.ts', 'hello world', mtime);
    tracker.recordRead('/test.ts', mtime);
    const ctx = createContext(tracker, fs);

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'hello', newString: 'hi', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(true);
  });

  it('mtime不一致 → 编辑应拒绝（文件被外部修改）', async () => {
    fs = new MockFileSystemProvider();
    fs.addFile('/test.ts', 'modified content', 2000);
    tracker.recordRead('/test.ts', 1000);
    const ctx = createContext(tracker, fs);

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'modified', newString: 'new', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(false);
    expect(result.data.error).toContain('modified since last read');
    expect(result.newMessages).toBeDefined();
  });

  it('无 readState → mtime检查跳过（null）', async () => {
    fs = new MockFileSystemProvider();
    fs.addFile('/test.ts', 'hello world');
  });

  it('编辑成功后 → tracker应清除readState', async () => {
    fs = new MockFileSystemProvider();
    const mtime = 1000;
    fs.addFile('/test.ts', 'hello world', mtime);
    tracker.recordRead('/test.ts', mtime);
    const ctx = createContext(tracker, fs);

    expect(tracker.hasBeenRead('/test.ts')).toBe(true);

    const result = await fileEditTool.call(
      { filePath: '/test.ts', oldString: 'hello', newString: 'hi', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(true);
    expect(tracker.hasBeenRead('/test.ts')).toBe(false);
  });
});
