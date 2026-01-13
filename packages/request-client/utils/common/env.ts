/**
 * 环境检测工具
 */

/**
 * 环境适配器接口
 */
export interface EnvironmentAdapter {
  isBrowser: boolean;
  isNode: boolean;
  isSSR: boolean;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * 默认环境适配器
 */
export const environmentAdapter: EnvironmentAdapter = {
  isBrowser: typeof window !== 'undefined' && typeof document !== 'undefined',
  isNode: typeof process !== 'undefined' && process.versions?.node !== undefined,
  isSSR: typeof window === 'undefined' && typeof process !== 'undefined',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

/**
 * 是否在浏览器环境
 */
export const isBrowser = environmentAdapter.isBrowser;

/**
 * 是否在 Node 环境
 */
export const isNode = environmentAdapter.isNode;

/**
 * 是否在 SSR 环境
 */
export const isSSR = environmentAdapter.isSSR;

/**
 * 是否在开发环境
 */
export const isDevelopment = environmentAdapter.isDevelopment;

/**
 * 是否在生产环境
 */
export const isProduction = environmentAdapter.isProduction;

