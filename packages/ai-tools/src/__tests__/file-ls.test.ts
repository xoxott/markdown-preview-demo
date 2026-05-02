/** @suga/ai-tools — FileLsTool测试 */

import { describe, expect, it } from 'vitest';
import { fileLsTool } from '../tools/file-ls';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

describe('FileLsTool', () => {
  const fsProvider = new MockFileSystemProvider();

  it('name → file-ls', () => {
    expect(fileLsTool.name).toBe('file-ls');
  });

  it('isReadOnly → true', () => {
    const input = { path: '/tmp', recursive: false };
    expect(fileLsTool.isReadOnly!(input)).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    const input = { path: '/tmp', recursive: false };
    expect(fileLsTool.safetyLabel!(input)).toBe('readonly');
  });

  it('isConcurrencySafe → true', () => {
    const input = { path: '/tmp', recursive: false };
    expect(fileLsTool.isConcurrencySafe!(input)).toBe(true);
  });

  it('call → 列出目录内容', async () => {
    fsProvider.addFile('/tmp/a.txt', 'hello');
    fsProvider.addFile('/tmp/b.ts', 'world');

    const result = await fileLsTool.call({ path: '/tmp', recursive: false }, { fsProvider } as any);
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });

  it('call → 空目录返回空列表', async () => {
    const result = await fileLsTool.call({ path: '/empty', recursive: false }, {
      fsProvider
    } as any);
    expect(result.data).toEqual([]);
  });

  it('description → 显示path', async () => {
    const desc = await fileLsTool.description({ path: '/tmp', recursive: false });
    expect(desc).toContain('/tmp');
  });

  it('inputSchema → 正确定义', () => {
    expect(fileLsTool.inputSchema).toBeDefined();
  });
});
