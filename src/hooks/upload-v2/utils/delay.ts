/**
 * 延迟工具函数
 */

/**
 * 延迟执行
 *
 * @param ms - 延迟毫秒数
 * @returns Promise
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
};

/**
 * 带取消功能的延迟
 *
 * @param ms - 延迟毫秒数
 * @returns 包含 promise 和 cancel 方法的对象
 */
export function cancellableDelay(ms: number): {
  promise: Promise<void>;
  cancel: () => void;
} {
  let timeoutId: NodeJS.Timeout;
  let rejectFn: (reason?: unknown) => void;

  const promise = new Promise<void>((resolve, reject) => {
    rejectFn = reject;
    timeoutId = setTimeout(resolve, ms);
  });

  const cancel = () => {
    clearTimeout(timeoutId);
    rejectFn(new Error('Delay cancelled'));
  };

  return { promise, cancel };
}

