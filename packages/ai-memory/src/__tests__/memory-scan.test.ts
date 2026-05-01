/** MemoryScan 测试 — 目录扫描 + frontmatter 解析 */

import { describe, expect, it } from 'vitest';
import {
  FRONTMATTER_SCAN_LINES,
  MAX_SCAN_FILES,
  formatMemoryManifest,
  scanMemoryFiles
} from '../core/memory-scan';
import { MockMemoryStorageProvider } from '../core/memory-storage';

function makeEntry(name: string, desc: string, type: string, body: string = ''): string {
  return `---\nname: ${name}\ndescription: ${desc}\ntype: ${type}\n---\n${body}`;
}

describe('MemoryScan — scanMemoryFiles', () => {
  it('空目录 → 无条目', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', '# Index');
    const entries = await scanMemoryFiles(provider, '/mem/');
    expect(entries.length).toBe(0);
  });

  it('有 frontmatter 的 .md 文件 → 解析成功', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', 'Index');
    provider.addFile(
      '/mem/user-prefs.md',
      makeEntry('Prefs', 'User preferences', 'user', 'Dark mode'),
      2000
    );
    provider.addFile(
      '/mem/db-rules.md',
      makeEntry('DB Rules', 'No mocks', 'feedback', 'No mock DB'),
      1000
    );
    const entries = await scanMemoryFiles(provider, '/mem/');
    expect(entries.length).toBe(2);
  });

  it('按 mtimeMs 降序排列 → 最新优先', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', 'Index');
    provider.addFile('/mem/new.md', makeEntry('New', 'New entry', 'user'), 3000);
    provider.addFile('/mem/old.md', makeEntry('Old', 'Old entry', 'user'), 1000);
    const entries = await scanMemoryFiles(provider, '/mem/');
    expect(entries[0].filePath).toContain('new');
    expect(entries[1].filePath).toContain('old');
  });

  it('排除 MEMORY.md', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', '- [Test](test.md) — Hook');
    provider.addFile('/mem/test.md', makeEntry('Test', 'Desc', 'user'));
    const entries = await scanMemoryFiles(provider, '/mem/');
    // MEMORY.md 不应被扫描为条目
    expect(entries.every(e => !e.filePath.includes('MEMORY.md'))).toBe(true);
  });

  it('无 frontmatter 的 .md → 被跳过', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', 'Index');
    provider.addFile('/mem/plain.md', 'Just plain text without frontmatter');
    const entries = await scanMemoryFiles(provider, '/mem/');
    expect(entries.length).toBe(0);
  });

  it('自定义排除文件', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', 'Index');
    provider.addFile('/mem/draft.md', makeEntry('Draft', 'Draft', 'user'));
    const entries = await scanMemoryFiles(provider, '/mem/', ['draft.md']);
    expect(entries.length).toBe(0);
  });
});

describe('MemoryScan — formatMemoryManifest', () => {
  it('空条目 → (no memory files found)', () => {
    expect(formatMemoryManifest([])).toBe('(no memory files found)');
  });

  it('1 条目 → 格式化输出', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', 'Index');
    provider.addFile('/mem/test.md', makeEntry('Test', 'Test desc', 'feedback'), 1743465600000);
    const entries = await scanMemoryFiles(provider, '/mem/');
    const manifest = formatMemoryManifest(entries);
    expect(manifest).toContain('FEEDBACK');
    expect(manifest).toContain('Test desc');
  });
});

describe('MemoryScan — 常量', () => {
  it('MAX_SCAN_FILES = 200', () => {
    expect(MAX_SCAN_FILES).toBe(200);
  });

  it('FRONTMATTER_SCAN_LINES = 30', () => {
    expect(FRONTMATTER_SCAN_LINES).toBe(30);
  });
});
