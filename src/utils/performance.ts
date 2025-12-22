/**
 * 性能优化工具函数
 */

/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number = 300): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  } as T;
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param delay 延迟时间（毫秒）
 */
export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number = 300): T {
  let last = 0;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  } as T;
}

/**
 * 在浏览器空闲时执行任务
 * @param callback 回调函数
 * @param options 选项
 */
export function runWhenIdle(callback: () => void, options?: { timeout?: number }) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, options);
  } else {
    setTimeout(callback, options?.timeout || 1);
  }
}

/**
 * 预加载图片
 * @param urls 图片URL数组
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(
      url =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = url;
        })
    )
  );
}

/**
 * 动态导入组件（带错误处理）
 * @param importFn 导入函数
 */
export function lazyLoadComponent(importFn: () => Promise<any>) {
  return () =>
    importFn().catch(error => {
      console.error('Component load failed:', error);
      // 返回一个错误组件
      return {
        template: '<div>组件加载失败，请刷新重试</div>'
      };
    });
}

