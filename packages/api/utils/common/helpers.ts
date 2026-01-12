/**
 * 通用工具函数
 */

import type { InternalAxiosRequestConfig } from 'axios';

/**
 * 全局导入元数据接口（用于类型安全访问）
 */
interface GlobalImportMeta {
  env?: {
    DEV?: boolean;
  };
}

/**
 * 扩展的 globalThis 接口
 */
interface ExtendedGlobalThis {
  import?: {
    meta?: GlobalImportMeta;
  };
}

/**
 * 检查是否为开发环境
 */
export function isDevelopment(): boolean {
  // 在测试环境中，优先使用 globalThis.import.meta.env.DEV
  // 这允许测试通过 globalThis.import.meta.env.DEV 来控制行为
  if (typeof globalThis !== 'undefined') {
    // 类型转换原因：globalThis 类型定义中没有 import.meta 属性，但运行时可能存在（测试环境）
    const extendedGlobalThis = globalThis as unknown as ExtendedGlobalThis;
    const globalImport = extendedGlobalThis.import;
    if (globalImport?.meta?.env?.DEV !== undefined) {
      return globalImport.meta.env.DEV === true;
    }
  }

  // 在生产环境中，使用 import.meta.env.DEV
  if (typeof import.meta !== 'undefined') {
    // 类型转换原因：import.meta 的类型定义可能不完整，需要断言为包含 env 属性的对象
    const meta = import.meta as unknown as { env?: { DEV?: boolean } };
    if (meta?.env?.DEV !== undefined) {
      return meta.env.DEV === true;
    }
  }

  return false;
}

/**
 * 获取 HTTP 方法（大写）
 */
export function getHttpMethod(config?: InternalAxiosRequestConfig): string {
  return config?.method?.toUpperCase() || 'GET';
}
