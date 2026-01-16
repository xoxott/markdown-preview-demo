/**
 * key-generator 测试
 */

import { describe, it, expect } from 'vitest';
import { generateRequestKey } from '../../utils/key-generator';
import type { NormalizedRequestConfig } from '../../context/RequestContext';

describe('generateRequestKey', () => {
  it('应该为相同的请求生成相同的键', () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const key1 = generateRequestKey(config);
    const key2 = generateRequestKey(config);

    expect(key1).toBe(key2);
  });

  it('应该为不同的 URL 生成不同的键', () => {
    const config1: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const config2: NormalizedRequestConfig = {
      url: '/api/posts',
      method: 'GET',
    };

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    expect(key1).not.toBe(key2);
  });

  it('应该为不同的 method 生成不同的键', () => {
    const config1: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const config2: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'POST',
    };

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    expect(key1).not.toBe(key2);
  });

  it('应该考虑 params 生成键', () => {
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

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    expect(key1).not.toBe(key2);
  });

  it('应该为相同的 params 生成相同的键', () => {
    const config1: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
      params: { page: 1, limit: 10 },
    };

    const config2: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
      params: { page: 1, limit: 10 },
    };

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    expect(key1).toBe(key2);
  });

  it('应该考虑 data 生成键', () => {
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

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    expect(key1).not.toBe(key2);
  });

  it('应该为相同的 data 生成相同的键', () => {
    const config1: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'POST',
      data: { name: 'John', age: 30 },
    };

    const config2: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'POST',
      data: { name: 'John', age: 30 },
    };

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    expect(key1).toBe(key2);
  });

  it('应该忽略其他字段（如 headers）', () => {
    const config1: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
      headers: { 'Authorization': 'Bearer token1' },
    };

    const config2: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
      headers: { 'Authorization': 'Bearer token2' },
    };

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    // headers 不应该影响键的生成
    expect(key1).toBe(key2);
  });

  it('应该处理没有 params 和 data 的请求', () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const key = generateRequestKey(config);

    expect(key).toBeDefined();
    expect(typeof key).toBe('string');
  });

  it('应该处理复杂的嵌套对象', () => {
    const config1: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'POST',
      data: {
        user: {
          name: 'John',
          address: {
            city: 'New York',
            country: 'USA',
          },
        },
      },
    };

    const config2: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'POST',
      data: {
        user: {
          name: 'John',
          address: {
            city: 'New York',
            country: 'USA',
          },
        },
      },
    };

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    expect(key1).toBe(key2);
  });

  it('应该处理数组 params', () => {
    const config1: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
      params: { ids: [1, 2, 3] },
    };

    const config2: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
      params: { ids: [1, 2, 3] },
    };

    const key1 = generateRequestKey(config1);
    const key2 = generateRequestKey(config2);

    expect(key1).toBe(key2);
  });

  it('应该处理空字符串 URL', () => {
    const config: NormalizedRequestConfig = {
      url: '',
      method: 'GET',
    };

    const key = generateRequestKey(config);

    expect(key).toBeDefined();
  });

  it('应该处理默认 method', () => {
    const config: NormalizedRequestConfig = {
      url: '/api/users',
      method: 'GET',
    };

    const key = generateRequestKey(config);

    expect(key).toBeDefined();
  });
});

