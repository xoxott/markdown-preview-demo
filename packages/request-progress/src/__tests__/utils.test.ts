/**
 * utils 函数测试
 */

import { describe, expect, it } from 'vitest';
import { calculateProgress, formatFileSize, formatSpeed } from '../utils';
import type { ProgressEvent } from '../types';

describe('utils', () => {
  describe('calculateProgress', () => {
    it('应该在 total=0 时返回 0', () => {
      const event: ProgressEvent = { loaded: 100, total: 0 };
      expect(calculateProgress(event)).toBe(0);
    });

    it('应该计算正确的进度百分比', () => {
      const event: ProgressEvent = { loaded: 50, total: 100 };
      expect(calculateProgress(event)).toBe(50);
    });

    it('应该返回 0 当 loaded=0 时', () => {
      const event: ProgressEvent = { loaded: 0, total: 100 };
      expect(calculateProgress(event)).toBe(0);
    });

    it('应该返回 100 当 loaded=total 时', () => {
      const event: ProgressEvent = { loaded: 100, total: 100 };
      expect(calculateProgress(event)).toBe(100);
    });

    it('应该正确计算部分进度', () => {
      const event: ProgressEvent = { loaded: 25, total: 100 };
      expect(calculateProgress(event)).toBe(25);
    });

    it('应该正确计算大于 50% 的进度', () => {
      const event: ProgressEvent = { loaded: 75, total: 100 };
      expect(calculateProgress(event)).toBe(75);
    });

    it('应该四舍五入进度百分比', () => {
      const event: ProgressEvent = { loaded: 33, total: 100 };
      expect(calculateProgress(event)).toBe(33);
    });

    it('应该处理大数值', () => {
      const event: ProgressEvent = { loaded: 50000000, total: 100000000 };
      expect(calculateProgress(event)).toBe(50);
    });
  });

  describe('formatFileSize', () => {
    it('应该格式化 0 字节', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('应该格式化字节 (B)', () => {
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('应该格式化千字节 (KB)', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('应该格式化兆字节 (MB)', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(2 * 1024 * 1024)).toBe('2 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });

    it('应该格式化吉字节 (GB)', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(2 * 1024 * 1024 * 1024)).toBe('2 GB');
    });

    it('应该格式化太字节 (TB)', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    it('应该保留两位小数', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2560)).toBe('2.5 KB');
    });

    it('应该处理边界值', () => {
      expect(formatFileSize(1023)).toBe('1023 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1025)).toBe('1 KB');
    });
  });

  describe('formatSpeed', () => {
    it('应该在 elapsedTime=0 时返回 "0 B/s"', () => {
      expect(formatSpeed(100, 0)).toBe('0 B/s');
    });

    it('应该计算正确的传输速度', () => {
      // 1000 字节在 1000 毫秒内 = 1000 B/s（因为 1000 < 1024，所以还是 B）
      expect(formatSpeed(1000, 1000)).toBe('1000 B/s');
    });

    it('应该格式化慢速传输', () => {
      // 512 字节在 2000 毫秒内 = 256 B/s
      expect(formatSpeed(512, 2000)).toBe('256 B/s');
    });

    it('应该格式化快速传输', () => {
      // 1 MB 在 1000 毫秒内 = 1 MB/s
      expect(formatSpeed(1024 * 1024, 1000)).toBe('1 MB/s');
    });

    it('应该处理高速传输', () => {
      // 100 MB 在 1000 毫秒内 = 100 MB/s
      expect(formatSpeed(100 * 1024 * 1024, 1000)).toBe('100 MB/s');
    });

    it('应该正确计算部分速度', () => {
      // 1.5 MB 在 1000 毫秒内 = 1.5 MB/s
      expect(formatSpeed(1.5 * 1024 * 1024, 1000)).toBe('1.5 MB/s');
    });

    it('应该处理小数时间', () => {
      // 1000 字节在 500 毫秒内 = 2000 B/s = ~2 KB/s
      const result = formatSpeed(1000, 500);
      expect(result).toMatch(/KB\/s$/);
    });

    it('应该处理极短时间内的传输', () => {
      // 100 字节在 1 毫秒内 = 100 KB/s
      const result = formatSpeed(100, 1);
      expect(result).toMatch(/KB\/s$/);
    });

    it('应该处理长时间内的传输', () => {
      // 1000 字节在 10000 毫秒内 = 100 B/s
      expect(formatSpeed(1000, 10000)).toBe('100 B/s');
    });
  });
});

