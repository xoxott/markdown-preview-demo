/**
 * 序列化工具函数
 * 提供统一的序列化/反序列化逻辑，避免重复代码
 */

import { internalWarn } from './internalLogger';

/**
 * 序列化缓存配置
 */
const MAX_SERIALIZE_CACHE_SIZE = 1000; // 限制缓存大小，避免内存泄漏

/**
 * 序列化结果缓存（使用 Map 缓存序列化结果，避免重复序列化）
 */
const serializeCache = new Map<string, string>();

/**
 * 简单的对象哈希函数（用于生成缓存键）
 * 对于简单对象，使用 JSON.stringify 的哈希
 * 对于复杂对象，可以考虑使用更高效的哈希算法（如 murmurhash）
 */
function getObjectHash(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return '';
  }
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

/**
 * 清理序列化缓存（定期调用或手动调用）
 */
export function clearSerializeCache(): void {
  serializeCache.clear();
}

/**
 * 安全地序列化值（处理循环引用等异常情况）
 * 支持缓存序列化结果，避免重复序列化相同对象
 */
export function safeStringify(value: unknown, useCache = true): string {
  if (value === null || value === undefined) {
    return '';
  }

  // 尝试使用缓存
  if (useCache) {
    const hashKey = getObjectHash(value);
    if (hashKey && serializeCache.has(hashKey)) {
      return serializeCache.get(hashKey)!;
    }
  }

  try {
    const result = JSON.stringify(value);

    // 缓存序列化结果（限制缓存大小）
    if (useCache) {
      const hashKey = getObjectHash(value);
      if (hashKey && serializeCache.size < MAX_SERIALIZE_CACHE_SIZE) {
        serializeCache.set(hashKey, result);
      }
    }

    return result;
  } catch (error) {
    // 如果序列化失败（如循环引用），使用字符串表示
    internalWarn('序列化失败，使用字符串表示:', error);
    return String(value);
  }
}

/**
 * 安全地解析 JSON
 */
export function safeParseJSON<T>(json: string | null, defaultValue: T): T {
  if (!json) {
    return defaultValue;
  }

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    internalWarn('JSON 解析失败:', error);
    return defaultValue;
  }
}

/**
 * 生成缓存/请求键的通用函数
 * 优化：使用缓存避免重复序列化相同参数
 */
export function generateKey(method: string, url: string, params?: unknown, data?: unknown): string {
  const methodUpper = method.toUpperCase();

  // 使用缓存的序列化函数
  const paramsStr = safeStringify(params, true);
  const dataStr = data !== undefined ? safeStringify(data, true) : '';

  if (dataStr) {
    return `${methodUpper}_${url}_${paramsStr}_${dataStr}`;
  }

  return `${methodUpper}_${url}_${paramsStr}`;
}
