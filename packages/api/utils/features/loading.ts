/**
 * Loading 加载提示管理器
 */

import { internalError, internalWarn } from '../common/internalLogger';

/**
 * Loading 显示函数类型
 */
export type LoadingShowFunction = () => void;

/**
 * Loading 隐藏函数类型
 */
export type LoadingHideFunction = () => void;

/**
 * Loading 管理器配置
 */
export interface LoadingManagerOptions {
  /** 显示 Loading 的函数 */
  show?: LoadingShowFunction;
  /** 隐藏 Loading 的函数 */
  hide?: LoadingHideFunction;
  /** 延迟显示时间（毫秒），避免闪烁 */
  delay?: number;
}

/**
 * 默认延迟时间（毫秒）
 */
const DEFAULT_DELAY = 200;

/**
 * Loading 管理器类
 */
class LoadingManager {
  private count = 0;
  private showFn?: LoadingShowFunction;
  private hideFn?: LoadingHideFunction;
  private delay: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isShown = false;

  constructor(options: LoadingManagerOptions = {}) {
    this.showFn = options.show;
    this.hideFn = options.hide;
    this.delay = options.delay ?? DEFAULT_DELAY;
  }

  /**
   * 设置显示/隐藏函数
   */
  setHandlers(options: LoadingManagerOptions): void {
    if (options.show !== undefined) {
      this.showFn = options.show;
    }
    if (options.hide !== undefined) {
      this.hideFn = options.hide;
    }
    if (options.delay !== undefined && options.delay >= 0) {
      this.delay = options.delay;
    }
  }

  /**
   * 清除定时器
   */
  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * 安全调用显示函数
   */
  private safeCallShow(): boolean {
    if (!this.showFn) {
      return false;
    }

    try {
      this.showFn();
      return true;
    } catch (error) {
      internalError('显示 Loading 失败:', error);
      return false;
    }
  }

  /**
   * 安全调用隐藏函数
   */
  private safeCallHide(): boolean {
    if (!this.hideFn) {
      return false;
    }

    try {
      this.hideFn();
      return true;
    } catch (error) {
      internalError('隐藏 Loading 失败:', error);
      return false;
    }
  }

  /**
   * 检查计数是否溢出
   */
  private checkCountOverflow(): boolean {
    if (this.count >= Number.MAX_SAFE_INTEGER) {
      internalWarn('Loading 计数已达到最大值，可能存在内存泄漏');
      return true;
    }
    return false;
  }

  /**
   * 增加 Loading 计数
   */
  increment(): void {
    // 防止计数溢出
    if (this.checkCountOverflow()) {
      return;
    }

    this.count++;

    // 如果已经在显示，清除定时器并直接返回
    if (this.isShown) {
      this.clearTimer();
      return;
    }

    // 清除之前的定时器（如果有）
    this.clearTimer();

    // 延迟显示，避免闪烁
    this.timer = setTimeout(() => {
      // 再次检查状态，防止在延迟期间状态已改变
      if (this.count > 0 && !this.isShown) {
        const success = this.safeCallShow();
        if (success) {
          this.isShown = true;
        } else {
          // 如果显示失败，恢复计数
          this.count = Math.max(0, this.count - 1);
        }
      }
      this.timer = null;
    }, this.delay);
  }

  /**
   * 减少 Loading 计数
   */
  decrement(): void {
    if (this.count > 0) {
      this.count--;
    }

    // 清除延迟定时器（防止在延迟期间状态改变）
    this.clearTimer();

    // 如果计数为 0 且正在显示，则隐藏
    if (this.count === 0 && this.isShown) {
      this.isShown = false;
      this.safeCallHide();
    }
  }

  /**
   * 重置 Loading 状态
   */
  reset(): void {
    // 清除延迟定时器
    this.clearTimer();

    // 如果正在显示，先隐藏
    if (this.isShown) {
      this.isShown = false;
      this.safeCallHide();
    }

    // 重置计数
    this.count = 0;
  }

  /**
   * 获取当前 Loading 计数
   */
  getCount(): number {
    return this.count;
  }

  /**
   * 检查是否正在显示 Loading
   */
  isShowing(): boolean {
    return this.isShown;
  }

  /**
   * 获取当前延迟时间
   */
  getDelay(): number {
    return this.delay;
  }

  /**
   * 清理资源（用于组件卸载时调用）
   */
  destroy(): void {
    this.reset();
    this.showFn = undefined;
    this.hideFn = undefined;
  }
}

// 创建全局 Loading 管理器实例（默认不配置处理器，需要在应用层配置）
export const loadingManager = new LoadingManager();

/**
 * 显示 Loading
 */
export function showLoading(): void {
  loadingManager.increment();
}

/**
 * 隐藏 Loading
 */
export function hideLoading(): void {
  loadingManager.decrement();
}

/**
 * 重置 Loading 状态
 */
export function resetLoading(): void {
  loadingManager.reset();
}
