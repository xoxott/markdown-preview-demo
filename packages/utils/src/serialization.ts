/**
 * 序列化工具函数
 * 提供统一的序列化/反序列化逻辑
 */

/**
 * 序列化缓存配置
 */
const MAX_SERIALIZE_CACHE_SIZE = 1000;

/**
 * 序列化结果缓存（使用 Map 缓存序列化结果，避免重复序列化）
 */
const serializeCache = new Map<string, string>();

/**
 * 简单的对象哈希函数（用于生成缓存键）
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
 * 安全地序列化值
 */
export function safeStringify(value: unknown, useCache = true): string {
  if (value === null || value === undefined) {
    return '';
  }

  // 如果启用缓存，先计算 hashKey 并尝试从缓存获取
  const hashKey = useCache ? getObjectHash(value) : undefined;
  if (hashKey) {
    const cached = serializeCache.get(hashKey);
    if (cached) return cached;
  }

  // 执行序列化
  let result: string;
  try {
    result = JSON.stringify(value);
  } catch {
    // 如果序列化失败（如循环引用），使用字符串表示
    return String(value);
  }

  // 如果启用缓存且缓存未满，缓存序列化结果
  if (hashKey && serializeCache.size < MAX_SERIALIZE_CACHE_SIZE) {
    serializeCache.set(hashKey, result);
  }

  return result;
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
  } catch {
    return defaultValue;
  }
}

/**
 * 生成请求键的通用函数
 */
export function generateKey(method: string, url: string, params?: unknown, data?: unknown): string {
  const methodUpper = method.toUpperCase();

  const paramsStr = safeStringify(params);
  const dataStr = data !== undefined ? safeStringify(data) : '';

  if (dataStr) {
    return `${methodUpper}_${url}_${paramsStr}_${dataStr}`;
  }

  return `${methodUpper}_${url}_${paramsStr}`;
}

