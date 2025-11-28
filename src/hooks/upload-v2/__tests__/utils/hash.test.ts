/**
 * 哈希计算工具函数测试
 */
import { describe, expect, it } from 'vitest';
import {
  calculateFileMD5,
  calculateFilesMD5,
  calculateStringMD5,
  calculateFileSHA256
} from '../../utils/hash';

describe('哈希计算工具函数', () => {
  describe('calculateStringMD5', () => {
    it('应该计算字符串的 MD5', () => {
      const md5 = calculateStringMD5('test');
      expect(md5).toBeTruthy();
      expect(typeof md5).toBe('string');
      expect(md5.length).toBeGreaterThan(0);
    });

    it('应该为相同字符串生成相同的 MD5', () => {
      const md5_1 = calculateStringMD5('test');
      const md5_2 = calculateStringMD5('test');
      expect(md5_1).toBe(md5_2);
    });
  });

  describe('calculateFileMD5', () => {
    it('应该计算文件的 MD5', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const md5 = await calculateFileMD5(file);
      expect(md5).toBeTruthy();
      expect(typeof md5).toBe('string');
    });

    it('应该支持进度回调', async () => {
      const file = new File(['x'.repeat(5 * 1024 * 1024)], 'test.txt', { type: 'text/plain' });
      const progressValues: number[] = [];
      const md5 = await calculateFileMD5(file, progress => {
        progressValues.push(progress);
      });
      expect(md5).toBeTruthy();
      expect(progressValues.length).toBeGreaterThan(0);
    });
  });

  describe('calculateFilesMD5', () => {
    it('应该批量计算文件的 MD5', async () => {
      const files = [
        new File(['content1'], 'test1.txt', { type: 'text/plain' }),
        new File(['content2'], 'test2.txt', { type: 'text/plain' })
      ];
      const md5s = await calculateFilesMD5(files);
      expect(md5s.length).toBe(2);
      expect(md5s[0]).toBeTruthy();
      expect(md5s[1]).toBeTruthy();
    });
  });

  describe('calculateFileSHA256', () => {
    it('应该计算文件的 SHA-256', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const sha256 = await calculateFileSHA256(file);
      expect(sha256).toBeTruthy();
      expect(typeof sha256).toBe('string');
      expect(sha256.length).toBe(64); // SHA-256 是 64 个十六进制字符
    });
  });
});

