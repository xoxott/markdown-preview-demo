/** createQueryEngine — QueryEngine 工厂函数 */

import type { RuntimeConfig } from '../types/config';
import { QueryEngine } from './QueryEngine';

/**
 * 创建 QueryEngine 实例
 *
 * @param config RuntimeConfig（包含 provider、toolRegistry、compressConfig 等）
 * @returns QueryEngine 实例，可用于 SDK setQueryEngine 注入
 */
export function createQueryEngine(config: RuntimeConfig): QueryEngine {
  return new QueryEngine(config);
}
