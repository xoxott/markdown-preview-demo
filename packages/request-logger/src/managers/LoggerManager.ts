/**
 * 日志管理器
 */

import type { InternalLoggerOptions, LogOutput } from '../types';

/**
 * 日志管理器
 */
export class LoggerManager {
  private options: InternalLoggerOptions;

  constructor(options: InternalLoggerOptions = {}) {
    this.options = {
      enabled: false, // 默认禁用，需要使用者明确启用
      logRequest: true,
      logResponse: true,
      logError: true,
      output: console.log,
      ...options,
    };
  }

  /**
   * 设置日志配置
   */
  setOptions(options: Partial<InternalLoggerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 检查是否应该记录日志
   */
  shouldLog(override?: boolean): boolean {
    // 如果请求配置中明确指定，优先使用
    if (override !== undefined) {
      return override;
    }

    // 使用全局配置（必须明确设置）
    return this.options.enabled === true;
  }

  /**
   * 检查是否应该记录请求日志
   */
  shouldLogRequest(override?: boolean): boolean {
    return this.shouldLog(override) && this.options.logRequest !== false;
  }

  /**
   * 检查是否应该记录响应日志
   */
  shouldLogResponse(override?: boolean): boolean {
    return this.shouldLog(override) && this.options.logResponse !== false;
  }

  /**
   * 检查是否应该记录错误日志
   */
  shouldLogError(override?: boolean): boolean {
    return this.shouldLog(override) && this.options.logError !== false;
  }

  /**
   * 获取日志输出函数
   */
  getOutput(): LogOutput {
    return this.options.output ?? console.log;
  }
}

