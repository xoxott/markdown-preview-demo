/**
 * CacheManager 测试
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { CacheManager } from '../../managers/CacheManager';

describe('CacheManager', () => {
  let manager: CacheManager;

  beforeEach(() => {
    manager = new CacheManager(100, 60000); // 最大100条，TTL 60秒
  });

  describe('set 和 get', () => {
    it('应该设置和获取缓存', () => {
      manager.set('key1', 'value1');
      expect(manager.get('key1')).toBe('value1');
    });

    it('应该返回 null（当缓存不存在）', () => {
      expect(manager.get('nonexistent')).toBeNull();
    });

    it('应该支持自定义 TTL', () => {
      manager.set('key2', 'value2', 1000);
      expect(manager.get('key2')).toBe('value2');
    });
  });

  describe('remove', () => {
    it('应该删除缓存', () => {
      manager.set('key1', 'value1');
      expect(manager.remove('key1')).toBe(true);
      expect(manager.get('key1')).toBeNull();
    });

    it('应该返回 false（当缓存不存在）', () => {
      expect(manager.remove('nonexistent')).toBe(false);
    });
  });

  describe('removeMany', () => {
    it('应该批量删除缓存', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');
      manager.set('key3', 'value3');
      const removed = manager.removeMany(['key1', 'key2', 'nonexistent']);
      expect(removed).toBe(2);
      expect(manager.get('key1')).toBeNull();
      expect(manager.get('key2')).toBeNull();
      expect(manager.get('key3')).toBe('value3');
    });
  });

  describe('isValid', () => {
    it('应该检查缓存是否有效', () => {
      manager.set('key1', 'value1');
      expect(manager.isValid('key1')).toBe(true);
      expect(manager.isValid('nonexistent')).toBe(false);
    });
  });

  describe('size', () => {
    it('应该返回缓存大小', () => {
      expect(manager.size()).toBe(0);
      manager.set('key1', 'value1');
      expect(manager.size()).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('应该清理过期缓存', async () => {
      manager.set('key1', 'value1', 100); // 100ms TTL
      expect(manager.get('key1')).toBe('value1');
      await new Promise(resolve => setTimeout(resolve, 150));
      const cleaned = manager.cleanup();
      expect(cleaned).toBeGreaterThanOrEqual(0);
      expect(manager.get('key1')).toBeNull();
    });
  });

  describe('clear', () => {
    it('应该清空所有缓存', () => {
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');
      manager.clear();
      expect(manager.size()).toBe(0);
    });
  });
});

