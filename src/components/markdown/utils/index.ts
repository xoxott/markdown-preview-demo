/**
 * 格式化错误信息
 *
 * @param error - 错误对象
 * @param context - 错误上下文描述
 * @returns 格式化后的错误信息
 */
export function formatError(error: unknown, context: string): string {
  if (error instanceof Error) {
    return `${context}: ${error.message}`;
  }
  return `${context}: 未知错误`;
}

/** 防抖 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: any[]) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  } as T;
}

/**
 * 节流函数（leading + trailing 模式）
 *
 * 首次调用立即执行（leading），后续调用按间隔触发。
 * 最后一次调用保证在间隔结束后执行（trailing），确保不丢失更新。
 *
 * @param fn - 要节流的函数
 * @param interval - 节流间隔（毫秒）
 */
export function throttle<T extends (...args: any[]) => void>(fn: T, interval: number): T {
  let lastTime = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: any[]) {
    const now = Date.now();
    const elapsed = now - lastTime;

    if (elapsed >= interval) {
      // Leading: 立即执行
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!trailingTimer) {
      // Trailing: 保证最后一次更新被执行
      trailingTimer = setTimeout(() => {
        trailingTimer = null;
        lastTime = Date.now();
        fn.apply(this, args);
      }, interval - elapsed);
    }
  } as T;
}
