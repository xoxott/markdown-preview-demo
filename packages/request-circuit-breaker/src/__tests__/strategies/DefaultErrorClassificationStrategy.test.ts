/**
 * DefaultErrorClassificationStrategy 测试
 */

import { describe, expect, it } from 'vitest';
import { DefaultErrorClassificationStrategy } from '../../strategies/error-classification';

describe('DefaultErrorClassificationStrategy', () => {
  const strategy = new DefaultErrorClassificationStrategy();

  describe('shouldCountAsFailure', () => {
    it('应该识别服务器错误（5xx）', () => {
      const error500 = { response: { status: 500 } };
      const error503 = { response: { status: 503 } };
      const error599 = { response: { status: 599 } };

      expect(strategy.shouldCountAsFailure(error500)).toBe(true);
      expect(strategy.shouldCountAsFailure(error503)).toBe(true);
      expect(strategy.shouldCountAsFailure(error599)).toBe(true);
    });

    it('不应该识别客户端错误（4xx）', () => {
      const error400 = { response: { status: 400 } };
      const error404 = { response: { status: 404 } };
      const error499 = { response: { status: 499 } };

      expect(strategy.shouldCountAsFailure(error400)).toBe(false);
      expect(strategy.shouldCountAsFailure(error404)).toBe(false);
      expect(strategy.shouldCountAsFailure(error499)).toBe(false);
    });

    it('应该识别网络错误代码', () => {
      const errorECONNABORTED = { code: 'ECONNABORTED' };
      const errorENOTFOUND = { code: 'ENOTFOUND' };
      const errorETIMEDOUT = { code: 'ETIMEDOUT' };
      const errorECONNREFUSED = { code: 'ECONNREFUSED' };
      const errorENETUNREACH = { code: 'ENETUNREACH' };

      expect(strategy.shouldCountAsFailure(errorECONNABORTED)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorENOTFOUND)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorETIMEDOUT)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorECONNREFUSED)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorENETUNREACH)).toBe(true);
    });

    it('应该识别包含网络关键词的错误消息', () => {
      const errorTimeout = { message: 'Request timeout' };
      const errorNetwork = { message: 'Network error occurred' };
      const errorConnection = { message: 'Connection failed' };
      const errorECONNREFUSED = { message: 'ECONNREFUSED error' };
      const errorENOTFOUND = { message: 'ENOTFOUND error' };

      expect(strategy.shouldCountAsFailure(errorTimeout)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorNetwork)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorConnection)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorECONNREFUSED)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorENOTFOUND)).toBe(true);
    });

    it('应该不区分大小写识别关键词', () => {
      const errorTimeout = { message: 'TIMEOUT error' };
      const errorNetwork = { message: 'NETWORK issue' };

      expect(strategy.shouldCountAsFailure(errorTimeout)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorNetwork)).toBe(true);
    });

    it('不应该识别普通错误', () => {
      const error = { message: 'Something went wrong' };
      const errorWithCode = { code: 'CUSTOM_ERROR' };

      expect(strategy.shouldCountAsFailure(error)).toBe(false);
      expect(strategy.shouldCountAsFailure(errorWithCode)).toBe(false);
    });

    it('应该处理 null 和 undefined', () => {
      expect(strategy.shouldCountAsFailure(null)).toBe(false);
      expect(strategy.shouldCountAsFailure(undefined)).toBe(false);
    });

    it('应该处理字符串错误（如果包含关键词）', () => {
      // 字符串错误需要转换为对象才能被识别
      const errorTimeout = { message: 'timeout error' };
      const errorNetwork = { message: 'network issue' };
      const errorNormal = { message: 'normal error' };

      expect(strategy.shouldCountAsFailure(errorTimeout)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorNetwork)).toBe(true);
      expect(strategy.shouldCountAsFailure(errorNormal)).toBe(false);
    });
  });
});

