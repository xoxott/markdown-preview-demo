/**
 * ObjectPool 测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectPool, createPositionPool } from '../core/performance/ObjectPool';

describe('ObjectPool', () => {
  let pool: ObjectPool<{ x: number; y: number }>;

  beforeEach(() => {
    pool = new ObjectPool(
      () => ({ x: 0, y: 0 }),
      (obj) => {
        obj.x = 0;
        obj.y = 0;
      },
      { initialSize: 5, maxSize: 10 }
    );
  });

  it('应该预创建初始对象', () => {
    expect(pool.size()).toBe(5);
  });

  it('应该从池中获取对象', () => {
    const obj = pool.acquire();
    expect(obj).toBeDefined();
    expect(obj.x).toBe(0);
    expect(obj.y).toBe(0);
  });

  it('应该释放对象回池中', () => {
    const obj = pool.acquire();
    obj.x = 100;
    obj.y = 200;

    const sizeBefore = pool.size();
    pool.release(obj);
    const sizeAfter = pool.size();

    expect(sizeAfter).toBe(sizeBefore + 1);
  });

  it('应该重置释放的对象', () => {
    const obj = pool.acquire();
    obj.x = 100;
    obj.y = 200;

    pool.release(obj);
    const obj2 = pool.acquire();

    expect(obj2.x).toBe(0);
    expect(obj2.y).toBe(0);
  });

  it('应该限制池的最大大小', () => {
    // 获取所有对象
    const objects = [];
    for (let i = 0; i < 15; i++) {
      objects.push(pool.acquire());
    }

    // 释放所有对象
    objects.forEach(obj => pool.release(obj));

    // 池大小应该不超过 maxSize
    expect(pool.size()).toBeLessThanOrEqual(10);
  });

  it('应该正确统计信息', () => {
    pool.acquire();
    pool.acquire();

    const stats = pool.getStats();
    expect(stats.totalAcquired).toBe(2);
    expect(stats.maxSize).toBe(10);
  });

  it('应该预热对象池', () => {
    pool.clear();
    pool.warmup(8);
    expect(pool.size()).toBe(8);
  });

  it('应该收缩对象池', () => {
    pool.shrink(3);
    expect(pool.size()).toBe(3);
  });
});

describe('createPositionPool', () => {
  it('应该创建位置对象池', () => {
    const pool = createPositionPool(10, 100);
    const pos = pool.acquire();
    
    expect(pos).toBeDefined();
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);

    pool.release(pos);
  });
});

