/** 工具函数单元测试 */

import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  mergeClasses,
  parseInfoString,
  unescapeAll,
  validateAttrName,
  validateAttrValue
} from '../v2/utils';

describe('工具函数测试', () => {
  describe('escapeHtml', () => {
    it('应该正确转义 HTML 特殊字符', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
      expect(escapeHtml('A & B')).toBe('A &amp; B');
      expect(escapeHtml('"quote"')).toBe('&quot;quote&quot;');
      expect(escapeHtml("'quote'")).toBe('&#39;quote&#39;');
    });

    it('应该处理空字符串', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('应该处理不包含特殊字符的字符串（快速路径）', () => {
      const text = 'Hello World 123';
      expect(escapeHtml(text)).toBe(text);
    });
  });

  describe('unescapeAll', () => {
    it('应该正确反转义 HTML 实体', () => {
      expect(unescapeAll('&lt;div&gt;')).toBe('<div>');
      expect(unescapeAll('A &amp; B')).toBe('A & B');
      expect(unescapeAll('&quot;quote&quot;')).toBe('"quote"');
      expect(unescapeAll('&#39;quote&#39;')).toBe("'quote'");
    });

    it('应该处理不包含实体的字符串（快速路径）', () => {
      const text = 'Hello World';
      expect(unescapeAll(text)).toBe(text);
    });
  });

  describe('validateAttrName', () => {
    it('应该接受合法的属性名', () => {
      expect(validateAttrName('class')).toBe(true);
      expect(validateAttrName('data-test')).toBe(true);
      expect(validateAttrName('aria-label')).toBe(true);
      expect(validateAttrName('_custom')).toBe(true);
      expect(validateAttrName('my:attr')).toBe(true);
    });

    it('应该拒绝事件属性', () => {
      expect(validateAttrName('onclick')).toBe(false);
      expect(validateAttrName('onload')).toBe(false);
      expect(validateAttrName('onerror')).toBe(false);
    });

    it('应该拒绝非法属性名', () => {
      expect(validateAttrName('123start')).toBe(false);
      expect(validateAttrName('invalid@name')).toBe(false);
    });
  });

  describe('validateAttrValue', () => {
    it('应该接受安全的 URL', () => {
      expect(validateAttrValue('href', 'https://example.com')).toBe(true);
      expect(validateAttrValue('src', 'http://example.com/image.jpg')).toBe(true);
      expect(validateAttrValue('href', '/relative/path')).toBe(true);
    });

    it('应该拒绝危险的 URL 协议', () => {
      expect(validateAttrValue('href', 'javascript:alert(1)')).toBe(false);
      expect(validateAttrValue('src', 'javascript:void(0)')).toBe(false);
      expect(validateAttrValue('href', 'vbscript:msgbox')).toBe(false);
      expect(validateAttrValue('href', 'file:///etc/passwd')).toBe(false);
      expect(validateAttrValue('href', 'data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('应该接受非敏感属性的任意值', () => {
      expect(validateAttrValue('class', 'javascript:test')).toBe(true);
      expect(validateAttrValue('id', 'data:test')).toBe(true);
    });
  });

  describe('mergeClasses', () => {
    it('应该正确合并多个类名', () => {
      expect(mergeClasses('class1', 'class2')).toBe('class1 class2');
      expect(mergeClasses('a', 'b', 'c')).toBe('a b c');
    });

    it('应该过滤空值', () => {
      expect(mergeClasses('class1', '', 'class2')).toBe('class1 class2');
      expect(mergeClasses('', undefined, 'class')).toBe('class');
    });

    it('应该处理数组输入', () => {
      expect(mergeClasses(['class1', 'class2'])).toBe('class1 class2');
      expect(mergeClasses('a', ['b', 'c'])).toBe('a b c');
    });

    it('应该处理空输入', () => {
      expect(mergeClasses()).toBe('');
      expect(mergeClasses('', '', '')).toBe('');
    });
  });

  describe('parseInfoString', () => {
    it('应该正确解析 info 字符串', () => {
      expect(parseInfoString('javascript')).toEqual(['javascript', '']);
      expect(parseInfoString('python {.line-numbers}')).toEqual(['python', '{.line-numbers}']);
      expect(parseInfoString('  typescript  ')).toEqual(['typescript', '']);
    });

    it('应该处理空字符串', () => {
      expect(parseInfoString('')).toEqual(['', '']);
      expect(parseInfoString('   ')).toEqual(['', '']);
    });

    it('应该处理多个空格', () => {
      expect(parseInfoString('lang   attrs')).toEqual(['lang', 'attrs']);
    });
  });

  describe('性能测试', () => {
    it('escapeHtml 应该快速处理大量文本', () => {
      const text = 'A'.repeat(10000);
      const start = performance.now();
      escapeHtml(text);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });

    it('mergeClasses 应该快速合并大量类名', () => {
      const classes = Array(100).fill('class');
      const start = performance.now();
      mergeClasses(...classes);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
    });
  });
});
