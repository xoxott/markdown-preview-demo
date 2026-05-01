/** @suga/ai-memory — 类型 barrel 导出 */

export type { MemoryType, MemoryTypeDef } from './memory-type';
export { MEMORY_TYPES, MEMORY_TYPE_VALUES } from './memory-type';

export type { MemoryHeader, MemoryEntry, FrontmatterParseResult } from './memory-entry';

export type { MemoryIndexEntry, TruncateResult } from './memory-index';
export {
  MAX_ENTRYPOINT_LINES,
  MAX_ENTRYPOINT_BYTES,
  MEMORY_MD_FILENAME,
  INDEX_ENTRY_PATTERN
} from './memory-index';

export type { MemoryPathConfig, MemoryPaths } from './memory-path';

export type { MemoryAgeInfo } from './memory-age';
export {
  FRESH_THRESHOLD_DAYS,
  STALE_THRESHOLD_DAYS,
  VERY_STALE_THRESHOLD_DAYS
} from './memory-age';

export type { MemoryRelevanceConfig, ScoredEntry, RelevanceResult } from './memory-relevance';
export { DEFAULT_RELEVANCE_CONFIG } from './memory-relevance';

export type { MemoryPromptConfig, MemoryPromptResult } from './memory-prompt';

export type { SaveDecision, SaveExclusion, SaveValidationResult } from './memory-save';
export { WHAT_NOT_TO_SAVE_PATTERNS } from './memory-save';

export type { MemoryStorageProvider } from './memory-storage';
