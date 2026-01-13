/**
 * 存储适配器模块统一导出
 */

// 导出类型和接口
export type { StorageAdapter } from './types';

// 导出实现
export {
  MemoryStorageAdapter,
  LocalStorageAdapter,
  defaultStorageAdapter,
} from './implementations';

