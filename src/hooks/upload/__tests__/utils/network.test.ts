/** 网络工具函数测试（browser-compat 替代 network.ts 的浏览器检测） */
import { describe, expect, it } from 'vitest';
import { getBrowserInfo } from '../../utils/browser-compat';

describe('网络工具函数', () => {
  describe('getBrowserInfo', () => {
    it('应该检测浏览器类型', () => {
      const browser = getBrowserInfo();
      expect(browser).toHaveProperty('name');
      expect(browser).toHaveProperty('version');
      expect(browser).toHaveProperty('isMobile');
      expect(typeof browser.name).toBe('string');
      expect(typeof browser.version).toBe('string');
      expect(typeof browser.isMobile).toBe('boolean');
    });
  });
});
