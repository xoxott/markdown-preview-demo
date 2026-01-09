/**
 * 性能监控工具
 *
 * 用于监控和分析 Flow 组件的性能瓶颈。
 * 可以记录函数执行时间、生成统计报告、识别慢操作等。
 *
 * @example
 * ```typescript
 * // 在浏览器控制台中使用
 * window.__flowPerformanceMonitor__.enable();
 * // ... 执行一些操作
 * window.__flowPerformanceMonitor__.printReport();
 * ```
 *
 * @example
 * ```typescript
 * // 使用装饰器自动监控方法
 * class MyClass {
 *   @measurePerformance('myMethod')
 *   myMethod() {
 *     // 方法执行时间会被自动记录
 *   }
 * }
 * ```
 */

/**
 * 性能记录详情类型
 *
 * 用于记录额外的上下文信息，如节点数量、视口状态等
 */
type PerformanceDetails = Record<string, unknown>;

/**
 * 性能记录条目
 */
interface PerformanceEntry {
  /** 操作名称（用于分组统计） */
  name: string;
  /** 开始时间（毫秒时间戳） */
  startTime: number;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 额外详情（可选，用于记录上下文信息） */
  details?: PerformanceDetails;
}

/**
 * 性能统计信息
 */
interface PerformanceStats {
  /** 执行次数 */
  count: number;
  /** 总耗时（毫秒） */
  total: number;
  /** 平均耗时（毫秒） */
  avg: number;
  /** 最大耗时（毫秒） */
  max: number;
  /** 最小耗时（毫秒） */
  min: number;
}

/**
 * 性能监控器类
 *
 * 提供性能数据的收集、统计和分析功能。
 * 使用单例模式，全局共享一个监控实例。
 */
class PerformanceMonitor {
  /** 性能记录列表（FIFO 队列，限制最大数量） */
  private entries: PerformanceEntry[] = [];

  /** 最大记录数量（超过后自动删除最旧的记录） */
  private maxEntries = 100;

  /** 是否启用监控（默认关闭，需要手动启用） */
  private enabled = false;

  /**
   * 启用性能监控
   *
   * 启用后，所有 `record()` 调用才会生效。
   * 建议在需要性能分析时再启用，避免生产环境产生额外开销。
   *
   * @example
   * ```typescript
   * performanceMonitor.enable();
   * ```
   */
  enable(): void {
    this.enabled = true;
    console.log('[PerformanceMonitor] 已启用');
  }

  /**
   * 禁用性能监控
   *
   * 禁用后，`record()` 调用会被忽略，不会产生任何开销。
   *
   * @example
   * ```typescript
   * performanceMonitor.disable();
   * ```
   */
  disable(): void {
    this.enabled = false;
    console.log('[PerformanceMonitor] 已禁用');
  }

  /**
   * 记录性能数据
   *
   * 记录一个操作的执行时间。如果监控未启用，此调用会被忽略。
   *
   * @param name 操作名称（用于分组统计，如 'render', 'updateViewport'）
   * @param duration 执行耗时（毫秒）
   * @param details 额外详情（可选，用于记录上下文信息，如节点数量、视口状态等）
   *
   * @example
   * ```typescript
   * const start = performance.now();
   * // ... 执行操作
   * const duration = performance.now() - start;
   * performanceMonitor.record('render', duration, { nodeCount: 200 });
   * ```
   */
  record(name: string, duration: number, details?: PerformanceDetails): void {
    if (!this.enabled) return;

    this.entries.push({
      name,
      startTime: performance.now(),
      duration,
      details
    });

    // 限制记录数量，使用 FIFO 策略（删除最旧的记录）
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  /**
   * 获取性能统计
   *
   * 对所有记录进行分组统计，计算每个操作的：
   * - 执行次数
   * - 总耗时
   * - 平均耗时
   * - 最大耗时
   * - 最小耗时
   *
   * @returns 统计信息对象，键为操作名称，值为统计信息
   *
   * @example
   * ```typescript
   * const stats = performanceMonitor.getStats();
   * console.log(stats.render.avg); // 平均耗时
   * ```
   */
  getStats(): Record<string, PerformanceStats> | { message: string } {
    if (this.entries.length === 0) {
      return { message: '没有性能数据' };
    }

    const stats: Record<string, PerformanceStats> = {};

    // 遍历所有记录，按操作名称分组统计
    this.entries.forEach(entry => {
      if (!stats[entry.name]) {
        stats[entry.name] = {
          count: 0,
          total: 0,
          avg: 0,
          max: 0,
          min: Infinity
        };
      }

      const stat = stats[entry.name];
      stat.count++;
      stat.total += entry.duration;
      stat.max = Math.max(stat.max, entry.duration);
      stat.min = Math.min(stat.min, entry.duration);
    });

    // 计算平均值
    Object.keys(stats).forEach(name => {
      stats[name].avg = stats[name].total / stats[name].count;
    });

    return stats;
  }

  /**
   * 打印性能报告
   *
   * 在控制台以表格形式打印性能统计报告，方便查看和分析。
   *
   * @example
   * ```typescript
   * performanceMonitor.printReport();
   * // 输出表格：
   * // ┌─────────┬───────┬─────────┬───────┬───────┐
   * // │ name    │ count │ avg     │ max   │ min   │
   * // ├─────────┼───────┼─────────┼───────┼───────┤
   * // │ render  │ 100   │ 12.5    │ 25.0  │ 8.0   │
   * // └─────────┴───────┴─────────┴───────┴───────┘
   * ```
   */
  printReport(): void {
    const stats = this.getStats();
    console.group('[PerformanceMonitor] 性能报告');
    console.table(stats);
    console.groupEnd();
  }

  /**
   * 清除所有记录
   *
   * 清空所有已记录的性能数据，用于重新开始监控。
   *
   * @example
   * ```typescript
   * performanceMonitor.clear();
   * ```
   */
  clear(): void {
    this.entries = [];
    console.log('[PerformanceMonitor] 已清除所有记录');
  }

  /**
   * 获取最近的慢操作
   *
   * 筛选出耗时超过阈值的操作，按耗时降序排列，返回最慢的 N 个操作。
   * 用于快速定位性能瓶颈。
   *
   * @param threshold 耗时阈值（毫秒），默认 5ms
   * @param limit 返回数量限制，默认 10
   * @returns 慢操作列表，按耗时降序排列
   *
   * @example
   * ```typescript
   * const slowOps = performanceMonitor.getSlowOperations(10, 5);
   * // 返回耗时超过 10ms 的最慢 5 个操作
   * ```
   */
  getSlowOperations(threshold = 5, limit = 10): PerformanceEntry[] {
    return this.entries
      .filter(entry => entry.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * 检查是否已启用
   *
   * @returns 是否已启用监控
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取当前记录数量
   *
   * @returns 当前记录的数量
   */
  getEntryCount(): number {
    return this.entries.length;
  }
}

// ==================== 导出单例 ====================

/**
 * 全局性能监控器实例（单例）
 *
 * 在开发环境下，可以通过 `window.__flowPerformanceMonitor__` 访问。
 *
 * @example
 * ```typescript
 * // 在浏览器控制台中使用
 * window.__flowPerformanceMonitor__.enable();
 * window.__flowPerformanceMonitor__.printReport();
 * ```
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Window 对象扩展接口
 *
 * 用于在开发环境下将性能监控器挂载到 window 对象
 */
interface WindowWithPerformanceMonitor extends Window {
  __flowPerformanceMonitor__?: PerformanceMonitor;
}

// 在开发环境下，将监控器挂载到 window 对象，方便在控制台访问
// 并自动启用监控（方便调试）
if (import.meta.env.DEV) {
  (window as WindowWithPerformanceMonitor).__flowPerformanceMonitor__ = performanceMonitor;
  // 开发环境自动启用，方便调试性能问题
  performanceMonitor.enable();
}

// ==================== 装饰器 ====================

/**
 * 性能测量装饰器
 *
 * 自动为类方法添加性能监控功能。
 * 方法执行时，会自动记录执行时间到性能监控器。
 *
 * @param name 操作名称（用于统计分组）
 * @returns 装饰器函数
 *
 * @example
 * ```typescript
 * class MyClass {
 *   @measurePerformance('myMethod')
 *   myMethod() {
 *     // 方法执行时间会被自动记录
 *     // 如果耗时超过 5ms，会在控制台输出警告
 *   }
 * }
 * ```
 *
 * @note
 * 此装饰器仅适用于类方法，不适用于函数。
 * 如果方法执行时间超过 5ms，会自动在控制台输出警告。
 */
export function measurePerformance(name: string) {
  return function (
    _target: object,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    if (typeof originalMethod !== 'function') {
      throw new TypeError('measurePerformance 装饰器只能用于方法');
    }
    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const duration = performance.now() - start;

      // 记录性能数据
      performanceMonitor.record(name, duration);

      // 如果耗时超过 5ms，输出警告
      if (duration > 5) {
        console.warn(`[Performance] ${name} 耗时: ${duration.toFixed(2)}ms`);
      }

      return result;
    };

    return descriptor;
  };
}

