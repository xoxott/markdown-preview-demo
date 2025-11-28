/**
 * AbortController 工具函数
 */

/**
 * 安全中止控制器（避免重复中止）
 */
export function safeAbort(controller: AbortController | undefined): void {
  if (controller && !controller.signal.aborted) {
    controller.abort();
  }
}

/**
 * 批量中止控制器
 */
export function abortAll(controllers: AbortController[]): void {
  controllers.forEach(controller => safeAbort(controller));
}

/**
 * 创建组合的 AbortSignal（合并多个信号）
 */
export function combineAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal | undefined {
  const validSignals = signals.filter((s): s is AbortSignal => s !== undefined);
  
  if (validSignals.length === 0) return undefined;
  if (validSignals.length === 1) return validSignals[0];
  
  const combinedController = new AbortController();
  
  const onAbort = () => combinedController.abort();
  validSignals.forEach(signal => {
    if (signal.aborted) {
      combinedController.abort();
    } else {
      signal.addEventListener('abort', onAbort);
    }
  });
  
  return combinedController.signal;
}

