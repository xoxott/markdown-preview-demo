/** 节流工具函数 */

/** 可取消的节流/防抖函数类型 */
interface CancellableFn<T extends (...args: any[]) => any> {
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

/**
 * 防抖函数
 *
 * @param func 要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数（带 cancel 方法）
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): CancellableFn<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  const debouncedFn = function debouncedFn(this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  debouncedFn.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFn as CancellableFn<T>;
}

/**
 * 批量更新函数（收集一段时间内的更新，然后批量执行）
 *
 * @param func 要批量执行的函数
 * @param delay 批量延迟时间（毫秒）
 * @param maxBatchSize 最大批量大小
 * @returns 批量更新函数
 */
export function batchUpdate<T>(
  func: (items: T[]) => void,
  delay: number = 100,
  maxBatchSize: number = 100
): (item: T) => void {
  let batch: T[] = [];
  let timeoutId: NodeJS.Timeout | null = null;

  const flush = () => {
    if (batch.length > 0) {
      func(batch);
      batch = [];
    }
    timeoutId = null;
  };

  return (item: T) => {
    batch.push(item);

    if (batch.length >= maxBatchSize) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      flush();
    } else if (!timeoutId) {
      timeoutId = setTimeout(flush, delay);
    }
  };
}
