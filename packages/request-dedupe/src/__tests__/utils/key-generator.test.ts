/**
 * key-generator 测试
 */

import { describe, expect, it } from 'vitest';
import { generateRequestKey } from '../../utils/key-generator';
import type { NormalizedRequestConfig } from '@suga/request-core';

describe('generateRequestKey', () => {
  describe('exact 策略', () => {
    it('应该为相同的请求生成相同的键', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1 },
      };

      const key1 = generateRequestKey(config, {
        strategy: 'exact',
        ignoreParams: [],
      });
      const key2 = generateRequestKey(config, {
        strategy: 'exact',
        ignoreParams: [],
      });

      expect(key1).toBe(key2);
    });

    it('应该为不同的 params 生成不同的键', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1 },
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 2 },
      };

      const key1 = generateRequestKey(config1, {
        strategy: 'exact',
        ignoreParams: [],
      });
      const key2 = generateRequestKey(config2, {
        strategy: 'exact',
        ignoreParams: [],
      });

      expect(key1).not.toBe(key2);
    });

    it('应该为不同的 data 生成不同的键', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'John' },
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'Jane' },
      };

      const key1 = generateRequestKey(config1, {
        strategy: 'exact',
        ignoreParams: [],
      });
      const key2 = generateRequestKey(config2, {
        strategy: 'exact',
        ignoreParams: [],
      });

      expect(key1).not.toBe(key2);
    });
  });

  describe('ignore-params 策略', () => {
    it('应该在 ignoreParams 为空时忽略所有参数', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1, limit: 10 },
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 2, limit: 20 },
      };

      const key1 = generateRequestKey(config1, {
        strategy: 'ignore-params',
        ignoreParams: [],
      });
      const key2 = generateRequestKey(config2, {
        strategy: 'ignore-params',
        ignoreParams: [],
      });

      expect(key1).toBe(key2);
    });

    it('应该只忽略指定的参数', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1, timestamp: 123456 },
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1, timestamp: 789012 },
      };

      const key1 = generateRequestKey(config1, {
        strategy: 'ignore-params',
        ignoreParams: ['timestamp'],
      });
      const key2 = generateRequestKey(config2, {
        strategy: 'ignore-params',
        ignoreParams: ['timestamp'],
      });

      expect(key1).toBe(key2);
    });

    it('应该保留未忽略的参数', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1, timestamp: 123456 },
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 2, timestamp: 123456 },
      };

      const key1 = generateRequestKey(config1, {
        strategy: 'ignore-params',
        ignoreParams: ['timestamp'],
      });
      const key2 = generateRequestKey(config2, {
        strategy: 'ignore-params',
        ignoreParams: ['timestamp'],
      });

      expect(key1).not.toBe(key2);
    });

    it('应该忽略多个参数', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1, timestamp: 123456, nonce: 'abc' },
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1, timestamp: 789012, nonce: 'xyz' },
      };

      const key1 = generateRequestKey(config1, {
        strategy: 'ignore-params',
        ignoreParams: ['timestamp', 'nonce'],
      });
      const key2 = generateRequestKey(config2, {
        strategy: 'ignore-params',
        ignoreParams: ['timestamp', 'nonce'],
      });

      expect(key1).toBe(key2);
    });

    it('应该忽略 data 中的参数', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'John', timestamp: 123456 },
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'POST',
        data: { name: 'John', timestamp: 789012 },
      };

      const key1 = generateRequestKey(config1, {
        strategy: 'ignore-params',
        ignoreParams: ['timestamp'],
      });
      const key2 = generateRequestKey(config2, {
        strategy: 'ignore-params',
        ignoreParams: ['timestamp'],
      });

      expect(key1).toBe(key2);
    });
  });

  describe('custom 策略', () => {
    it('应该使用自定义键生成函数', () => {
      const config: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1 },
      };

      const customKeyGenerator = (cfg: NormalizedRequestConfig) => {
        return `${cfg.method}_${cfg.url}`;
      };

      const key = generateRequestKey(config, {
        strategy: 'custom',
        ignoreParams: [],
        customKeyGenerator,
      });

      expect(key).toBe('GET_/api/users');
    });

    it('应该忽略 params 和 data 当使用自定义函数', () => {
      const config1: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 1 },
      };

      const config2: NormalizedRequestConfig = {
        url: '/api/users',
        method: 'GET',
        params: { page: 2 },
      };

      const customKeyGenerator = (cfg: NormalizedRequestConfig) => {
        return `${cfg.method}_${cfg.url}`;
      };

      const key1 = generateRequestKey(config1, {
        strategy: 'custom',
        ignoreParams: [],
        customKeyGenerator,
      });
      const key2 = generateRequestKey(config2, {
        strategy: 'custom',
        ignoreParams: [],
        customKeyGenerator,
      });

      expect(key1).toBe(key2);
    });
  });
});

