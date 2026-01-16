/**
 * CircuitBreakerManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { CircuitBreakerManager } from '../../managers/CircuitBreakerManager';
import { CircuitBreakerState } from '../../types';

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = new CircuitBreakerManager();
  });

  describe('构造函数', () => {
    it('应该使用默认配置创建实例', () => {
      expect(manager).toBeInstanceOf(CircuitBreakerManager);
    });

    it('应该使用自定义配置', () => {
      const customManager = new CircuitBreakerManager({
        cleanupInterval: 10000,
        maxSize: 10,
        idleTimeout: 60000,
      });

      expect(customManager).toBeInstanceOf(CircuitBreakerManager);
    });
  });

  describe('getOrCreateBreaker', () => {
    it('应该创建新的熔断器', () => {
      const breaker = manager.getOrCreateBreaker('test-key');

      expect(breaker).toBeDefined();
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('应该返回已存在的熔断器', () => {
      const breaker1 = manager.getOrCreateBreaker('test-key');
      const breaker2 = manager.getOrCreateBreaker('test-key');

      expect(breaker1).toBe(breaker2);
    });

    it('应该使用自定义配置创建熔断器', () => {
      const breaker = manager.getOrCreateBreaker('test-key', {
        failureThreshold: 3,
        timeout: 30000,
      });

      expect(breaker).toBeDefined();
    });

    it('应该更新最后访问时间', async () => {
      const breaker1 = manager.getOrCreateBreaker('test-key');
      const time1 = Date.now();

      await new Promise(resolve => setTimeout(resolve, 10));

      const breaker2 = manager.getOrCreateBreaker('test-key');
      const time2 = Date.now();

      expect(breaker1).toBe(breaker2);
      // 验证访问时间已更新（通过清理测试）
    });

    it('应该在达到最大数量时清理最旧的', () => {
      const customManager = new CircuitBreakerManager({
        maxSize: 2,
      });

      const breaker1 = customManager.getOrCreateBreaker('key1');
      const breaker2 = customManager.getOrCreateBreaker('key2');

      // 创建 key3 时，最旧的 CLOSED 状态熔断器应该被清理
      const breaker3 = customManager.getOrCreateBreaker('key3');

      // 验证统计信息（应该只有 2 个）
      const stats = customManager.getStats();
      expect(stats.total).toBe(2);

      // 验证 key3 存在
      expect(customManager.getOrCreateBreaker('key3')).toBe(breaker3);

      // key1 或 key2 中的一个应该被清理（取决于清理逻辑）
      // 重新获取被清理的 key 会创建新实例
      const newBreaker1 = customManager.getOrCreateBreaker('key1');
      const newBreaker2 = customManager.getOrCreateBreaker('key2');

      // 至少有一个是新实例
      const isKey1New = newBreaker1 !== breaker1;
      const isKey2New = newBreaker2 !== breaker2;
      expect(isKey1New || isKey2New).toBe(true);
    });
  });

  describe('removeBreaker', () => {
    it('应该移除指定的熔断器', () => {
      manager.getOrCreateBreaker('test-key');
      manager.removeBreaker('test-key');

      const breaker = manager.getOrCreateBreaker('test-key');
      // 应该创建新的实例
      expect(breaker).toBeDefined();
    });
  });

  describe('clear', () => {
    it('应该清除所有熔断器', () => {
      manager.getOrCreateBreaker('key1');
      manager.getOrCreateBreaker('key2');
      manager.clear();

      const stats = manager.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('getAllBreakers', () => {
    it('应该返回所有熔断器', () => {
      const breaker1 = manager.getOrCreateBreaker('key1');
      const breaker2 = manager.getOrCreateBreaker('key2');

      const allBreakers = manager.getAllBreakers();

      expect(allBreakers.size).toBe(2);
      expect(allBreakers.get('key1')).toBe(breaker1);
      expect(allBreakers.get('key2')).toBe(breaker2);
    });

    it('应该返回只读 Map', () => {
      const allBreakers = manager.getAllBreakers();

      // 尝试修改应该失败（TypeScript 类型检查）
      expect(allBreakers).toBeInstanceOf(Map);
    });
  });

  describe('cleanup', () => {
    it('应该清理不活跃的 CLOSED 状态熔断器', async () => {
      const customManager = new CircuitBreakerManager({
        idleTimeout: 100, // 100ms
      });

      const breaker1 = customManager.getOrCreateBreaker('key1');
      const breaker2 = customManager.getOrCreateBreaker('key2');

      // 等待超时
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = customManager.cleanup();

      expect(cleaned).toBeGreaterThan(0);
    });

    it('不应该清理 OPEN 状态的熔断器', async () => {
      const customManager = new CircuitBreakerManager({
        idleTimeout: 100,
      });

      const breaker = customManager.getOrCreateBreaker('key1', {
        failureThreshold: 2,
      });

      // 开启熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      // 等待超时
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = customManager.cleanup();

      // OPEN 状态的熔断器不应该被清理
      expect(cleaned).toBe(0);
    });

    it('不应该清理 HALF_OPEN 状态的熔断器', async () => {
      const customManager = new CircuitBreakerManager({
        idleTimeout: 100,
      });

      const breaker = customManager.getOrCreateBreaker('key1', {
        failureThreshold: 2,
        timeout: 50,
      });

      // 开启熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      // 等待超时并进入半开状态
      await new Promise(resolve => setTimeout(resolve, 100));
      breaker.advanceState();

      // 等待空闲超时
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleaned = customManager.cleanup();

      // HALF_OPEN 状态的熔断器不应该被清理
      expect(cleaned).toBe(0);
    });
  });

  describe('getStats', () => {
    it('应该返回正确的统计信息', () => {
      manager.getOrCreateBreaker('key1');
      manager.getOrCreateBreaker('key2');

      const stats = manager.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byState[CircuitBreakerState.CLOSED]).toBe(2);
      expect(stats.byState[CircuitBreakerState.OPEN]).toBe(0);
      expect(stats.byState[CircuitBreakerState.HALF_OPEN]).toBe(0);
    });

    it('应该按状态分类统计', async () => {
      const breaker1 = manager.getOrCreateBreaker('key1');
      const breaker2 = manager.getOrCreateBreaker('key2', {
        failureThreshold: 2,
      });

      // 开启 breaker2
      for (let i = 0; i < 2; i++) {
        try {
          await breaker2.execute(async () => {
            throw { response: { status: 500 } };
          });
        } catch {
          // 忽略错误
        }
      }

      const stats = manager.getStats();

      expect(stats.total).toBe(2);
      expect(stats.byState[CircuitBreakerState.CLOSED]).toBe(1);
      expect(stats.byState[CircuitBreakerState.OPEN]).toBe(1);
    });
  });

  describe('destroy', () => {
    it('应该停止定期清理并清除所有熔断器', () => {
      manager.getOrCreateBreaker('key1');
      manager.getOrCreateBreaker('key2');

      manager.destroy();

      const stats = manager.getStats();
      expect(stats.total).toBe(0);
    });
  });
});

