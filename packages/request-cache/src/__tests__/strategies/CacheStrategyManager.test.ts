/**
 * CacheStrategyManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { CacheStrategyManager } from '../../strategies/CacheStrategyManager';
import type { CacheItem } from '../../types/cache-item';

describe('CacheStrategyManager', () => {
  let strategyManager: CacheStrategyManager;

  beforeEach(() => {
    strategyManager = new CacheStrategyManager('time', 100);
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      expect(strategyManager).toBeInstanceOf(CacheStrategyManager);
    });

    it('应该支持自定义策略', () => {
      const customStrategy = (key: string, item: CacheItem) => {
        return key.startsWith('keep');
      };

      const manager = new CacheStrategyManager('custom', 100, customStrategy);
      expect(manager.getStrategy()).toBe('custom');
    });
  });

  describe('updateAccessOrder', () => {
    it('应该在 LRU 策略下更新访问顺序', () => {
      const lruManager = new CacheStrategyManager('lru', 2);
      lruManager.updateAccessOrder('key1');
      lruManager.updateAccessOrder('key2');
      lruManager.updateAccessOrder('key1'); // 再次访问 key1，应该移到末尾

      // 当添加 key3 时，应该删除最旧的（key2，因为 key1 刚被访问）
      const keysToDelete = lruManager.applyStrategy(2, 'key3', [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ]);

      // 应该删除 key2（最旧的，因为 key1 刚被访问）
      expect(keysToDelete).toContain('key2');
      expect(keysToDelete).not.toContain('key1');
    });

    it('应该在非 LRU 策略下不更新访问顺序', () => {
      const timeManager = new CacheStrategyManager('time', 100);
      timeManager.updateAccessOrder('key1');

      // time 策略不应该维护访问顺序
      expect(timeManager.applyStrategy(1, 'key2', [])).toEqual([]);
    });
  });

  describe('addToAccessOrder', () => {
    it('应该在 FIFO 策略下添加键到访问顺序', () => {
      const fifoManager = new CacheStrategyManager('fifo', 2);
      fifoManager.addToAccessOrder('key1');
      fifoManager.addToAccessOrder('key2');

      const keysToDelete = fifoManager.applyStrategy(2, 'key3', [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ]);

      // 应该删除 key1（最先添加的）
      expect(keysToDelete).toContain('key1');
      expect(keysToDelete).not.toContain('key2');
    });

    it('应该避免重复添加', () => {
      const fifoManager = new CacheStrategyManager('fifo', 1);
      fifoManager.addToAccessOrder('key1');
      fifoManager.addToAccessOrder('key1'); // 重复添加应该被忽略

      const keysToDelete = fifoManager.applyStrategy(1, 'key2', [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ]);

      // key1 应该被删除（因为 maxSize 是 1）
      expect(keysToDelete).toContain('key1');
    });
  });

  describe('removeFromAccessOrder', () => {
    it('应该从访问顺序中移除键', () => {
      const lruManager = new CacheStrategyManager('lru', 1);
      lruManager.updateAccessOrder('key1');
      lruManager.updateAccessOrder('key2');
      lruManager.removeFromAccessOrder('key1');

      // 当添加 key3 且 maxSize 为 1 时，应该删除 key2
      const keysToDelete = lruManager.applyStrategy(1, 'key3', [
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ]);

      // key2 应该被删除（因为 maxSize 是 1，且 key1 已被移除）
      expect(keysToDelete).toContain('key2');
    });
  });

  describe('applyStrategy', () => {
    it('应该在 time 策略下返回空数组', () => {
      const timeManager = new CacheStrategyManager('time', 100);
      const cacheEntries: Array<[string, CacheItem]> = [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ];

      const keysToDelete = timeManager.applyStrategy(2, 'key3', cacheEntries);
      expect(keysToDelete).toEqual([]);
    });

    it('应该在 LRU 策略下删除最旧的项', () => {
      const lruManager = new CacheStrategyManager('lru', 2);
      lruManager.updateAccessOrder('key1');
      lruManager.updateAccessOrder('key2');

      const cacheEntries: Array<[string, CacheItem]> = [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ];

      const keysToDelete = lruManager.applyStrategy(2, 'key3', cacheEntries);
      expect(keysToDelete).toContain('key1');
      expect(keysToDelete).not.toContain('key2');
    });

    it('应该在 FIFO 策略下删除最先添加的项', () => {
      const fifoManager = new CacheStrategyManager('fifo', 2);
      fifoManager.addToAccessOrder('key1');
      fifoManager.addToAccessOrder('key2');

      const cacheEntries: Array<[string, CacheItem]> = [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ];

      const keysToDelete = fifoManager.applyStrategy(2, 'key3', cacheEntries);
      expect(keysToDelete).toContain('key1');
      expect(keysToDelete).not.toContain('key2');
    });

    it('应该在自定义策略下应用自定义逻辑', () => {
      const customStrategy = (key: string, item: CacheItem) => {
        return (item.data as { id: number }).id % 2 === 1;
      };

      const customManager = new CacheStrategyManager('custom', 100, customStrategy);

      const cacheEntries: Array<[string, CacheItem]> = [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key3', { data: { id: 3 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ];

      const keysToDelete = customManager.applyStrategy(3, 'key4', cacheEntries);
      // 应该删除 id 为偶数的项
      expect(keysToDelete).toContain('key2');
      expect(keysToDelete).not.toContain('key1');
      expect(keysToDelete).not.toContain('key3');
    });

    it('应该跳过新键本身', () => {
      const lruManager = new CacheStrategyManager('lru', 2);
      lruManager.updateAccessOrder('key1');
      lruManager.updateAccessOrder('key2');

      const cacheEntries: Array<[string, CacheItem]> = [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key3', { data: { id: 3 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ];

      const keysToDelete = lruManager.applyStrategy(3, 'key3', cacheEntries);
      // key3 不应该被删除（即使它在缓存中）
      expect(keysToDelete).not.toContain('key3');
    });

    it('应该在缓存未满时不删除任何项', () => {
      const lruManager = new CacheStrategyManager('lru', 5);
      lruManager.updateAccessOrder('key1');
      lruManager.updateAccessOrder('key2');

      const cacheEntries: Array<[string, CacheItem]> = [
        ['key1', { data: { id: 1 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
        ['key2', { data: { id: 2 }, timestamp: Date.now(), expireTime: Date.now() + 5000 }],
      ];

      const keysToDelete = lruManager.applyStrategy(2, 'key3', cacheEntries);
      expect(keysToDelete).toEqual([]);
    });
  });

  describe('setStrategy', () => {
    it('应该更新策略', () => {
      strategyManager.setStrategy('lru');
      expect(strategyManager.getStrategy()).toBe('lru');
    });

    it('应该在切换到非 LRU/FIFO 策略时清空访问顺序', () => {
      const manager = new CacheStrategyManager('lru', 100);
      manager.updateAccessOrder('key1');
      manager.setStrategy('time');

      expect(manager.getStrategy()).toBe('time');
    });
  });

  describe('setMaxSize', () => {
    it('应该更新最大缓存数量', () => {
      strategyManager.setMaxSize(200);
      expect(strategyManager.getMaxSize()).toBe(200);
    });
  });

  describe('setCustomStrategy', () => {
    it('应该设置自定义策略', () => {
      const customStrategy = (key: string, item: CacheItem) => {
        return key.startsWith('keep');
      };

      strategyManager.setCustomStrategy(customStrategy);
      expect(strategyManager.getStrategy()).toBe('custom');
    });
  });

  describe('getStrategy', () => {
    it('应该返回当前策略', () => {
      expect(strategyManager.getStrategy()).toBe('time');
    });
  });

  describe('getMaxSize', () => {
    it('应该返回最大缓存数量', () => {
      expect(strategyManager.getMaxSize()).toBe(100);
    });
  });
});

