/** MockMemoryStorageProvider 测试 — 内存模拟存储基本操作 */

import { describe, expect, it } from 'vitest';
import { MockMemoryStorageProvider } from '../core/memory-storage';

describe('MockMemoryStorageProvider — CRUD 操作', () => {
  it('addFile + readFile → 内容一致', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/user.md', 'hello world');
    const content = await provider.readFile('/mem/user.md');
    expect(content).toBe('hello world');
  });

  it('writeFile + readFile → 内容一致', async () => {
    const provider = new MockMemoryStorageProvider();
    await provider.writeFile('/mem/new.md', 'new content');
    const content = await provider.readFile('/mem/new.md');
    expect(content).toBe('new content');
  });

  it('exists → 有文件 true, 无文件 false', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/a.md', 'a');
    expect(await provider.exists('/mem/a.md')).toBe(true);
    expect(await provider.exists('/mem/b.md')).toBe(false);
  });

  it('stat → mtimeMs + size', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/test.md', 'hello', 1000);
    const stat = await provider.stat('/mem/test.md');
    expect(stat.mtimeMs).toBe(1000);
    expect(stat.size).toBe(5);
  });

  it('listFiles → 按目录和扩展名过滤', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/a.md', 'a');
    provider.addFile('/mem/b.md', 'b');
    provider.addFile('/mem/c.txt', 'c');
    const mdFiles = await provider.listFiles('/mem/', '.md');
    expect(mdFiles.length).toBe(2);
    const allFiles = await provider.listFiles('/mem/');
    expect(allFiles.length).toBe(3);
  });

  it('reset → 清空所有文件', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/a.md', 'a');
    provider.reset();
    expect(provider.fileCount).toBe(0);
    expect(await provider.exists('/mem/a.md')).toBe(false);
  });

  it('readFile 不存在 → 抛错', async () => {
    const provider = new MockMemoryStorageProvider();
    await expect(provider.readFile('/nonexistent.md')).rejects.toThrow();
  });

  it('realpath → 直接返回路径（无符号链接）', async () => {
    const provider = new MockMemoryStorageProvider();
    const resolved = await provider.realpath('/mem/test.md');
    expect(resolved).toBe('/mem/test.md');
  });

  it('mkdir → 无操作（不抛错）', async () => {
    const provider = new MockMemoryStorageProvider();
    await expect(provider.mkdir('/mem/')).resolves.toBeUndefined();
  });
});
