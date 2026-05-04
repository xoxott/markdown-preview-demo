/** Fork 类型定义 — ForkSpawnerOptions */

import type { OutputFileOptions } from './output';

/** ForkSpawner 配置选项 */
export interface ForkSpawnerOptions {
  /** 输出文件配置（大输出持久化，可选） */
  readonly outputOptions?: OutputFileOptions;
  /** 是否检测 cache break（默认 true） */
  readonly enableCacheBreakDetection?: boolean;
  /** 最大 fork 嵌套深度（默认 DEFAULT_MAX_FORK_DEPTH = 2） */
  readonly maxForkDepth?: number;
}
