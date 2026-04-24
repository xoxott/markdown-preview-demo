/** logger 函数测试 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NormalizedRequestConfig } from '@suga/request-core';
import { logError, logRequest, logResponse } from '../logger';
import { LoggerManager } from '../managers/LoggerManager';
import type { LogOutput } from '../types';

describe('logger', () => {
  let manager: LoggerManager;
  let output: LogOutput;

  beforeEach(() => {
    output = vi.fn() as LogOutput;
    manager = new LoggerManager({
      enabled: true,
      output
    });
  });

  describe('logRequest', () => {
    it('应该在启用时记录请求日志', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET'
      };

      logRequest(config, manager, true);

      expect(output).toHaveBeenCalled();
      expect(output).toHaveBeenCalledWith('🚀 [GET] /api/users');
    });

    it('应该在禁用时跳过记录', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET'
      };

      logRequest(config, manager, false);

      expect(output).not.toHaveBeenCalled();
    });

    it('应该记录 URL 参数', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1, limit: 10 }
      };

      logRequest(config, manager, true);

      expect(output).toHaveBeenCalledWith('🚀 [GET] /api/users');
      expect(output).toHaveBeenCalledWith('📤 Params:', { page: 1, limit: 10 });
    });

    it('应该记录请求数据', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'John', age: 30 }
      };

      logRequest(config, manager, true);

      expect(output).toHaveBeenCalledWith('🚀 [POST] /api/users');
      expect(output).toHaveBeenCalledWith('📤 Data:', { name: 'John', age: 30 });
    });

    it('应该记录请求头', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      logRequest(config, manager, true);

      expect(output).toHaveBeenCalledWith('🚀 [GET] /api/users');
      expect(output).toHaveBeenCalledWith('📋 Headers:', { 'Content-Type': 'application/json' });
    });

    it('应该记录超时时间', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        timeout: 5000
      };

      logRequest(config, manager, true);

      expect(output).toHaveBeenCalledWith('🚀 [GET] /api/users');
      expect(output).toHaveBeenCalledWith('⏱️  Timeout:', 5000, 'ms');
    });

    it('应该在 method 为空时使用默认值 GET', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: ''
      };

      logRequest(config, manager, true);

      expect(output).toHaveBeenCalledWith('🚀 [GET] /api/users');
    });

    it('应该记录完整的请求信息', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
        params: { page: 1 },
        data: { name: 'John' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      };

      logRequest(config, manager, true);

      expect(output).toHaveBeenCalledWith('🚀 [POST] /api/users');
      expect(output).toHaveBeenCalledWith('📤 Params:', { page: 1 });
      expect(output).toHaveBeenCalledWith('📤 Data:', { name: 'John' });
      expect(output).toHaveBeenCalledWith('📋 Headers:', { 'Content-Type': 'application/json' });
      expect(output).toHaveBeenCalledWith('⏱️  Timeout:', 5000, 'ms');
    });
  });

  describe('logResponse', () => {
    it('应该在启用时记录响应日志', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET'
      };
      const result = { id: 1, name: 'John' };

      logResponse(config, result, 100, manager, true);

      expect(output).toHaveBeenCalledWith('✅ [GET] /api/users - Success');
      expect(output).toHaveBeenCalledWith('📥 Response:', result);
      expect(output).toHaveBeenCalledWith('⏱️  Duration:', '100ms');
    });

    it('应该在禁用时跳过记录', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET'
      };
      const result = { id: 1, name: 'John' };

      logResponse(config, result, 100, manager, false);

      expect(output).not.toHaveBeenCalled();
    });

    it('应该记录响应时间和结果', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST'
      };
      const result = { success: true };

      logResponse(config, result, 250, manager, true);

      expect(output).toHaveBeenCalledWith('✅ [POST] /api/users - Success');
      expect(output).toHaveBeenCalledWith('📥 Response:', { success: true });
      expect(output).toHaveBeenCalledWith('⏱️  Duration:', '250ms');
    });

    it('应该在 method 为空时使用默认值 GET', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: ''
      };
      const result = { data: [] };

      logResponse(config, result, 100, manager, true);

      expect(output).toHaveBeenCalledWith('✅ [GET] /api/users - Success');
    });
  });

  describe('logError', () => {
    it('应该在启用时记录错误日志', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET'
      };
      const error = new Error('Request failed');

      logError(config, error, 100, manager, true);

      expect(output).toHaveBeenCalledWith('❌ [GET] /api/users - Error');
      expect(output).toHaveBeenCalledWith('📥 Error:', error);
      expect(output).toHaveBeenCalledWith('⏱️  Duration:', '100ms');
    });

    it('应该在禁用时跳过记录', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET'
      };
      const error = new Error('Request failed');

      logError(config, error, 100, manager, false);

      expect(output).not.toHaveBeenCalled();
    });

    it('应该记录错误信息和响应时间', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST'
      };
      const error = { code: 'NETWORK_ERROR', message: 'Network timeout' };

      logError(config, error, 5000, manager, true);

      expect(output).toHaveBeenCalledWith('❌ [POST] /api/users - Error');
      expect(output).toHaveBeenCalledWith('📥 Error:', error);
      expect(output).toHaveBeenCalledWith('⏱️  Duration:', '5000ms');
    });

    it('应该在 method 为空时使用默认值 GET', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: ''
      };
      const error = new Error('Request failed');

      logError(config, error, 100, manager, true);

      expect(output).toHaveBeenCalledWith('❌ [GET] /api/users - Error');
    });
  });

  describe('综合场景', () => {
    it('应该使用 manager 的配置来决定是否记录', () => {
      const disabledManager = new LoggerManager({
        enabled: false,
        output
      });
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET'
      };

      logRequest(config, disabledManager);
      logResponse(config, {}, 100, disabledManager);
      logError(config, new Error('test'), 100, disabledManager);

      expect(output).not.toHaveBeenCalled();
    });

    it('应该使用 override 参数覆盖 manager 配置', () => {
      const disabledManager = new LoggerManager({
        enabled: false,
        output
      });
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET'
      };

      logRequest(config, disabledManager, true);
      logResponse(config, {}, 100, disabledManager, true);
      logError(config, new Error('test'), 100, disabledManager, true);

      expect(output).toHaveBeenCalled();
    });
  });
});
