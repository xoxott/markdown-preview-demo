/**
 * RequestCacheManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { RequestCacheManager } from '../../managers/RequestCacheManager';
import { MockStorageAdapter } from '../mocks/MockStorageAdapter';

describe('RequestCacheManager', () => {
  let cacheManager: RequestCacheManager;

  beforeEach(() => {
    cacheManager = new RequestCacheManager();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      expect(cacheManager).toBeInstanceOf(RequestCacheManager);
    });

    it('应该使用自定义过期时间', () => {
      const customManager = new RequestCacheManager({
        defaultExpireTime: 10 * 60 * 1000,
      });

      customManager.setByKey('test', { id: 1 });
      const cached = customManager.getByKey('test');
      expect(cached).toBeDefined();
    });

    it('应该启用存储缓存', () => {
      const storageAdapter = new MockStorageAdapter();
      const customManager = new RequestCacheManager({
        useStorage: true,
        storageAdapter,
      });

      customManager.setByKey('test', { id: 1 });
      const cached = customManager.getByKey('test');
      expect(cached).toEqual({ id: 1 });
    });

    it('应该使用自定义存储前缀', () => {
      const storageAdapter = new MockStorageAdapter();
      const customManager = new RequestCacheManager({
        useStorage: true,
        storagePrefix: 'custom_',
        storageAdapter,
      });

      customManager.setByKey('test', { id: 1 });
      const keys = storageAdapter.getAllKeys();
      expect(keys.some(key => key.startsWith('custom_'))).toBe(true);
    });
  });

  describe('getByKey', () => {
    it('应该从内存缓存获取数据', () => {
      const data = { id: 1, name: 'John' };
      cacheManager.setByKey('test-key', data, 5000);

      const cached = cacheManager.getByKey<typeof data>('test-key');
      expect(cached).toEqual(data);
    });

    it('应该返回 null 当缓存不存在', () => {
      const cached = cacheManager.getByKey('non-existent');
      expect(cached).toBeNull();
    });

    it('应该返回 null 当缓存已过期', async () => {
      const data = { id: 1 };
      cacheManager.setByKey('test-key', data, 10); // 10ms 过期

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 20));

      const cached = cacheManager.getByKey('test-key');
      expect(cached).toBeNull();
    });

    it('应该从存储缓存获取数据', () => {
      const storageAdapter = new MockStorageAdapter();
      const customManager = new RequestCacheManager({
        useStorage: true,
        storageAdapter,
      });

      const data = { id: 1 };
      customManager.setByKey('test-key', data, 5000);

      // 创建新实例模拟重启
      const newManager = new RequestCacheManager({
        useStorage: true,
        storageAdapter,
      });

      const cached = newManager.getByKey<typeof data>('test-key');
      expect(cached).toEqual(data);
    });
  });

  describe('setByKey', () => {
    it('应该设置缓存数据', () => {
      const data = { id: 1, name: 'John' };
      cacheManager.setByKey('test-key', data, 5000);

      const cached = cacheManager.getByKey<typeof data>('test-key');
      expect(cached).toEqual(data);
    });

    it('应该使用默认过期时间', () => {
      const data = { id: 1 };
      cacheManager.setByKey('test-key', data);

      const cached = cacheManager.getByKey('test-key');
      expect(cached).toEqual(data);
    });

    it('应该同步到存储缓存', () => {
      const storageAdapter = new MockStorageAdapter();
      const customManager = new RequestCacheManager({
        useStorage: true,
        storageAdapter,
      });

      const data = { id: 1 };
      customManager.setByKey('test-key', data, 5000);

      const keys = storageAdapter.getAllKeys();
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('deleteByKey', () => {
    it('应该删除内存缓存', () => {
      const data = { id: 1 };
      cacheManager.setByKey('test-key', data, 5000);
      cacheManager.deleteByKey('test-key');

      const cached = cacheManager.getByKey('test-key');
      expect(cached).toBeNull();
    });

    it('应该删除存储缓存', () => {
      const storageAdapter = new MockStorageAdapter();
      const customManager = new RequestCacheManager({
        useStorage: true,
        storageAdapter,
      });

      const data = { id: 1 };
      customManager.setByKey('test-key', data, 5000);
      customManager.deleteByKey('test-key');

      const cached = customManager.getByKey('test-key');
      expect(cached).toBeNull();
    });
  });

  describe('clear', () => {
    it('应该清空所有内存缓存', () => {
      cacheManager.setByKey('key1', { id: 1 }, 5000);
      cacheManager.setByKey('key2', { id: 2 }, 5000);
      cacheManager.clear();

      expect(cacheManager.getByKey('key1')).toBeNull();
      expect(cacheManager.getByKey('key2')).toBeNull();
    });

    it('应该清空所有存储缓存', () => {
      const storageAdapter = new MockStorageAdapter();
      const customManager = new RequestCacheManager({
        useStorage: true,
        storageAdapter,
      });

      customManager.setByKey('key1', { id: 1 }, 5000);
      customManager.setByKey('key2', { id: 2 }, 5000);
      customManager.clear();

      const keys = storageAdapter.getAllKeys();
      expect(keys.length).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('应该清理过期缓存', async () => {
      cacheManager.setByKey('expired', { id: 1 }, 10);
      cacheManager.setByKey('valid', { id: 2 }, 5000);

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 20));

      cacheManager.cleanup();

      expect(cacheManager.getByKey('expired')).toBeNull();
      expect(cacheManager.getByKey('valid')).toEqual({ id: 2 });
    });
  });

  describe('getStats', () => {
    it('应该返回正确的统计信息', () => {
      cacheManager.setByKey('key1', { id: 1 }, 5000);
      cacheManager.setByKey('key2', { id: 2 }, 5000);

      const stats = cacheManager.getStats();
      expect(stats.memoryCount).toBe(2);
      expect(stats.storageCount).toBe(0);
    });

    it('应该包含存储缓存统计', () => {
      const storageAdapter = new MockStorageAdapter();
      const customManager = new RequestCacheManager({
        useStorage: true,
        storageAdapter,
      });

      customManager.setByKey('key1', { id: 1 }, 5000);
      customManager.setByKey('key2', { id: 2 }, 5000);

      const stats = customManager.getStats();
      expect(stats.memoryCount).toBe(2);
      expect(stats.storageCount).toBe(2);
    });
  });

  describe('缓存策略', () => {
    it('应该支持 LRU 策略', () => {
      const lruManager = new RequestCacheManager({
        strategy: 'lru',
        maxSize: 2,
      });

      lruManager.setByKey('key1', { id: 1 }, 5000);
      lruManager.setByKey('key2', { id: 2 }, 5000);
      lruManager.setByKey('key3', { id: 3 }, 5000); // 应该删除 key1

      expect(lruManager.getByKey('key1')).toBeNull();
      expect(lruManager.getByKey('key2')).toEqual({ id: 2 });
      expect(lruManager.getByKey('key3')).toEqual({ id: 3 });
    });

    it('应该支持 FIFO 策略', () => {
      const fifoManager = new RequestCacheManager({
        strategy: 'fifo',
        maxSize: 2,
      });

      fifoManager.setByKey('key1', { id: 1 }, 5000);
      fifoManager.setByKey('key2', { id: 2 }, 5000);
      fifoManager.setByKey('key3', { id: 3 }, 5000); // 应该删除 key1

      expect(fifoManager.getByKey('key1')).toBeNull();
      expect(fifoManager.getByKey('key2')).toEqual({ id: 2 });
      expect(fifoManager.getByKey('key3')).toEqual({ id: 3 });
    });

    it('应该支持自定义策略', () => {
      const customManager = new RequestCacheManager({
        strategy: 'custom',
        customStrategy: (key, item) => {
          // 只保留 id 为奇数的项
          return (item.data as { id: number }).id % 2 === 1;
        },
      });

      customManager.setByKey('key1', { id: 1 }, 5000);
      customManager.setByKey('key2', { id: 2 }, 5000);
      customManager.setByKey('key3', { id: 3 }, 5000);

      // 自定义策略会在设置时应用
      expect(customManager.getByKey('key1')).toEqual({ id: 1 });
      expect(customManager.getByKey('key2')).toBeNull();
      expect(customManager.getByKey('key3')).toEqual({ id: 3 });
    });
  });

  describe('setDefaultExpireTime', () => {
    it('应该更新默认过期时间', () => {
      cacheManager.setDefaultExpireTime(10 * 60 * 1000);
      cacheManager.setByKey('test', { id: 1 });

      const cached = cacheManager.getByKey('test');
      expect(cached).toEqual({ id: 1 });
    });
  });

  describe('setStrategy', () => {
    it('应该更新缓存策略', () => {
      const manager = new RequestCacheManager({
        strategy: 'time',
        maxSize: 2,
      });

      manager.setStrategy('lru');
      manager.setByKey('key1', { id: 1 }, 5000);
      manager.setByKey('key2', { id: 2 }, 5000);
      manager.setByKey('key3', { id: 3 }, 5000);

      // LRU 策略应该删除最旧的
      expect(manager.getByKey('key1')).toBeNull();
    });
  });

  describe('setMaxSize', () => {
    it('应该更新最大缓存数量', () => {
      const manager = new RequestCacheManager({
        strategy: 'lru',
        maxSize: 3,
      });

      manager.setByKey('key1', { id: 1 }, 5000);
      manager.setByKey('key2', { id: 2 }, 5000);
      manager.setByKey('key3', { id: 3 }, 5000);

      manager.setMaxSize(2);

      // 应该删除多余的缓存
      const stats = manager.getStats();
      expect(stats.memoryCount).toBeLessThanOrEqual(2);
    });
  });

  describe('setCustomStrategy', () => {
    it('应该设置自定义策略', () => {
      const manager = new RequestCacheManager({
        strategy: 'custom',
        customStrategy: (key, item) => {
          // 只保留 id 为奇数的项
          return (item.data as { id: number }).id % 2 === 1;
        },
      });

      manager.setByKey('key1', { id: 1 }, 5000);
      manager.setByKey('key2', { id: 2 }, 5000);
      manager.setByKey('key3', { id: 3 }, 5000);

      // 自定义策略会在设置时应用
      expect(manager.getByKey('key1')).toEqual({ id: 1 });
      expect(manager.getByKey('key2')).toBeNull();
      expect(manager.getByKey('key3')).toEqual({ id: 3 });
    });
  });
});

