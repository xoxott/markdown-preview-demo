/** 集成测试 — 全流程: scan→rank→prompt, save→normalize→serialize, 索引管理, 安全验证 */

import { describe, expect, it } from 'vitest';
import { MockMemoryStorageProvider } from '../core/memory-storage';
import {
  PathTraversalError,
  buildTeamMemFilePath,
  computeMemoryPaths,
  isPathTraversal
} from '../core/memory-paths';
import { scanMemoryFiles } from '../core/memory-scan';
import { rankMemories } from '../core/memory-relevance';
import { buildMemoryPrompt } from '../core/memory-prompt';
import { normalizeMemoryContent, shouldSave } from '../core/memory-save';
import {
  parseFrontmatter,
  parseMemoryEntry,
  serializeEntry,
  serializeFrontmatter
} from '../core/memory-entry';
import {
  addIndexEntry,
  parseIndexEntries,
  removeIndexEntry,
  serializeIndexEntries,
  truncateEntrypointContent
} from '../core/memory-index';
import { memoryFreshnessNote } from '../core/memory-age';

const TEST_PATHS = computeMemoryPaths({
  baseDir: '/mem/',
  projectRoot: '/test/project'
});

function makeEntryFile(name: string, desc: string, type: string, body: string): string {
  return `---\nname: ${name}\ndescription: ${desc}\ntype: ${type}\n---\n${body}`;
}

describe('集成 — scan → rank → prompt 全流程', () => {
  it('扫描 10 文件 → 排名 → 构建 individual 提示', async () => {
    const provider = new MockMemoryStorageProvider();
    const dir = TEST_PATHS.autoMemPath;

    // 添加 MEMORY.md
    provider.addFile(TEST_PATHS.entrypointPath, '- [Prefs](user/prefs.md) — User preferences');

    // 添加记忆文件（路径必须在 autoMemPath 下）
    provider.addFile(
      `${dir}user/prefs.md`,
      makeEntryFile('Prefs', 'User prefers dark mode', 'user', 'Dark mode and VS Code'),
      Date.now() - 1000
    );
    provider.addFile(
      `${dir}feedback/db-rules.md`,
      makeEntryFile(
        'DB Rules',
        'No mock DB',
        'feedback',
        '**Why**: Incident. **HowToApply**: Use real DB.'
      ),
      Date.now() - 2000
    );
    provider.addFile(
      `${dir}reference/api-docs.md`,
      makeEntryFile('API Docs', 'API reference', 'reference', 'Check API docs at docs.example.com'),
      Date.now() - 3000
    );

    // 扫描
    const entries = await scanMemoryFiles(provider, TEST_PATHS.autoMemPath);
    expect(entries.length).toBe(3);

    // 排名 — 搜索 "dark mode preferences"
    const ranked = rankMemories('dark mode preferences', entries);
    expect(ranked.scoredEntries.length).toBeGreaterThan(0);

    // 构建提示
    const result = await buildMemoryPrompt(provider, TEST_PATHS, { mode: 'individual' });
    expect(result.fullPrompt).toContain('## Memory');
    expect(result.fullPrompt).toContain('MEMORY.md');
  });

  it('扫描 → 排名 "React hooks" → 无匹配', async () => {
    const provider = new MockMemoryStorageProvider();
    const dir = TEST_PATHS.autoMemPath;
    provider.addFile(TEST_PATHS.entrypointPath, 'Index');
    provider.addFile(
      `${dir}user/prefs.md`,
      makeEntryFile('Prefs', 'User prefers dark mode', 'user', 'Dark mode'),
      Date.now()
    );

    const entries = await scanMemoryFiles(provider, TEST_PATHS.autoMemPath);
    const ranked = rankMemories('React hooks', entries);
    expect(ranked.scoredEntries.length).toBe(0);
  });
});

describe('集成 — save → normalize → serialize → write 流程', () => {
  it('feedback 内容 → validate → normalize → serialize → write', async () => {
    const provider = new MockMemoryStorageProvider();

    // 验证 + 规范化
    const content = "Don't mock the database in tests";
    const saveResult = shouldSave(content, 'feedback');
    expect(saveResult.decision).toBe('normalize');

    const normalized = normalizeMemoryContent(content, 'feedback');
    expect(normalized).toContain('**Why**');
    expect(normalized).toContain('**HowToApply**');

    // 序列化
    const header = { name: 'DB Rules', description: 'No mock DB', type: 'feedback' as const };
    const frontmatter = serializeFrontmatter(header);
    const fullContent = `${frontmatter}\n${normalized}`;

    // 写入
    provider.addFile('/mem/feedback/db-rules.md', fullContent);

    // 读回验证
    const readContent = await provider.readFile('/mem/feedback/db-rules.md');
    const parsed = parseFrontmatter(readContent);
    expect(parsed.header).not.toBeNull();
    expect(parsed.header!.type).toBe('feedback');
  });

  it('排除内容 → skip → 不写入', () => {
    const content = '```some code block```';
    const result = shouldSave(content, 'user');
    expect(result.decision).toBe('skip');
  });
});

describe('集成 — 索引管理: add → serialize → read', () => {
  it('索引 CRUD → 序列化 → 解析 → 一致', () => {
    let entries = [] as any[];
    entries = addIndexEntry(entries, {
      title: 'Prefs',
      filePath: 'user/prefs.md',
      hook: 'User preferences'
    });
    entries = addIndexEntry(entries, {
      title: 'DB Rules',
      filePath: 'feedback/db.md',
      hook: 'No mock DB'
    });
    entries = addIndexEntry(entries, {
      title: 'API',
      filePath: 'reference/api.md',
      hook: 'API docs'
    });

    expect(entries.length).toBe(3);

    // 序列化
    const serialized = serializeIndexEntries(entries);

    // 解析回
    const reParsed = parseIndexEntries(serialized);
    expect(reParsed.length).toBe(3);
    expect(reParsed[0].filePath).toBe('user/prefs.md');

    // 删除
    entries = removeIndexEntry(entries, 'feedback/db.md');
    expect(entries.length).toBe(2);

    // 同 filePath 去重替换
    entries = addIndexEntry(entries, {
      title: 'Prefs Updated',
      filePath: 'user/prefs.md',
      hook: 'New preferences'
    });
    expect(entries.length).toBe(2);
    expect(entries.find(e => e.filePath === 'user/prefs.md')!.hook).toBe('New preferences');
  });
});

describe('集成 — 路径遍历安全', () => {
  it('PathTraversalError 在 buildTeamMemFilePath 中抛出', () => {
    expect(() => buildTeamMemFilePath('/mem/team/', '\0evil')).toThrow(PathTraversalError);
  });

  it('isPathTraversal 检测 ../ 遍历', () => {
    expect(isPathTraversal('/mem/', '/mem/../etc')).toBe(true);
    expect(isPathTraversal('/mem/', '/mem/normal.md')).toBe(false);
  });
});

describe('集成 — combined 模式提示', () => {
  it('私有 + team 双目录 → combined 提示含 scope', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile(TEST_PATHS.entrypointPath, '- [Prefs](prefs.md) — Hook');
    provider.addFile(`${TEST_PATHS.teamDir}MEMORY.md`, '- [Convention](conv.md) — Team convention');

    const result = await buildMemoryPrompt(provider, TEST_PATHS, { mode: 'combined' });
    expect(result.fullPrompt).toContain('Private MEMORY.md');
    expect(result.fullPrompt).toContain('Team MEMORY.md');
    expect(result.fullPrompt).toContain('<scope>');
    expect(result.loadedFiles.length).toBe(2);
  });
});

describe('集成 — 截断边界测试', () => {
  it('200 行/25KB 极限 → 截断+警告', () => {
    const lines = Array.from(
      { length: 300 },
      (_, i) => `- [Entry ${i}](e${i}.md) — Hook ${i}: ${'x'.repeat(100)}`
    );
    const content = lines.join('\n');
    const result = truncateEntrypointContent(content);
    expect(result.wasTruncated).toBe(true);
    expect(result.content).toContain('⚠️');
    expect(result.truncatedLineCount).toBe(200);
  });

  it('空内容 → 不截断', () => {
    const result = truncateEntrypointContent('');
    expect(result.wasTruncated).toBe(false);
  });
});

describe('集成 — 鲜度在提示中的表现', () => {
  it('旧记忆 → freshnessNote 非空', () => {
    const staleMtime = Date.now() - 60 * 24 * 60 * 60 * 1000; // 60 天前
    const note = memoryFreshnessNote(staleMtime);
    expect(note).toContain('stale');
  });

  it('新鲜记忆 → freshnessNote 空', () => {
    const note = memoryFreshnessNote(Date.now());
    expect(note).toBe('');
  });
});

describe('集成 — 条目序列化 + 解析往返', () => {
  it('frontmatter → 解析 → 序列化 → 再解析 → 一致', () => {
    const header = { name: 'Test', description: 'Test desc', type: 'user' as const };
    const body = 'Body content here.\nLine 2.';
    const entry = { header, body, filePath: 'user/test.md', mtimeMs: 1000 };

    const serialized = serializeEntry(entry);
    const reParsed = parseMemoryEntry(serialized, 'user/test.md', 1000);
    expect(reParsed).not.toBeNull();
    expect(reParsed!.header.name).toBe('Test');
    expect(reParsed!.header.type).toBe('user');
    expect(reParsed!.body).toContain('Body content');
  });
});
