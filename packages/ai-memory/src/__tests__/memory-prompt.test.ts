/** MemoryPrompt 测试 — 提示构建器 individual/combined/async */

import { describe, expect, it } from 'vitest';
import {
  buildCombinedMemoryPrompt,
  buildMemoryLines,
  buildMemoryPrompt
} from '../core/memory-prompt';
import { MockMemoryStorageProvider } from '../core/memory-storage';
import { computeMemoryPaths } from '../core/memory-paths';

const TEST_PATHS = computeMemoryPaths({
  baseDir: '/mem/',
  projectRoot: '/test/project'
});

describe('MemoryPrompt — buildMemoryLines', () => {
  it('含内容 → 生成提示段落', () => {
    const lines = buildMemoryLines('- [Test](test.md) — Hook');
    const prompt = lines.join('\n');
    expect(prompt).toContain('## Memory');
    expect(prompt).toContain('- [Test](test.md)');
    expect(prompt).toContain('## MEMORY.md');
  });

  it('空内容 → "currently empty"', () => {
    const lines = buildMemoryLines('');
    const prompt = lines.join('\n');
    expect(prompt).toContain('currently empty');
  });

  it('含类型段落 → <type> 标签', () => {
    const lines = buildMemoryLines('Content', { includeTypes: true });
    const prompt = lines.join('\n');
    expect(prompt).toContain('<type>');
    expect(prompt).toContain('<name>User</name>');
  });

  it('不含类型段落 → 无 <type>', () => {
    const lines = buildMemoryLines('Content', { includeTypes: false });
    const prompt = lines.join('\n');
    expect(prompt).not.toContain('<type>');
  });

  it('含保存规则 → WHAT_NOT_TO_SAVE', () => {
    const lines = buildMemoryLines('Content', { includeSaveRules: true });
    const prompt = lines.join('\n');
    expect(prompt).toContain('What NOT to save');
  });

  it('不含保存规则 → 无排除', () => {
    const lines = buildMemoryLines('Content', { includeSaveRules: false });
    const prompt = lines.join('\n');
    expect(prompt).not.toContain('What NOT to save');
  });

  it('含鲜度规则 → WhenToAccess + TrustingRecall', () => {
    const lines = buildMemoryLines('Content', { includeStaleness: true });
    const prompt = lines.join('\n');
    expect(prompt).toContain('When to access');
    expect(prompt).toContain('Before recommending');
  });

  it('不含鲜度规则 → 无访问/回溯段落', () => {
    const lines = buildMemoryLines('Content', { includeStaleness: false });
    const prompt = lines.join('\n');
    expect(prompt).not.toContain('When to access');
    expect(prompt).not.toContain('Before recommending');
  });
});

describe('MemoryPrompt — buildCombinedMemoryPrompt', () => {
  it('私有 + team → 双内容段落', () => {
    const prompt = buildCombinedMemoryPrompt('Private content', 'Team content');
    expect(prompt).toContain('## Private MEMORY.md');
    expect(prompt).toContain('Private content');
    expect(prompt).toContain('## Team MEMORY.md');
    expect(prompt).toContain('Team content');
  });

  it('空内容 → (empty)', () => {
    const prompt = buildCombinedMemoryPrompt('', '');
    expect(prompt).toContain('(empty)');
  });

  it('含 scope 段落 → <scope> 标签', () => {
    const prompt = buildCombinedMemoryPrompt('P', 'T', { includeTypes: true });
    expect(prompt).toContain('<scope>');
  });

  it('含敏感数据警告', () => {
    const prompt = buildCombinedMemoryPrompt('P', 'T', { includeSaveRules: true });
    expect(prompt).toContain('sensitive data');
  });
});

describe('MemoryPrompt — buildMemoryPrompt (async)', () => {
  it('individual 模式 → 完整提示', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile(TEST_PATHS.entrypointPath, '- [Prefs](prefs.md) — Hook');
    const result = await buildMemoryPrompt(provider, TEST_PATHS, { mode: 'individual' });
    expect(result.fullPrompt).toContain('## Memory');
    expect(result.fullPrompt).toContain('- [Prefs](prefs.md)');
    expect(result.loadedFiles.length).toBe(1);
  });

  it('combined 模式 → 双目录提示', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile(TEST_PATHS.entrypointPath, 'Private index');
    provider.addFile(`${TEST_PATHS.teamDir}MEMORY.md`, 'Team index');
    const result = await buildMemoryPrompt(provider, TEST_PATHS, { mode: 'combined' });
    expect(result.fullPrompt).toContain('Private MEMORY.md');
    expect(result.fullPrompt).toContain('Team MEMORY.md');
    expect(result.loadedFiles.length).toBe(2);
  });

  it('none 模式 → 空提示', async () => {
    const provider = new MockMemoryStorageProvider();
    const result = await buildMemoryPrompt(provider, TEST_PATHS, { mode: 'none' });
    expect(result.fullPrompt).toBe('');
    expect(result.promptSections.length).toBe(0);
  });

  it('MEMORY.md 不存在 → "currently empty"', async () => {
    const provider = new MockMemoryStorageProvider();
    const result = await buildMemoryPrompt(provider, TEST_PATHS, { mode: 'individual' });
    expect(result.fullPrompt).toContain('currently empty');
  });

  it('截断 → truncationResult 有值', async () => {
    const provider = new MockMemoryStorageProvider();
    const longIndex = Array.from(
      { length: 250 },
      (_, i) => `- [Entry ${i}](e${i}.md) — Hook ${i}`
    ).join('\n');
    provider.addFile(TEST_PATHS.entrypointPath, longIndex);
    const result = await buildMemoryPrompt(provider, TEST_PATHS, { mode: 'individual' });
    expect(result.truncationResult).toBeDefined();
    expect(result.truncationResult!.wasTruncated).toBe(true);
  });

  it('combined 模式无 team MEMORY.md → team (empty)', async () => {
    const provider = new MockMemoryStorageProvider();
    provider.addFile(TEST_PATHS.entrypointPath, 'Private content');
    const result = await buildMemoryPrompt(provider, TEST_PATHS, { mode: 'combined' });
    expect(result.fullPrompt).toContain('Private content');
    expect(result.fullPrompt).toContain('(empty)');
  });

  it('自定义 maxContentLines → 应用截断', async () => {
    const provider = new MockMemoryStorageProvider();
    const lines = Array.from({ length: 50 }, (_, i) => `Line ${i}`);
    provider.addFile(TEST_PATHS.entrypointPath, lines.join('\n'));
    const result = await buildMemoryPrompt(provider, TEST_PATHS, {
      mode: 'individual',
      maxContentLines: 10,
      maxContentBytes: 25000
    });
    expect(result.truncationResult).toBeDefined();
    expect(result.truncationResult!.wasTruncated).toBe(true);
  });
});
