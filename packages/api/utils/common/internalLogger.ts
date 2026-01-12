/**
 * 内部日志工具
 */

/**
 * 内部错误日志
 * @param message 错误消息
 * @param error 错误对象（可选）
 */
export function internalError(message: string, error?: unknown): void {
  if (typeof console !== 'undefined' && console.error) {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
}

/**
 * 内部警告日志
 * @param message 警告消息
 * @param data 附加数据（可选）
 */
export function internalWarn(message: string, data?: unknown): void {
  if (typeof console !== 'undefined' && console.warn) {
    if (data) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }
}

/**
 * 内部信息日志
 * @param message 信息消息
 * @param data 附加数据（可选）
 */
export function internalLog(message: string, data?: unknown): void {
  if (typeof console !== 'undefined' && console.log) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
}
