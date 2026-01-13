/**
 * 日志配置
 */
export interface LoggerOptions {
  /** 是否启用日志（默认：false，需要明确设置） */
  enabled?: boolean;
  /** 是否记录请求日志 */
  logRequest?: boolean;
  /** 是否记录响应日志 */
  logResponse?: boolean;
  /** 是否记录错误日志 */
  logError?: boolean;
}

/**
 * 日志输出函数类型
 */
export type LogOutput = (message: string, ...args: unknown[]) => void;

/**
 * 日志配置（内部）
 */
export interface InternalLoggerOptions extends LoggerOptions {
  /** 日志输出函数 */
  output?: LogOutput;
}

