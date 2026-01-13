/**
 * 内部日志工具
 * 用于包内部的日志输出，不对外暴露
 */

/**
 * 内部错误日志
 */
export function internalError(message: string, ...args: unknown[]): void {
  console.error(`[request-client] ${message}`, ...args);
}

/**
 * 内部警告日志
 */
export function internalWarn(message: string, ...args: unknown[]): void {
  console.warn(`[request-client] ${message}`, ...args);
}

/**
 * 内部信息日志
 */
export function internalLog(message: string, ...args: unknown[]): void {
  console.log(`[request-client] ${message}`, ...args);
}

