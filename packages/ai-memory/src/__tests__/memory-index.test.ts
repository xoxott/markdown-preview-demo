/** MemoryIndex 测试 — MEMORY.md 截断 + 索引 CRUD + 异步读写 */

import { describe, expect, it } from 'vitest';
import {
  addIndexEntry,
  loadAndTruncateEntrypoint,
  parseIndexEntries,
  readEntrypoint,
  removeIndexEntry,
  serializeIndexEntries,
  truncateEntrypointContent,
  updateIndexEntry,
  writeEntrypoint
} from '../core/memory-index';
import {
  MAX_ENTRYPOINT_BYTES,
  MAX_ENTRYPOINT_LINES,
  MEMORY_MD_FILENAME
} from '../types/memory-index';
import type { MemoryIndexEntry } from '../types/memory-index';
import { MockMemoryStorageProvider } from '../core/memory-storage';

describe('MemoryIndex — truncateEntrypointContent', () => {
  it('内容在限制内 → 不截断', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    const result = truncateEntrypointContent(content);
    expect(result.wasTruncated).toBe(false);
    expect(result.content).toBe(content);
    expect(result.truncationMethod).toBe('none');
  });

  it('超过 200 行 → 行截断', () => {
    const lines = Array.from({ length: 250 }, (_, i) => `Line ${i}`);
    const content = lines.join('\n');
    const result = truncateEntrypointContent(content);
    expect(result.wasTruncated).toBe(true);
    expect(result.truncatedLineCount).toBe(200);
    expect(result.content).toContain('⚠️');
    expect(result.truncationMethod).toBe('line');
  });

  it('超过 25KB → 字节截断（行截断后仍超标）', () => {
    // 创建一个每行很长但行数 < 200 的内容
    const longLines = Array.from({ length: 50 }, (_, i) => `Line ${i}: ${'x'.repeat(600)}`);
    const content = longLines.join('\n'); // ~30KB+
    const result = truncateEntrypointContent(content);
    expect(result.wasTruncated).toBe(true);
    expect(result.truncatedByteCount).toBeLessThanOrEqual(MAX_ENTRYPOINT_BYTES + 200); // 加截断警告
    expect(result.content).toContain('⚠️');
  });

  it('空内容 → 不截断', () => {
    const result = truncateEntrypointContent('');
    expect(result.wasTruncated).toBe(false);
    expect(result.content).toBe('');
  });

  it('正好 200 行 → 不截断（边界值）', () => {
    const lines = Array.from({ length: 200 }, (_, i) => `Line ${i}`);
    const content = lines.join('\n');
    const result = truncateEntrypointContent(content);
    expect(result.wasTruncated).toBe(false);
  });

  it('自定义 maxLines 和 maxBytes', () => {
    const content = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join('\n');
    const result = truncateEntrypointContent(content, 10, 5000);
    expect(result.wasTruncated).toBe(true);
    expect(result.truncatedLineCount).toBe(10);
  });

  it('行截断后字节截断 → truncationMethod 仍为 line', () => {
    const lines = Array.from({ length: 250 }, (_, i) => `Line ${i}: ${'y'.repeat(200)}`);
    const content = lines.join('\n');
    const result = truncateEntrypointContent(content);
    expect(result.wasTruncated).toBe(true);
    // 行截断触发，字节截断可能也触发，但方法标记为 line
    expect(result.truncationMethod).toBe('line');
  });
});

describe('MemoryIndex — parseIndexEntries', () => {
  it('有效索引行 → 解析成功', () => {
    const content =
      '- [User Preferences](user/prefs.md) — Preferred tools\n- [DB Rules](feedback/db.md) — No mocks';
    const entries = parseIndexEntries(content);
    expect(entries.length).toBe(2);
    expect(entries[0].title).toBe('User Preferences');
    expect(entries[0].filePath).toBe('user/prefs.md');
    expect(entries[0].hook).toBe('Preferred tools');
  });

  it('混合内容 → 只解析索引行', () => {
    const content = `# MEMORY.md\n\n- [Test](test.md) — Hook\n\nSome other text\n- [Another](another.md) — Hook2`;
    const entries = parseIndexEntries(content);
    expect(entries.length).toBe(2);
  });

  it('无效格式 → 不解析', () => {
    const content = 'Not an index line\n* [Test](test.md) — Hook';
    const entries = parseIndexEntries(content);
    expect(entries.length).toBe(0);
  });

  it('空内容 → 无条目', () => {
    expect(parseIndexEntries('').length).toBe(0);
  });

  it('长钩子行 → 正常解析', () => {
    const content =
      '- [Complex Entry](path.md) — A very long hook line that spans many words but still parses correctly';
    const entries = parseIndexEntries(content);
    expect(entries.length).toBe(1);
    expect(entries[0].hook).toContain('A very long hook');
  });
});

describe('MemoryIndex — serializeIndexEntries', () => {
  it('2 条目 → 正确序列化', () => {
    const entries: MemoryIndexEntry[] = [
      { title: 'Test', filePath: 'test.md', hook: 'A hook' },
      { title: 'Other', filePath: 'other.md', hook: 'B hook' }
    ];
    const result = serializeIndexEntries(entries);
    expect(result).toContain('- [Test](test.md) — A hook');
    expect(result).toContain('- [Other](other.md) — B hook');
  });

  it('空条目 → 空字符串', () => {
    expect(serializeIndexEntries([])).toBe('');
  });

  it('往返测试: parse → serialize → parse 一致', () => {
    const original = '- [Test](test.md) — Hook1\n- [Foo](foo.md) — Hook2';
    const entries = parseIndexEntries(original);
    const serialized = serializeIndexEntries(entries);
    const reParsed = parseIndexEntries(serialized);
    expect(reParsed.length).toBe(entries.length);
    expect(reParsed[0].title).toBe(entries[0].title);
    expect(reParsed[0].filePath).toBe(entries[0].filePath);
  });
});

describe('MemoryIndex — addIndexEntry', () => {
  it('新条目 → 添加到末尾', () => {
    const entries: MemoryIndexEntry[] = [{ title: 'A', filePath: 'a.md', hook: 'Hook A' }];
    const newEntry: MemoryIndexEntry = { title: 'B', filePath: 'b.md', hook: 'Hook B' };
    const result = addIndexEntry(entries, newEntry);
    expect(result.length).toBe(2);
    expect(result[1].filePath).toBe('b.md');
  });

  it('同 filePath → 替换旧条目', () => {
    const entries: MemoryIndexEntry[] = [{ title: 'A', filePath: 'a.md', hook: 'Old hook' }];
    const updated = addIndexEntry(entries, {
      title: 'A Updated',
      filePath: 'a.md',
      hook: 'New hook'
    });
    expect(updated.length).toBe(1);
    expect(updated[0].hook).toBe('New hook');
  });

  it('空列表 → 添加成功', () => {
    const result = addIndexEntry([], { title: 'First', filePath: 'first.md', hook: 'Hook' });
    expect(result.length).toBe(1);
  });
});

describe('MemoryIndex — removeIndexEntry', () => {
  it('按 filePath 删除 → 成功', () => {
    const entries: MemoryIndexEntry[] = [
      { title: 'A', filePath: 'a.md', hook: 'Hook' },
      { title: 'B', filePath: 'b.md', hook: 'Hook' }
    ];
    const result = removeIndexEntry(entries, 'a.md');
    expect(result.length).toBe(1);
    expect(result[0].filePath).toBe('b.md');
  });

  it('filePath 不存在 → 不改变', () => {
    const entries: MemoryIndexEntry[] = [{ title: 'A', filePath: 'a.md', hook: 'Hook' }];
    const result = removeIndexEntry(entries, 'nonexistent.md');
    expect(result.length).toBe(1);
  });
});

describe('MemoryIndex — updateIndexEntry', () => {
  it('更新 title 和 hook → 成功', () => {
    const entries: MemoryIndexEntry[] = [
      { title: 'Old Title', filePath: 'a.md', hook: 'Old hook' }
    ];
    const result = updateIndexEntry(entries, 'a.md', { title: 'New Title', hook: 'New hook' });
    expect(result[0].title).toBe('New Title');
    expect(result[0].hook).toBe('New hook');
    expect(result[0].filePath).toBe('a.md'); // filePath 不变
  });

  it('filePath 不存在 → 不改变', () => {
    const entries: MemoryIndexEntry[] = [{ title: 'A', filePath: 'a.md', hook: 'Hook' }];
    const result = updateIndexEntry(entries, 'nonexistent.md', { title: 'X' });
    expect(result[0].title).toBe('A');
  });
});

describe('MemoryIndex — async 读写', () => {
  it('readEntrypoint — 文件不存在 → null', async () => {
    const provider = new MockMemoryStorageProvider();
    const result = await readEntrypoint(provider, '/mem/MEMORY.md');
    expect(result).toBeNull();
  });

  it('readEntrypoint — 文件存在 → 内容', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', '- [Test](test.md) — Hook');
    const result = await readEntrypoint(provider, '/mem/MEMORY.md');
    expect(result).toContain('- [Test](test.md)');
  });

  it('writeEntrypoint — 写入成功', async () => {
    const provider = new MockMemoryStorageProvider();
    await writeEntrypoint(provider, '/mem/MEMORY.md', 'Content');
    const content = await provider.readFile('/mem/MEMORY.md');
    expect(content).toBe('Content');
  });

  it('loadAndTruncateEntrypoint — 文件不存在 → 空', async () => {
    const provider = new MockMemoryStorageProvider();
    const result = await loadAndTruncateEntrypoint(provider, '/mem/MEMORY.md');
    expect(result.content).toBe('');
    expect(result.wasTruncated).toBe(false);
  });

  it('loadAndTruncateEntrypoint — 文件存在且在限制内 → 不截断', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile('/mem/MEMORY.md', '- [Test](test.md) — Hook');
    const result = await loadAndTruncateEntrypoint(provider, '/mem/MEMORY.md');
    expect(result.content).toContain('- [Test](test.md)');
    expect(result.wasTruncated).toBe(false);
  });

  it('loadAndTruncateEntrypoint — 超过行限制 → 截断', async () => {
    const provider = new MockMemoryStorageProvider();
    const lines = Array.from({ length: 250 }, (_, i) => `- [Entry ${i}](entry${i}.md) — Hook ${i}`);
    provider.addFile('/mem/MEMORY.md', lines.join('\n'));
    const result = await loadAndTruncateEntrypoint(provider, '/mem/MEMORY.md');
    expect(result.wasTruncated).toBe(true);
    expect(result.content).toContain('⚠️');
  });

  it('loadAndTruncateEntrypoint — 自定义限制', async () => {
    const provider = new MockMemoryStorageProvider();
    const lines = Array.from({ length: 20 }, (_, i) => `Line ${i}`);
    provider.addFile('/mem/MEMORY.md', lines.join('\n'));
    const result = await loadAndTruncateEntrypoint(provider, '/mem/MEMORY.md', { maxLines: 10 });
    expect(result.wasTruncated).toBe(true);
    expect(result.truncatedLineCount).toBe(10);
  });
});

describe('MemoryIndex — 常量', () => {
  it('MAX_ENTRYPOINT_LINES = 200', () => {
    expect(MAX_ENTRYPOINT_LINES).toBe(200);
  });

  it('MAX_ENTRYPOINT_BYTES = 25000', () => {
    expect(MAX_ENTRYPOINT_BYTES).toBe(25000);
  });

  it('MEMORY_MD_FILENAME = MEMORY.md', () => {
    expect(MEMORY_MD_FILENAME).toBe('MEMORY.md');
  });
});
