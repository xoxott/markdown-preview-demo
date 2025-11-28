/**
 * 错误类型定义
 */
import { ErrorType } from '../utils/retry';
import { i18n } from '../utils/i18n';

/** 上传错误基类 */
export class UploadError extends Error {
  public readonly errorType: ErrorType;
  public readonly code?: string | number;
  public readonly context?: Record<string, any>;
  public readonly retryable: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    errorType: ErrorType,
    options: {
      code?: string | number;
      context?: Record<string, any>;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'UploadError';
    this.errorType = errorType;
    this.code = options.code;
    this.context = options.context;
    this.retryable = options.retryable ?? true;
    this.timestamp = Date.now();
    
    if (options.cause) {
      this.cause = options.cause;
    }

    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UploadError);
    }
  }

  /**
   * 转换为用户友好的错误消息（支持国际化）
   */
  toUserMessage(): string {
    switch (this.errorType) {
      case ErrorType.NETWORK_ERROR:
        return i18n.getErrorMessage('networkError');
      case ErrorType.TIMEOUT_ERROR:
        return i18n.getErrorMessage('timeoutError');
      case ErrorType.SERVER_ERROR:
        const baseMessage = i18n.getErrorMessage('serverError');
        return this.code ? `${baseMessage} (${this.code})` : baseMessage;
      case ErrorType.ABORT_ERROR:
        return i18n.getErrorMessage('abortError');
      default:
        return this.message || i18n.getErrorMessage('unknownError');
    }
  }

  /**
   * 转换为 JSON
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      errorType: this.errorType,
      code: this.code,
      context: this.context,
      retryable: this.retryable,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/** 网络错误 */
export class NetworkError extends UploadError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, ErrorType.NETWORK_ERROR, { context, cause, retryable: true });
    this.name = 'NetworkError';
  }
}

/** 超时错误 */
export class TimeoutError extends UploadError {
  constructor(message: string, timeout?: number, cause?: Error) {
    super(message, ErrorType.TIMEOUT_ERROR, {
      code: timeout,
      context: { timeout },
      cause,
      retryable: true
    });
    this.name = 'TimeoutError';
  }
}

/** 服务器错误 */
export class ServerError extends UploadError {
  constructor(
    message: string,
    statusCode: number,
    statusText?: string,
    cause?: Error
  ) {
    super(message, ErrorType.SERVER_ERROR, {
      code: statusCode,
      context: { statusCode, statusText },
      cause,
      retryable: true
    });
    this.name = 'ServerError';
  }
}

/** 取消错误 */
export class AbortError extends UploadError {
  constructor(message: string = '上传已取消', cause?: Error) {
    super(message, ErrorType.ABORT_ERROR, { cause, retryable: false });
    this.name = 'AbortError';
  }
}

/** 验证错误 */
export class ValidationError extends UploadError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.UNKNOWN_ERROR, { context, retryable: false });
    this.name = 'ValidationError';
  }
}

