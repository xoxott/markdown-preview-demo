/**
 * 验证工具函数测试
 */
import { describe, expect, it } from 'vitest';
import { validateFileType, validateFileSize } from '../../utils/validation';

describe('验证工具函数', () => {
  describe('validateFileType', () => {
    it('应该接受所有类型（当 accept 为空）', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(validateFileType(file, [])).toBe(true);
    });

    it('应该根据扩展名验证', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      expect(validateFileType(file, ['.txt'])).toBe(true);
      expect(validateFileType(file, ['.js'])).toBe(false);
    });

    it('应该根据 MIME 类型验证', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(file, ['image/jpeg'])).toBe(true);
      expect(validateFileType(file, ['image/png'])).toBe(false);
    });

    it('应该支持通配符匹配', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(file, ['image/*'])).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    it('应该验证文件大小', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFileSize(file, undefined, 1024);
      expect(result.valid).toBe(true);
    });

    it('应该拒绝超过最大大小的文件', () => {
      const file = new File(['x'.repeat(2048)], 'test.txt', { type: 'text/plain' });
      const result = validateFileSize(file, undefined, 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能超过');
    });

    it('应该拒绝小于最小大小的文件', () => {
      const file = new File(['x'], 'test.txt', { type: 'text/plain' });
      const result = validateFileSize(file, 100, undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('不能小于');
    });

    it('应该支持字符串格式的大小', () => {
      const file = new File(['x'.repeat(2048)], 'test.txt', { type: 'text/plain' });
      const result = validateFileSize(file, undefined, '1KB');
      expect(result.valid).toBe(false);
    });
  });
});

