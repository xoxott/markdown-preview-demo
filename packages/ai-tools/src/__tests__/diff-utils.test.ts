/** G5 Diff/Patch 工具测试 */

import { describe, expect, it } from 'vitest';
import {
  applyPatch,
  formatPatch,
  getPatchForEdit,
  getSnippet,
  reversePatch,
  structuredPatch
} from '../tools/diff-utils';
import type { StructuredPatch } from '../tools/diff-utils';

describe('structuredPatch', () => {
  it('应生成空内容的空 patch', () => {
    const patch = structuredPatch('a.ts', 'a.ts', '', '');
    expect(patch.hunks).toHaveLength(0);
  });

  it('应生成相同内容的空 patch（无变更）', () => {
    const patch = structuredPatch('a.ts', 'a.ts', 'hello\nworld', 'hello\nworld');
    expect(patch.hunks).toHaveLength(0);
  });

  it('应生成单行变更的 patch', () => {
    const patch = structuredPatch('a.ts', 'a.ts', 'hello\nworld', 'hi\nworld');
    expect(patch.hunks.length).toBeGreaterThan(0);

    const hunk = patch.hunks[0];
    expect(hunk.oldStart).toBe(1);
    expect(hunk.lines.some(l => l.type === 'remove' && l.content === 'hello')).toBe(true);
    expect(hunk.lines.some(l => l.type === 'add' && l.content === 'hi')).toBe(true);
  });

  it('应生成多行变更的 patch', () => {
    const old = 'line1\nline2\nline3\nline4\nline5';
    const new_ = 'line1\nmodified2\nline3\nadded\nline4\nline5';
    const patch = structuredPatch('a.ts', 'a.ts', old, new_);
    expect(patch.hunks.length).toBeGreaterThan(0);
    expect(patch.hunks[0].lines.some(l => l.type === 'remove')).toBe(true);
    expect(patch.hunks[0].lines.some(l => l.type === 'add')).toBe(true);
  });

  it('应生成纯新增行的 patch', () => {
    const old = 'line1\nline2';
    const new_ = 'line1\ninserted\nline2';
    const patch = structuredPatch('a.ts', 'a.ts', old, new_);
    expect(patch.hunks.length).toBeGreaterThan(0);
    expect(patch.hunks[0].lines.some(l => l.type === 'add' && l.content === 'inserted')).toBe(true);
  });

  it('应生成纯删除行的 patch', () => {
    const old = 'line1\nmiddle\nline2';
    const new_ = 'line1\nline2';
    const patch = structuredPatch('a.ts', 'a.ts', old, new_);
    expect(patch.hunks.length).toBeGreaterThan(0);
    expect(patch.hunks[0].lines.some(l => l.type === 'remove' && l.content === 'middle')).toBe(
      true
    );
  });
});

describe('getPatchForEdit', () => {
  it('应从单次替换生成 patch', () => {
    const oldContent = 'function hello() {\n  return "world";\n}';
    const patch = getPatchForEdit('app.ts', oldContent, '"world"', '"universe"');

    expect(patch.oldFileName).toBe('app.ts');
    expect(patch.hunks.length).toBeGreaterThan(0);
    expect(patch.hunks[0].lines.some(l => l.type === 'remove')).toBe(true);
    expect(patch.hunks[0].lines.some(l => l.type === 'add')).toBe(true);
  });

  it('应从全部替换生成 patch', () => {
    const oldContent = 'aaa\nbbb\naaa';
    const patch = getPatchForEdit('a.ts', oldContent, 'aaa', 'ccc', true);

    const formatted = formatPatch(patch);
    expect(formatted).toContain('+ccc');
  });
});

describe('formatPatch', () => {
  it('应格式化为 unified diff 格式', () => {
    const patch = structuredPatch('old.ts', 'new.ts', 'hello\nworld', 'hi\nworld');
    const formatted = formatPatch(patch);

    expect(formatted).toContain('--- old.ts');
    expect(formatted).toContain('+++ new.ts');
    expect(formatted).toContain('-hello');
    expect(formatted).toContain('+hi');
    expect(formatted).toContain(' world');
  });

  it('空 patch 应只输出 header', () => {
    const patch = structuredPatch('a.ts', 'a.ts', '', '');
    const formatted = formatPatch(patch);
    expect(formatted).toBe('--- a.ts\n+++ a.ts');
  });
});

describe('applyPatch', () => {
  it('应将 patch 正确应用到原始内容', () => {
    const oldContent = 'line1\nline2\nline3\nline4\nline5';
    const newContent = 'line1\nmodified\nline3\nline4\nline5';
    const patch = structuredPatch('a.ts', 'a.ts', oldContent, newContent);

    const result = applyPatch(oldContent, patch);
    expect(result).toBe(newContent);
  });

  it('应正确应用纯新增行 patch', () => {
    const oldContent = 'line1\nline3';
    const newContent = 'line1\nline2\nline3';
    const patch = structuredPatch('a.ts', 'a.ts', oldContent, newContent);

    const result = applyPatch(oldContent, patch);
    expect(result).toBe(newContent);
  });

  it('应正确应用纯删除行 patch', () => {
    const oldContent = 'line1\nmiddle\nline3';
    const newContent = 'line1\nline3';
    const patch = structuredPatch('a.ts', 'a.ts', oldContent, newContent);

    const result = applyPatch(oldContent, patch);
    expect(result).toBe(newContent);
  });

  it('应正确应用多 hunk patch', () => {
    const oldContent = 'a\nb\nc\na\nb\nc';
    const newContent = 'a\nX\nc\na\nY\nc';
    const patch = structuredPatch('a.ts', 'a.ts', oldContent, newContent);

    const result = applyPatch(oldContent, patch);
    expect(result).toBe(newContent);
  });

  it('空 patch → 应返回原始内容', () => {
    const oldContent = 'hello\nworld';
    const patch = structuredPatch('a.ts', 'a.ts', oldContent, oldContent);

    const result = applyPatch(oldContent, patch);
    expect(result).toBe(oldContent);
  });
});

describe('reversePatch', () => {
  it('应反转 add→remove 和 remove→add', () => {
    const patch = structuredPatch('a.ts', 'a.ts', 'hello\nworld', 'hi\nworld');
    const reversed = reversePatch(patch);

    // add 行变成 remove 行
    const originalAddLines = patch.hunks[0].lines.filter(l => l.type === 'add');
    const reversedRemoveLines = reversed.hunks[0].lines.filter(l => l.type === 'remove');
    expect(reversedRemoveLines.length).toBe(originalAddLines.length);

    // remove 行变成 add 行
    const originalRemoveLines = patch.hunks[0].lines.filter(l => l.type === 'remove');
    const reversedAddLines = reversed.hunks[0].lines.filter(l => l.type === 'add');
    expect(reversedAddLines.length).toBe(originalRemoveLines.length);
  });

  it('反转 patch 应用到新内容 → 应恢复旧内容', () => {
    const oldContent = 'line1\nline2\nline3';
    const newContent = 'line1\nmodified\nline3';
    const patch = structuredPatch('a.ts', 'a.ts', oldContent, newContent);

    // 应用正向 patch → 得到 newContent
    const applied = applyPatch(oldContent, patch);
    expect(applied).toBe(newContent);

    // 反转 patch 并应用到 newContent → 应恢复 oldContent
    const reversed = reversePatch(patch);
    const restored = applyPatch(newContent, reversed);
    expect(restored).toBe(oldContent);
  });

  it('应 swap old/new 文件名和行号', () => {
    const patch: StructuredPatch = {
      oldFileName: 'a.ts',
      newFileName: 'b.ts',
      hunks: [
        {
          oldStart: 5,
          oldLines: 3,
          newStart: 5,
          newLines: 4,
          lines: []
        }
      ]
    };
    const reversed = reversePatch(patch);
    expect(reversed.oldFileName).toBe('b.ts');
    expect(reversed.newFileName).toBe('a.ts');
    expect(reversed.hunks[0].oldStart).toBe(5);
    expect(reversed.hunks[0].oldLines).toBe(4);
    expect(reversed.hunks[0].newStart).toBe(5);
    expect(reversed.hunks[0].newLines).toBe(3);
  });
});

describe('getSnippet', () => {
  it('应从 patch 提取指定范围的片段', () => {
    const oldContent = 'line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8';
    const newContent = 'line1\nline2\nMODIFIED\nline4\nline5\nline6\nline7\nline8';
    const patch = structuredPatch('a.ts', 'a.ts', oldContent, newContent);

    if (patch.hunks.length > 0) {
      const snippet = getSnippet(patch, 3, 3);
      expect(snippet.lines.length).toBeGreaterThan(0);
      expect(snippet.lines.some(l => l.content === 'MODIFIED')).toBe(true);
    }
  });

  it('无匹配行 → 应返回空 snippet', () => {
    const patch = structuredPatch('a.ts', 'a.ts', 'hello\nworld', 'hello\nworld');
    const snippet = getSnippet(patch, 100, 100);
    expect(snippet.lines).toHaveLength(0);
  });
});
