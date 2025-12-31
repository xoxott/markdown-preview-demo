/**
 * RAF 节流工具类
 *
 * 框架无关的 RAF 节流实现，供核心类使用。
 * 注意：这是纯函数工具，不依赖 Vue，可以在类中使用。
 *
 * @example
 * ```typescript
 * // 在类中使用
 * class MyHandler {
 *   private rafThrottle = new RafThrottle<MouseEvent>();
 *
 *   update(event: MouseEvent): void {
 *     this.rafThrottle.throttle(event, (e) => {
 *       this.process(e);
 *     });
 *   }
 *
 *   cleanup(): void {
 *     this.rafThrottle.cleanup();
 *   }
 * }
 * ```
 */

/**
 * RAF 节流工具类
 *
 * 使用 requestAnimationFrame 对函数执行进行节流，确保每帧最多执行一次。
 * 适用于需要高频触发但不需要每帧都执行的场景。
 *
 * @template T 要节流的值类型
 */
export class RafThrottle<T = void> {
  /** RAF 请求 ID（用于取消） */
  private rafId: number | null = null;

  /** 待处理的值（保留最新的值） */
  private pendingValue: T | null = null;

  /** 是否启用节流 */
  private enabled: boolean = true;

  /**
   * 节流执行函数
   *
   * 调用此方法会进行 RAF 节流，确保每帧最多执行一次。
   * 如果多次调用，会使用最新的值执行。
   *
   * @param value 要处理的值（会被保留为最新值）
   * @param handler 处理函数（在 RAF 回调中执行）
   */
  throttle(value: T, handler: (value: T) => void): void {
    if (!this.enabled) {
      // 如果未启用节流，直接执行
      handler(value);
      return;
    }

    // 保存最新的值
    this.pendingValue = value;

    // 如果已经有待执行的 RAF，直接返回（使用最新的值）
    if (this.rafId !== null) {
      return;
    }

    // 请求下一帧执行
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.pendingValue !== null) {
        handler(this.pendingValue);
        this.pendingValue = null;
      }
    });
  }

  /**
   * 取消待执行的 RAF
   *
   * 清理资源，取消待执行的函数调用
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingValue = null;
  }

  /**
   * 设置是否启用节流
   *
   * @param enabled 是否启用节流
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 检查是否启用节流
   *
   * @returns 是否启用节流
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 清理资源
   *
   * 取消 RAF、重置状态，用于对象销毁时调用
   */
  cleanup(): void {
    this.cancel();
  }
}

