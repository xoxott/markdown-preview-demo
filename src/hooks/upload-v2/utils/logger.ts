/**
 * 统一日志系统
 */

/** 日志级别 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

/** 日志配置 */
interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageSize: number;
}

/** 日志条目 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, any>;
  error?: Error;
}

/**
 * 日志管理器
 */
class Logger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private readonly storageKey = 'upload-v2-logs';

  constructor() {
    // 根据环境设置默认日志级别
    const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';
    
    this.config = {
      level: isDev ? LogLevel.DEBUG : LogLevel.WARN,
      enableConsole: true,
      enableStorage: isDev,
      maxStorageSize: 100
    };

    // 从 localStorage 恢复日志（如果启用）
    if (this.config.enableStorage) {
      this.loadLogs();
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      error
    };

    // 控制台输出
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // 存储日志
    if (this.config.enableStorage) {
      this.logs.push(entry);
      
      // 限制日志数量
      if (this.logs.length > this.config.maxStorageSize) {
        this.logs.shift();
      }

      this.saveLogs();
    }
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[Upload-V2] [${timestamp}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, entry.context || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, entry.context || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, entry.context || '', entry.error || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, entry.context || '', entry.error || '');
        break;
    }
  }

  /**
   * 保存日志到 localStorage
   */
  private saveLogs(): void {
    try {
      const logsJson = JSON.stringify(this.logs);
      localStorage.setItem(this.storageKey, logsJson);
    } catch (error) {
      // localStorage 可能已满或不可用
      console.warn('无法保存日志到 localStorage:', error);
    }
  }

  /**
   * 从 localStorage 加载日志
   */
  private loadLogs(): void {
    try {
      const logsJson = localStorage.getItem(this.storageKey);
      if (logsJson) {
        this.logs = JSON.parse(logsJson);
      }
    } catch (error) {
      console.warn('无法从 localStorage 加载日志:', error);
    }
  }

  /**
   * 获取日志
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs = [];
    if (this.config.enableStorage) {
      localStorage.removeItem(this.storageKey);
    }
  }

  // 公共方法
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
}

// 导出单例
export const logger = new Logger();

