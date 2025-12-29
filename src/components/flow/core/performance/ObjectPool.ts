/**
 * Flow 对象池
 *
 * 实现对象池模式，减少 GC 压力，提升性能
 * 适用于频繁创建和销毁的临时对象
 */

/**
 * 对象池选项
 */
export interface ObjectPoolOptions<T> {
  /** 初始池大小 */
  initialSize?: number;
  /** 最大池大小 */
  maxSize?: number;
  /** 是否启用统计 */
  enableStats?: number;
}

/**
 * 对象池统计信息
 */
export interface ObjectPoolStats {
  /** 池中对象数量 */
  poolSize: number;
  /** 最大池大小 */
  maxSize: number;
  /** 总创建次数 */
  totalCreated: number;
  /** 总获取次数 */
  totalAcquired: number;
  /** 总释放次数 */
  totalReleased: number;
  /** 缓存命中率 */
  hitRate: number;
}

/**
 * 对象池类
 *
 * @template T 对象类型
 */
export class ObjectPool<T> {
  /** 对象池 */
  private pool: T[] = [];

  /** 对象工厂函数 */
  private factory: () => T;

  /** 对象重置函数 */
  private reset: (obj: T) => void;

  /** 配置选项 */
  private options: Required<ObjectPoolOptions<T>>;

  /** 统计信息 */
  private stats = {
    totalCreated: 0,
    totalAcquired: 0,
    totalReleased: 0,
  };

  /**
   * 创建对象池
   *
   * @param factory 对象工厂函数
   * @param reset 对象重置函数
   * @param options 配置选项
   */
  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    options: ObjectPoolOptions<T> = {}
  ) {
    this.factory = factory;
    this.reset = reset;
    this.options = {
      initialSize: options.initialSize || 10,
      maxSize: options.maxSize || 1000,
      enableStats: options.enableStats || 1,
    };

    // 预创建初始对象
    for (let i = 0; i < this.options.initialSize; i++) {
      this.pool.push(this.factory());
      this.stats.totalCreated++;
    }
  }

  /**
   * 从池中获取对象
   *
   * @returns 对象实例
   */
  acquire(): T {
    this.stats.totalAcquired++;

    // 如果池中有对象，直接返回
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    // 否则创建新对象
    this.stats.totalCreated++;
    return this.factory();
  }

  /**
   * 释放对象回池中
   *
   * @param obj 要释放的对象
   */
  release(obj: T): void {
    this.stats.totalReleased++;

    // 重置对象状态
    this.reset(obj);

    // 如果池未满，放回池中
    if (this.pool.length < this.options.maxSize) {
      this.pool.push(obj);
    }
    // 否则丢弃（让 GC 回收）
  }

  /**
   * 批量释放对象
   *
   * @param objects 要释放的对象数组
   */
  releaseAll(objects: T[]): void {
    objects.forEach(obj => this.release(obj));
  }

  /**
   * 清空对象池
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * 获取池中对象数量
   *
   * @returns 对象数量
   */
  size(): number {
    return this.pool.length;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计信息
   */
  getStats(): ObjectPoolStats {
    const hitRate = this.stats.totalAcquired > 0
      ? (this.stats.totalAcquired - this.stats.totalCreated + this.options.initialSize) / this.stats.totalAcquired
      : 0;

    return {
      poolSize: this.pool.length,
      maxSize: this.options.maxSize,
      totalCreated: this.stats.totalCreated,
      totalAcquired: this.stats.totalAcquired,
      totalReleased: this.stats.totalReleased,
      hitRate: Math.max(0, Math.min(1, hitRate)),
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalCreated: 0,
      totalAcquired: 0,
      totalReleased: 0,
    };
  }

  /**
   * 预热对象池（预创建对象）
   *
   * @param count 预创建数量
   */
  warmup(count: number): void {
    const needed = Math.min(count - this.pool.length, this.options.maxSize - this.pool.length);

    for (let i = 0; i < needed; i++) {
      this.pool.push(this.factory());
      this.stats.totalCreated++;
    }
  }

  /**
   * 收缩对象池（移除多余对象）
   *
   * @param targetSize 目标大小
   */
  shrink(targetSize: number): void {
    if (targetSize < this.pool.length) {
      this.pool.splice(targetSize);
    }
  }
}

/**
 * 创建位置对象池
 */
export function createPositionPool(initialSize = 100, maxSize = 1000): ObjectPool<{ x: number; y: number }> {
  return new ObjectPool(
    () => ({ x: 0, y: 0 }),
    (pos) => {
      pos.x = 0;
      pos.y = 0;
    },
    { initialSize, maxSize }
  );
}

/**
 * 创建边界对象池
 */
export function createBoundsPool(initialSize = 50, maxSize = 500): ObjectPool<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}> {
  return new ObjectPool(
    () => ({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    }),
    (bounds) => {
      bounds.minX = 0;
      bounds.minY = 0;
      bounds.maxX = 0;
      bounds.maxY = 0;
      bounds.width = 0;
      bounds.height = 0;
    },
    { initialSize, maxSize }
  );
}

/**
 * 创建数组对象池
 */
export function createArrayPool<T>(initialSize = 50, maxSize = 500): ObjectPool<T[]> {
  return new ObjectPool<T[]>(
    () => [] as T[],
    (arr: T[]) => {
      arr.length = 0;
    },
    { initialSize, maxSize }
  );
}

/**
 * 创建 Map 对象池
 */
export function createMapPool<K, V>(initialSize = 20, maxSize = 200): ObjectPool<Map<K, V>> {
  return new ObjectPool(
    () => new Map<K, V>(),
    (map) => {
      map.clear();
    },
    { initialSize, maxSize }
  );
}

/**
 * 创建 Set 对象池
 */
export function createSetPool<T>(initialSize = 20, maxSize = 200): ObjectPool<Set<T>> {
  return new ObjectPool(
    () => new Set<T>(),
    (set) => {
      set.clear();
    },
    { initialSize, maxSize }
  );
}

