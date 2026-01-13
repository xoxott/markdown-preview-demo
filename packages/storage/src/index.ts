/**
 * @suga/storage 存储适配器包
 * 提供统一的存储适配器接口和实现
 */

// 导出类型
export type { StorageAdapter } from './types';

// 导出适配器实现
export {
  LocalStorageAdapter,
  SessionStorageAdapter,
  MemoryStorageAdapter,
  defaultStorageAdapter,
} from './adapters';

