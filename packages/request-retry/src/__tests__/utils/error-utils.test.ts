/**
 * error-utils 测试
 */

import { describe, expect, it } from 'vitest';
import {
  isServerError,
  isClientError,
  isRetryableStatusCode,
  isRetryableClientError,
  isCanceledError,
  getErrorType,
  isApplicableErrorType,
} from '../../utils/error-utils';
import type { RetryableError } from '../../types';

describe('error-utils', () => {
  describe('isServerError', () => {
    it('应该识别 5xx 状态码', () => {
      expect(isServerError(500)).toBe(true);
      expect(isServerError(503)).toBe(true);
      expect(isServerError(599)).toBe(true);
    });

    it('不应该识别 4xx 状态码', () => {
      expect(isServerError(400)).toBe(false);
      expect(isServerError(404)).toBe(false);
      expect(isServerError(499)).toBe(false);
    });

    it('不应该识别 2xx 状态码', () => {
      expect(isServerError(200)).toBe(false);
      expect(isServerError(201)).toBe(false);
    });
  });

  describe('isClientError', () => {
    it('应该识别 4xx 状态码', () => {
      expect(isClientError(400)).toBe(true);
      expect(isClientError(404)).toBe(true);
      expect(isClientError(499)).toBe(true);
    });

    it('不应该识别 5xx 状态码', () => {
      expect(isClientError(500)).toBe(false);
      expect(isClientError(503)).toBe(false);
    });

    it('不应该识别 2xx 状态码', () => {
      expect(isClientError(200)).toBe(false);
      expect(isClientError(201)).toBe(false);
    });
  });

  describe('isRetryableStatusCode', () => {
    it('应该识别 5xx 状态码', () => {
      expect(isRetryableStatusCode(500)).toBe(true);
      expect(isRetryableStatusCode(503)).toBe(true);
    });

    it('应该识别可重试的客户端错误（408, 429）', () => {
      expect(isRetryableStatusCode(408)).toBe(true);
      expect(isRetryableStatusCode(429)).toBe(true);
    });

    it('不应该识别其他 4xx 状态码', () => {
      expect(isRetryableStatusCode(400)).toBe(false);
      expect(isRetryableStatusCode(404)).toBe(false);
    });
  });

  describe('isRetryableClientError', () => {
    it('应该识别 408 状态码', () => {
      expect(isRetryableClientError(408)).toBe(true);
    });

    it('应该识别 429 状态码', () => {
      expect(isRetryableClientError(429)).toBe(true);
    });

    it('不应该识别其他 4xx 状态码', () => {
      expect(isRetryableClientError(400)).toBe(false);
      expect(isRetryableClientError(404)).toBe(false);
    });
  });

  describe('isCanceledError', () => {
    it('应该识别 ERR_CANCELED 错误代码', () => {
      const error: RetryableError = {
        code: 'ERR_CANCELED',
        message: 'Request canceled',
      };
      expect(isCanceledError(error)).toBe(true);
    });

    it('应该识别 ECONNABORTED 错误代码', () => {
      const error: RetryableError = {
        code: 'ECONNABORTED',
        message: 'Connection aborted',
      };
      expect(isCanceledError(error)).toBe(true);
    });

    it('应该识别包含 "canceled" 的错误消息', () => {
      const error: RetryableError = {
        message: 'Request was canceled',
      };
      expect(isCanceledError(error)).toBe(true);
    });

    it('应该识别包含 "aborted" 的错误消息', () => {
      const error: RetryableError = {
        message: 'Request was aborted',
      };
      expect(isCanceledError(error)).toBe(true);
    });

    it('不应该识别普通错误', () => {
      const error: RetryableError = {
        message: 'Request failed',
      };
      expect(isCanceledError(error)).toBe(false);
    });
  });

  describe('getErrorType', () => {
    it('应该识别超时错误（ECONNABORTED）', () => {
      const error: RetryableError = {
        code: 'ECONNABORTED',
        message: 'Request timeout',
      };
      expect(getErrorType(error)).toBe('timeout');
    });

    it('应该识别超时错误（消息包含 timeout）', () => {
      const error: RetryableError = {
        message: 'Request timeout',
      };
      expect(getErrorType(error)).toBe('timeout');
    });

    it('应该识别网络错误（无状态码）', () => {
      const error: RetryableError = {
        message: 'Network error',
      };
      expect(getErrorType(error)).toBe('network');
    });

    it('应该识别服务器错误（5xx）', () => {
      const error: RetryableError = {
        message: 'Server error',
        status: 500,
      };
      expect(getErrorType(error)).toBe('server');
    });

    it('应该识别服务器错误（通过 response）', () => {
      const error: RetryableError = {
        message: 'Server error',
        response: {
          status: 503,
        },
      };
      expect(getErrorType(error)).toBe('server');
    });

    it('应该识别客户端错误（4xx）', () => {
      const error: RetryableError = {
        message: 'Client error',
        status: 404,
      };
      expect(getErrorType(error)).toBe('client');
    });

    it('应该返回 unknown 对于未知错误', () => {
      const error: RetryableError = {
        message: 'Unknown error',
        status: 200,
      };
      expect(getErrorType(error)).toBe('unknown');
    });
  });

  describe('isApplicableErrorType', () => {
    it('应该返回 true 对于 timeout', () => {
      expect(isApplicableErrorType('timeout')).toBe(true);
    });

    it('应该返回 true 对于 network', () => {
      expect(isApplicableErrorType('network')).toBe(true);
    });

    it('应该返回 true 对于 server', () => {
      expect(isApplicableErrorType('server')).toBe(true);
    });

    it('应该返回 false 对于 client', () => {
      expect(isApplicableErrorType('client')).toBe(false);
    });

    it('应该返回 false 对于 unknown', () => {
      expect(isApplicableErrorType('unknown')).toBe(false);
    });
  });
});

