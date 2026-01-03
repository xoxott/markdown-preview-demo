/**
 * 日志工具
 *
 * 提供统一的日志管理功能，支持开发/生产环境区分
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * 日志配置
 */
interface LoggerConfig {
  /** 当前日志级别 */
  level: LogLevel;
  /** 是否启用日志 */
  enabled: boolean;
  /** 前缀 */
  prefix: string;
}

/**
 * 默认配置
 */
const defaultConfig: LoggerConfig = {
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.WARN,
  enabled: true,
  prefix: '[Flow]'
};

/**
 * 日志工具类
 */
class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 调试日志（仅开发环境）
   */
  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`${this.config.prefix} [DEBUG] ${message}`, ...args);
    }
  }

  /**
   * 信息日志（仅开发环境）
   */
  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`${this.config.prefix} [INFO] ${message}`, ...args);
    }
  }

  /**
   * 警告日志
   */
  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`${this.config.prefix} [WARN] ${message}`, ...args);
    }
  }

  /**
   * 错误日志
   */
  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`${this.config.prefix} [ERROR] ${message}`, ...args);
    }
  }

  /**
   * 检查是否应该记录日志
   */
  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.level;
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 启用/禁用日志
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

/**
 * 默认日志实例
 */
export const logger = new Logger();

