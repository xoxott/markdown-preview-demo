/**
 * 网络工具函数测试
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isSafariLockMode, detectBrowser } from '../../utils/network';

describe('网络工具函数', () => {
  describe('detectBrowser', () => {
    it('应该检测浏览器类型', () => {
      const browser = detectBrowser();
      expect(browser).toHaveProperty('name');
      expect(browser).toHaveProperty('version');
      expect(browser).toHaveProperty('isMobile');
      expect(typeof browser.name).toBe('string');
      expect(typeof browser.version).toBe('string');
      expect(typeof browser.isMobile).toBe('boolean');
    });
  });

  describe('isSafariLockMode', () => {
    it('应该检测 Safari 锁定模式', () => {
      const result = isSafariLockMode();
      expect(typeof result).toBe('boolean');
    });
  });
});

