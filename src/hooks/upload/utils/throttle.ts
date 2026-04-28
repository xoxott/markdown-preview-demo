/** 节流工具函数 */

/** 可取消的节流函数类型 */
export interface CancellableFn<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

/**
 * 节流函数
 *
 * @param func 要节流的函数
 * @param delay 延迟时间（毫秒）
 * @returns 节流后的函数（带 cancel 方法）
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): CancellableFn<T> {
  let lastCallTime = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  const throttledFn = function throttledFn(this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    const callFunc = () => {
      lastCallTime = Date.now();
      func.apply(this, args);
    };

    if (timeSinceLastCall >= delay) {
      callFunc();
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(callFunc, delay - timeSinceLastCall);
    }
  };

  throttledFn.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttledFn as CancellableFn<T>;
}
