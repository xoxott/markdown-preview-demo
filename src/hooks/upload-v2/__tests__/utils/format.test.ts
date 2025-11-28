/**
 * 格式化工具函数测试
 */
import { describe, expect, it } from 'vitest';
import {
  parseSize,
  formatFileSize,
  formatFileSizes,
  formatSpeed,
  calculateAverageSpeed,
  formatTime,
  formatRemainingTime
} from '../../utils/format';

describe('格式化工具函数', () => {
  describe('parseSize', () => {
    it('应该正确解析数字大小', () => {
      expect(parseSize(1024)).toBe(1024);
      expect(parseSize(0)).toBe(0);
      expect(parseSize(1000)).toBe(1000);
    });

    it('应该正确解析字符串大小', () => {
      expect(parseSize('2MB')).toBe(2 * 1024 * 1024);
      expect(parseSize('1.5GB')).toBe(Math.floor(1.5 * 1024 * 1024 * 1024));
      expect(parseSize('512KB')).toBe(512 * 1024);
      expect(parseSize('1TB')).toBe(1024 ** 4);
    });

    it('应该处理无效输入', () => {
      expect(parseSize('invalid')).toBe(0);
      expect(parseSize('-100')).toBe(0);
    });
  });

  describe('formatFileSize', () => {
    it('应该正确格式化文件大小', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('应该处理小数位数', () => {
      expect(formatFileSize(1536, 1)).toBe('1.5 KB');
      expect(formatFileSize(1536, 0)).toBe('2 KB');
    });

    it('应该处理无效输入', () => {
      expect(formatFileSize(-1)).toBe('Invalid');
      expect(formatFileSize(Infinity)).toBe('Invalid');
    });
  });

  describe('formatFileSizes', () => {
    it('应该批量格式化文件大小', () => {
      const sizes = [1024, 2048, 3072];
      const formatted = formatFileSizes(sizes);
      expect(formatted).toEqual(['1.00 KB', '2.00 KB', '3.00 KB']);
    });
  });

  describe('formatSpeed', () => {
    it('应该正确格式化速度', () => {
      expect(formatSpeed(0)).toBe('0 B/s');
      expect(formatSpeed(1024)).toBe('1.00 KB/s');
      expect(formatSpeed(1024 * 1024)).toBe('1.00 MB/s');
    });

    it('应该处理无效输入', () => {
      expect(formatSpeed(-1)).toBe('0 B/s');
      expect(formatSpeed(Infinity)).toBe('0 B/s');
    });
  });

  describe('calculateAverageSpeed', () => {
    it('应该正确计算平均速度', () => {
      expect(calculateAverageSpeed(1024, 1000)).toBe(1024);
      expect(calculateAverageSpeed(2048, 2000)).toBe(1024);
      expect(calculateAverageSpeed(0, 1000)).toBe(0);
    });

    it('应该处理零时间', () => {
      expect(calculateAverageSpeed(1024, 0)).toBe(0);
      expect(calculateAverageSpeed(1024, -1)).toBe(0);
    });
  });

  describe('formatTime', () => {
    it('应该正确格式化时间', () => {
      expect(formatTime(0)).toBe('0s');
      expect(formatTime(30)).toBe('30s');
      expect(formatTime(65)).toBe('1m 5s');
      expect(formatTime(3665)).toBe('1h 1m');
    });

    it('应该支持详细模式', () => {
      expect(formatTime(90, true)).toBe('1 分钟 30 秒');
      expect(formatTime(3665, true)).toBe('1 小时 1 分钟 5 秒');
    });

    it('应该处理无效输入', () => {
      expect(formatTime(-1)).toBe('Invalid');
    });
  });

  describe('formatRemainingTime', () => {
    it('应该正确格式化剩余时间', () => {
      expect(formatRemainingTime(0)).toBe('即将完成');
      expect(formatRemainingTime(30)).toContain('剩余');
      expect(formatRemainingTime(-1)).toBe('计算中...');
    });
  });
});

