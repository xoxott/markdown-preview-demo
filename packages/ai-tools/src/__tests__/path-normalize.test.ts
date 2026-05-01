/** 弯引号规范化 + LF 行尾强制 测试 */

import { describe, expect, it } from 'vitest';
import {
  enforceLfLineEndings,
  normalizeContent,
  normalizeCurlyQuotes
} from '../utils/path-normalize';

describe('normalizeCurlyQuotes', () => {
  it('Unicode 左单引号 → ASCII 单引号', () => {
    expect(normalizeCurlyQuotes('\u2018hello\u2018')).toBe("'hello'");
  });

  it('Unicode 右单引号 → ASCII 单引号', () => {
    expect(normalizeCurlyQuotes('\u2019hello\u2019')).toBe("'hello'");
  });

  it('Unicode 左双引号 → ASCII 双引号', () => {
    expect(normalizeCurlyQuotes('\u201Chello\u201C')).toBe('"hello"');
  });

  it('Unicode 右双引号 → ASCII 双引号', () => {
    expect(normalizeCurlyQuotes('\u201Dhello\u201D')).toBe('"hello"');
  });

  it('混合弯引号 → 全替换为直引号', () => {
    expect(normalizeCurlyQuotes('\u2018say\u2019 \u201Chello\u201D')).toBe('\'say\' "hello"');
  });

  it('无弯引号 → 不变', () => {
    expect(normalizeCurlyQuotes('\'hello\' "world"')).toBe('\'hello\' "world"');
  });

  it('空字符串 → 不变', () => {
    expect(normalizeCurlyQuotes('')).toBe('');
  });

  it('中文内容 + 弯引号 → 弯引号被替换', () => {
    expect(normalizeCurlyQuotes('\u201C你好\u201D')).toBe('"你好"');
  });
});

describe('enforceLfLineEndings', () => {
  it('CRLF → LF', () => {
    expect(enforceLfLineEndings('line1\r\nline2\r\nline3')).toBe('line1\nline2\nline3');
  });

  it('纯 LF → 不变', () => {
    expect(enforceLfLineEndings('line1\nline2\nline3')).toBe('line1\nline2\nline3');
  });

  it('混合 CRLF + LF → 全 LF', () => {
    expect(enforceLfLineEndings('line1\r\nline2\nline3\r\n')).toBe('line1\nline2\nline3\n');
  });

  it('无换行 → 不变', () => {
    expect(enforceLfLineEndings('hello world')).toBe('hello world');
  });

  it('空字符串 → 不变', () => {
    expect(enforceLfLineEndings('')).toBe('');
  });

  it('连续 CRLF → 连续 LF', () => {
    expect(enforceLfLineEndings('\r\n\r\n')).toBe('\n\n');
  });
});

describe('normalizeContent', () => {
  it('组合: 弯引号 + CRLF → 直引号 + LF', () => {
    expect(normalizeContent('\u2018hello\u2019\r\n\u201Cworld\u201D')).toBe('\'hello\'\n"world"');
  });

  it('无需规范化 → 不变', () => {
    expect(normalizeContent('\'hello\'\n"world"')).toBe('\'hello\'\n"world"');
  });

  it('仅弯引号 → 仅替换弯引号', () => {
    expect(normalizeContent('\u2018hello\u2019\nworld')).toBe("'hello'\nworld");
  });

  it('仅 CRLF → 仅替换行尾', () => {
    expect(normalizeContent("'hello'\r\nworld")).toBe("'hello'\nworld");
  });
});
