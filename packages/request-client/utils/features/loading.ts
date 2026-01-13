/**
 * Loading 管理工具
 */

/**
 * Loading 显示函数类型
 */
export type LoadingShowFunction = () => void;

/**
 * Loading 隐藏函数类型
 */
export type LoadingHideFunction = () => void;

/**
 * Loading 管理器选项
 */
export interface LoadingManagerOptions {
  show?: LoadingShowFunction;
  hide?: LoadingHideFunction;
}

/**
 * Loading 管理器
 */
class LoadingManager {
  private showFn: LoadingShowFunction | null = null;
  private hideFn: LoadingHideFunction | null = null;
  private count = 0;

  /**
   * 配置 Loading 函数
   */
  configure(options: LoadingManagerOptions): void {
    this.showFn = options.show || null;
    this.hideFn = options.hide || null;
  }

  /**
   * 显示 Loading
   */
  show(): void {
    this.count++;
    if (this.showFn && this.count === 1) {
      this.showFn();
    }
  }

  /**
   * 隐藏 Loading
   */
  hide(): void {
    this.count = Math.max(0, this.count - 1);
    if (this.hideFn && this.count === 0) {
      this.hideFn();
    }
  }

  /**
   * 重置 Loading（强制隐藏）
   */
  reset(): void {
    this.count = 0;
    if (this.hideFn) {
      this.hideFn();
    }
  }
}

export const loadingManager = new LoadingManager();

/**
 * 显示 Loading
 */
export function showLoading(): void {
  loadingManager.show();
}

/**
 * 隐藏 Loading
 */
export function hideLoading(): void {
  loadingManager.hide();
}

/**
 * 重置 Loading
 */
export function resetLoading(): void {
  loadingManager.reset();
}

