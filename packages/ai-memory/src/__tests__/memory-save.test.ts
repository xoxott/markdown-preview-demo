/** MemorySave 测试 — 排除规则 + 内容规范化 */

import { describe, expect, it } from 'vitest';
import {
  containsExcludedPattern,
  ensureBodySections,
  extractBodySections,
  normalizeMemoryContent,
  shouldSave
} from '../core/memory-save';

describe('MemorySave — containsExcludedPattern', () => {
  it('含代码模式 → 返回匹配', () => {
    const result = containsExcludedPattern('```some code```');
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('code_pattern');
  });

  it('含 git 历史 → 返回匹配', () => {
    const result = containsExcludedPattern('Run git log to see changes');
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('git_history');
  });

  it('含调试内容 → 返回匹配', () => {
    const result = containsExcludedPattern('Added console.log for debugging');
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('debugging');
  });

  it('含 CLAUDE.md → 返回匹配', () => {
    const result = containsExcludedPattern('Update the CLAUDE.md file');
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('claude_md');
  });

  it('含临时标记 → 返回匹配', () => {
    const result = containsExcludedPattern('This is a temporary fix');
    expect(result).not.toBeNull();
    expect(result!.reason).toBe('ephemeral');
  });

  it('无排除模式 → 返回 null', () => {
    expect(containsExcludedPattern('User prefers dark mode')).toBeNull();
    expect(containsExcludedPattern('Use React hooks for state')).toBeNull();
  });

  it('大小写不敏感匹配', () => {
    const result = containsExcludedPattern('FUNCTION definition here');
    expect(result).not.toBeNull();
  });
});

describe('MemorySave — shouldSave', () => {
  it('排除内容 → skip', () => {
    const result = shouldSave('```code block```', 'user');
    expect(result.decision).toBe('skip');
    expect(result.exclusion).toBeDefined();
  });

  it('feedback 无 Why/HowToApply → normalize', () => {
    const result = shouldSave("Don't use mocks in tests", 'feedback');
    expect(result.decision).toBe('normalize');
    expect(result.normalizedContent).toBeDefined();
    expect(result.normalizedContent!).toContain('**Why**');
    expect(result.normalizedContent!).toContain('**HowToApply**');
  });

  it('project 无 Why/HowToApply → normalize', () => {
    const result = shouldSave('Freeze merges after Thursday', 'project');
    expect(result.decision).toBe('normalize');
    expect(result.normalizedContent!).toContain('**Why**');
    expect(result.normalizedContent!).toContain('**HowToApply**');
  });

  it('user 正常内容 → save', () => {
    const result = shouldSave('Prefers dark mode', 'user');
    expect(result.decision).toBe('save');
  });

  it('reference 正常内容 → save', () => {
    const result = shouldSave('Check Linear project INGEST for bugs', 'reference');
    expect(result.decision).toBe('save');
  });

  it('feedback 含 Why/HowToApply → save (不 normalize)', () => {
    const result = shouldSave(
      "Don't mock DB. **Why**: Prod incident. **HowToApply**: Always use real DB.",
      'feedback'
    );
    expect(result.decision).toBe('save');
  });

  it('排除优先于 normalize', () => {
    const result = shouldSave('Use `function` keyword. **Why**: Better readability.', 'feedback');
    expect(result.decision).toBe('skip');
  });
});

describe('MemorySave — normalizeMemoryContent', () => {
  it('user → 移除包裹代码块', () => {
    const content = '```\nprefer dark mode\n```';
    const result = normalizeMemoryContent(content, 'user');
    expect(result).not.toContain('```');
    expect(result).toContain('prefer dark mode');
  });

  it('feedback → 确保 Why + HowToApply 段落', () => {
    const content = "Don't use mocks in tests";
    const result = normalizeMemoryContent(content, 'feedback');
    expect(result).toContain('**Why**');
    expect(result).toContain('**HowToApply**');
  });

  it('project → 确保 Why + HowToApply 段落', () => {
    const content = 'Freeze merges after Thursday';
    const result = normalizeMemoryContent(content, 'project');
    expect(result).toContain('**Why**');
    expect(result).toContain('**HowToApply**');
  });

  it('reference → 不额外规范化', () => {
    const content = 'Check Linear project INGEST';
    expect(normalizeMemoryContent(content, 'reference')).toBe(content);
  });

  it('feedback 已有段落 → 不重复添加', () => {
    const content = "Don't mock DB. **Why**: Incident. **HowToApply**: Use real DB.";
    const result = normalizeMemoryContent(content, 'feedback');
    expect(result).toBe(content);
  });
});

describe('MemorySave — extractBodySections', () => {
  it('提取 Why + HowToApply 段落', () => {
    const content = "Don't mock DB. **Why**: Incident. **HowToApply**: Use real DB.";
    const sections = extractBodySections(content);
    expect(sections.Why).toContain('Incident');
    expect(sections.HowToApply).toContain('Use real DB');
  });

  it('空内容 → 无段落', () => {
    expect(Object.keys(extractBodySections(''))).toHaveLength(0);
  });

  it('无段落标记 → 无段落', () => {
    expect(Object.keys(extractBodySections('Just plain text'))).toHaveLength(0);
  });
});

describe('MemorySave — ensureBodySections', () => {
  it('缺失 Why → 添加', () => {
    const result = ensureBodySections("Don't mock DB.", ['Why']);
    expect(result).toContain('**Why**:');
  });

  it('缺失 HowToApply → 添加', () => {
    const result = ensureBodySections("Don't mock DB. **Why**: Incident.", ['Why', 'HowToApply']);
    expect(result).toContain('**HowToApply**:');
  });

  it('全部存在 → 不修改', () => {
    const content = "Don't mock DB. **Why**: Incident. **HowToApply**: Use real DB.";
    expect(ensureBodySections(content, ['Why', 'HowToApply'])).toBe(content);
  });
});
