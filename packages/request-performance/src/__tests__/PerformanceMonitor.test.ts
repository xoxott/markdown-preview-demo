/**
 * PerformanceMonitorManager 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PerformanceMonitorManager } from '../PerformanceMonitor';
import type { NormalizedRequestConfig } from '@suga/request-core';

describe('PerformanceMonitorManager', () => {
  let monitor: PerformanceMonitorManager;

  beforeEach(() => {
    monitor = new PerformanceMonitorManager();
  });

  describe('onRequestStart', () => {
    it('应该增加总请求数', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
    });

    it('应该多次调用时累计增加', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestStart(config);
      monitor.onRequestStart(config);

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(3);
    });
  });

  describe('onRequestSuccess', () => {
    it('应该增加成功请求数和响应时间', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);

      const metrics = monitor.getMetrics();
      expect(metrics.successRequests).toBe(1);
      expect(metrics.averageResponseTime).toBe(100);
    });

    it('应该更新 URL 统计信息', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);

      const metrics = monitor.getMetrics();
      expect(metrics.urlStats['/api/users']).toBeDefined();
      expect(metrics.urlStats['/api/users'].count).toBe(1);
      expect(metrics.urlStats['/api/users'].successCount).toBe(1);
      expect(metrics.urlStats['/api/users'].averageTime).toBe(100);
    });

    it('应该支持多个 URL 的统计', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const config2: NormalizedRequestConfig = {
        url: '/api/posts',
        method: 'GET',
      };

      monitor.onRequestStart(config1);
      monitor.onRequestSuccess(config1, 100);
      monitor.onRequestStart(config2);
      monitor.onRequestSuccess(config2, 200);

      const metrics = monitor.getMetrics();
      expect(metrics.urlStats['/api/users']).toBeDefined();
      expect(metrics.urlStats['/api/posts']).toBeDefined();
      expect(metrics.urlStats['/api/users'].count).toBe(1);
      expect(metrics.urlStats['/api/posts'].count).toBe(1);
    });

    it('应该计算平均响应时间', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 200);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 300);

      const metrics = monitor.getMetrics();
      expect(metrics.urlStats['/api/users'].averageTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it('应该处理没有 URL 的情况', () => {
      const config: NormalizedRequestConfig = {
        url: '',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);

      const metrics = monitor.getMetrics();
      expect(metrics.urlStats['']).toBeDefined();
      expect(metrics.urlStats[''].count).toBe(1);
    });
  });

  describe('onRequestError', () => {
    it('应该增加失败请求数和响应时间', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const error = new Error('Request failed');

      monitor.onRequestStart(config);
      monitor.onRequestError(config, error, 100);

      const metrics = monitor.getMetrics();
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.averageResponseTime).toBe(100);
    });

    it('应该更新 URL 统计信息（失败请求）', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const error = new Error('Request failed');

      monitor.onRequestStart(config);
      monitor.onRequestError(config, error, 100);

      const metrics = monitor.getMetrics();
      expect(metrics.urlStats['/api/users']).toBeDefined();
      expect(metrics.urlStats['/api/users'].count).toBe(1);
      expect(metrics.urlStats['/api/users'].successCount).toBe(0);
      expect(metrics.urlStats['/api/users'].averageTime).toBe(100);
    });

    it('应该同时跟踪成功和失败请求', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const error = new Error('Request failed');

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);
      monitor.onRequestStart(config);
      monitor.onRequestError(config, error, 200);

      const metrics = monitor.getMetrics();
      expect(metrics.urlStats['/api/users'].count).toBe(2);
      expect(metrics.urlStats['/api/users'].successCount).toBe(1);
      expect(metrics.urlStats['/api/users'].averageTime).toBe(150); // (100 + 200) / 2
    });
  });

  describe('getMetrics', () => {
    it('应该在无请求时返回默认值', () => {
      const metrics = monitor.getMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBe(0);
      expect(metrics.minResponseTime).toBe(0);
      expect(metrics.maxResponseTime).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(Object.keys(metrics.urlStats).length).toBe(0);
    });

    it('应该计算平均响应时间', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 200);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 300);

      const metrics = monitor.getMetrics();
      expect(metrics.averageResponseTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it('应该计算最小和最大响应时间', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 300);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 200);

      const metrics = monitor.getMetrics();
      expect(metrics.minResponseTime).toBe(100);
      expect(metrics.maxResponseTime).toBe(300);
    });

    it('应该计算成功率', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const error = new Error('Request failed');

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 200);
      monitor.onRequestStart(config);
      monitor.onRequestError(config, error, 300);

      const metrics = monitor.getMetrics();
      expect(metrics.successRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    });

    it('应该计算 100% 成功率', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 200);

      const metrics = monitor.getMetrics();
      expect(metrics.successRate).toBe(100);
    });

    it('应该计算 0% 成功率', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const error = new Error('Request failed');

      monitor.onRequestStart(config);
      monitor.onRequestError(config, error, 100);
      monitor.onRequestStart(config);
      monitor.onRequestError(config, error, 200);

      const metrics = monitor.getMetrics();
      expect(metrics.successRate).toBe(0);
    });

    it('应该返回所有 URL 的统计信息', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const config2: NormalizedRequestConfig = {
        url: '/api/posts',
        method: 'GET',
      };

      monitor.onRequestStart(config1);
      monitor.onRequestSuccess(config1, 100);
      monitor.onRequestStart(config2);
      monitor.onRequestSuccess(config2, 200);

      const metrics = monitor.getMetrics();
      expect(metrics.urlStats['/api/users']).toBeDefined();
      expect(metrics.urlStats['/api/posts']).toBeDefined();
      expect(Object.keys(metrics.urlStats).length).toBe(2);
    });

    it('应该正确统计成功和失败请求', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const error = new Error('Request failed');

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 200);
      monitor.onRequestStart(config);
      monitor.onRequestError(config, error, 300);

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
    });
  });

  describe('reset', () => {
    it('应该重置所有指标', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);

      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.successRequests).toBe(0);
      expect(metrics.failedRequests).toBe(0);
      expect(Object.keys(metrics.urlStats).length).toBe(0);
    });

    it('应该在重置后可以重新开始统计', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);

      monitor.reset();

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 200);

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successRequests).toBe(1);
      expect(metrics.urlStats['/api/users'].count).toBe(1);
      expect(metrics.urlStats['/api/users'].averageTime).toBe(200);
    });
  });

  describe('综合场景', () => {
    it('应该正确跟踪完整的请求生命周期', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };

      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successRequests).toBe(1);
      expect(metrics.failedRequests).toBe(0);
      expect(metrics.averageResponseTime).toBe(100);
      expect(metrics.successRate).toBe(100);
    });

    it('应该正确处理混合成功和失败的场景', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const error = new Error('Request failed');

      // 成功请求
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 100);
      monitor.onRequestStart(config);
      monitor.onRequestSuccess(config, 200);

      // 失败请求
      monitor.onRequestStart(config);
      monitor.onRequestError(config, error, 300);

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.averageResponseTime).toBe(200); // (100 + 200 + 300) / 3
      expect(metrics.minResponseTime).toBe(100);
      expect(metrics.maxResponseTime).toBe(300);
      expect(metrics.successRate).toBeCloseTo(66.67, 1);
      expect(metrics.urlStats['/api/users'].count).toBe(3);
      expect(metrics.urlStats['/api/users'].successCount).toBe(2);
      expect(metrics.urlStats['/api/users'].averageTime).toBe(200);
    });

    it('应该正确处理多个不同 URL 的场景', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
      };
      const config2: NormalizedRequestConfig = {
        url: '/api/posts',
        method: 'GET',
      };
      const error = new Error('Request failed');

      // 用户 API
      monitor.onRequestStart(config1);
      monitor.onRequestSuccess(config1, 100);
      monitor.onRequestStart(config1);
      monitor.onRequestSuccess(config1, 200);

      // 帖子 API
      monitor.onRequestStart(config2);
      monitor.onRequestError(config2, error, 300);

      const metrics = monitor.getMetrics();
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.urlStats['/api/users'].count).toBe(2);
      expect(metrics.urlStats['/api/users'].successCount).toBe(2);
      expect(metrics.urlStats['/api/posts'].count).toBe(1);
      expect(metrics.urlStats['/api/posts'].successCount).toBe(0);
    });
  });
});

