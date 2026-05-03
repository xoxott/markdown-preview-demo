/** P64 测试 — findActualString 核心查找逻辑(exactMatch+normalizeQuotes+preserveQuoteStyle+multiMatch) */

import { describe, expect, it } from 'vitest';
import { findActualString } from '../tools/find-actual-string';

// ============================================================
// 精确匹配
// ============================================================

describe('findActualString — 精确匹配', () => {
  it('精确唯一匹配 → found=true, normalizedQuotes=false', () => {
    const content = 'const name = "hello";\nconsole.log(name);';
    const result = findActualString(content, 'name = "hello"');
    expect(result.found).toBe(true);
    expect(result.actualOldString).toBe('name = "hello"');
    expect(result.matchCount).toBe(1);
    expect(result.normalizedQuotes).toBe(false);
  });

  it('精确不匹配 → found=false, error含"not found"', () => {
    const content = 'const name = "hello";';
    const result = findActualString(content, 'name = "world"');
    expect(result.found).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('精确多匹配+replaceAll → found=true', () => {
    const content = 'foo bar foo baz foo';
    const result = findActualString(content, 'foo', true);
    expect(result.found).toBe(true);
    expect(result.matchCount).toBe(3);
  });

  it('精确多匹配+非replaceAll → found=false, error含"appears 2 times"', () => {
    const content = 'foo bar foo baz';
    const result = findActualString(content, 'foo', false);
    expect(result.found).toBe(false);
    expect(result.error).toContain('appears 2 times');
    expect(result.error).toContain('more context');
  });

  it('空搜索字符串 → found=false', () => {
    const content = 'hello world';
    const result = findActualString(content, '');
    expect(result.found).toBe(false);
    expect(result.matchCount).toBe(0);
  });
});

// ============================================================
// 引号规范化匹配
// ============================================================

describe('findActualString — 引号规范化', () => {
  it('弯引号匹配直引号 → found=true, normalizedQuotes=true, actualOldString保留原风格', () => {
    // 内容中有直引号，但oldString用了弯引号
    const content = 'const name = "hello";\nconsole.log(name);';
    const result = findActualString(content, 'name = \u201Chello\u201D');
    expect(result.found).toBe(true);
    expect(result.normalizedQuotes).toBe(true);
    // actualOldString应该是文件中的直引号版本
    expect(result.actualOldString).toBe('name = "hello"');
  });

  it('弯单引号匹配直单引号 → found=true', () => {
    const content = "const msg = 'hello';";
    const result = findActualString(content, 'msg = \u2018hello\u2019');
    expect(result.found).toBe(true);
    expect(result.normalizedQuotes).toBe(true);
    expect(result.actualOldString).toBe("msg = 'hello'");
  });

  it('混合弯引号 → found=true', () => {
    const content = 'const name = "hello"; // it\'s great';
    const result = findActualString(content, 'name = \u201Chello\u201D; // it\u2019s great');
    expect(result.found).toBe(true);
    expect(result.normalizedQuotes).toBe(true);
    expect(result.actualOldString).toBe('name = "hello"; // it\'s great');
  });

  it('规范化后仍然不匹配 → found=false', () => {
    const content = 'const name = "hello";';
    const result = findActualString(content, 'name = \u201Cworld\u201D');
    expect(result.found).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('规范化后多匹配+非replaceAll → found=false', () => {
    // 内容两处都是直引号，oldString用弯引号 → 规范化后匹配2处
    const content = 'const x = "hello"; const y = "hello";';
    const result = findActualString(content, '\u201Chello\u201D', false);
    expect(result.found).toBe(false);
    expect(result.error).toContain('appears 2 times');
  });
});

// ============================================================
// preserveQuoteStyle
// ============================================================

describe('findActualString — preserveQuoteStyle', () => {
  it('oldString弯引号→文件直引号→actualOldString是直引号版本', () => {
    const content = 'message = "Hello, world!"';
    const result = findActualString(content, 'message = \u201CHello, world!\u201D');
    expect(result.found).toBe(true);
    expect(result.actualOldString).toBe('message = "Hello, world!"');
  });

  it('oldString直引号→文件弯引号→精确匹配失败，规范化也失败（直→弯不可逆）', () => {
    // 内容中有弯引号，但oldString用了直引号
    // normalizeCurlyQuotes只做弯→直，不会做直→弯
    const content = 'message = \u201CHello, world!\u201D';
    const result = findActualString(content, 'message = "Hello, world!"');
    // 规范化content后也变成直引号，所以精确匹配应该在规范化内容中成功
    expect(result.found).toBe(true);
    expect(result.normalizedQuotes).toBe(true);
    // actualOldString应该是文件中的弯引号版本
    expect(result.actualOldString).toBe('message = \u201CHello, world!\u201D');
  });
});

// ============================================================
// 边界情况
// ============================================================

describe('findActualString — 边界情况', () => {
  it('换行符在oldString中 → 精确匹配', () => {
    const content = 'line1\nline2\nline3';
    const result = findActualString(content, 'line1\nline2');
    expect(result.found).toBe(true);
    expect(result.matchCount).toBe(1);
  });

  it('oldString等于整个内容 → 精确匹配', () => {
    const content = 'hello';
    const result = findActualString(content, 'hello');
    expect(result.found).toBe(true);
    expect(result.matchCount).toBe(1);
  });

  it('特殊字符匹配 → 精确匹配', () => {
    const content = 'regex: /pattern/g';
    const result = findActualString(content, '/pattern/g');
    expect(result.found).toBe(true);
  });
});
