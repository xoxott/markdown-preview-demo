/**
 * @suga/request-dedupe
 * Request deduplication for @suga/request-core
 */

// 导出去重步骤
export { DedupeStep } from './steps/DedupeStep';
export type { DedupeStepOptions } from './steps/DedupeStep';

// 导出去重管理器
export { DedupeManager } from './managers/DedupeManager';

// 导出类型
export type * from './types';

// 导出常量
export { DEFAULT_DEDUPE_CONFIG } from './constants';

