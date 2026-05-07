/** @suga/ai-memory — 全局记忆系统 公共 API */

// 类型导出
export type * from './types';

// 核心实现 — 记忆类型
export {
  parseMemoryType,
  isValidMemoryType,
  buildTypesSection as buildMemoryTypesSection,
  buildTypesSectionCombined,
  buildWhatNotToSaveSection,
  buildWhenToAccessSection,
  buildTrustingRecallSection,
  buildScopeTag,
  getMemoryTypeDef
} from './core/memory-type';

// 核心实现 — 记忆条目
export {
  parseFrontmatter,
  serializeFrontmatter,
  serializeEntry,
  parseMemoryEntry,
  validateHeader
} from './core/memory-entry';

// 核心实现 — 记忆索引
export {
  truncateEntrypointContent,
  parseIndexEntries,
  serializeIndexEntries,
  addIndexEntry,
  removeIndexEntry,
  updateIndexEntry,
  readEntrypoint,
  writeEntrypoint,
  loadAndTruncateEntrypoint
} from './core/memory-index';

// 核心实现 — 记忆路径
export {
  computeMemoryPaths,
  sanitizeGitRoot,
  validateMemoryPath,
  validateMemoryPathDetailed,
  sanitizePathKey,
  buildTeamMemFilePath,
  isPathTraversal,
  PathTraversalError
} from './core/memory-paths';

// 核心实现 — 记忆扫描
export {
  scanMemoryFiles,
  formatMemoryManifest,
  MAX_SCAN_FILES,
  FRONTMATTER_SCAN_LINES
} from './core/memory-scan';

// 核心实现 — 记忆年龄
export {
  memoryAgeDays,
  memoryAge,
  memoryFreshnessText,
  memoryFreshnessNote,
  memoryAgeInfo
} from './core/memory-age';

// 核心实现 — 记忆相关性
export {
  extractKeywords,
  computeRelevanceScore,
  rankMemories,
  DEFAULT_STOP_WORDS
} from './core/memory-relevance';

// 核心实现 — 记忆提示
export {
  buildMemoryLines,
  buildCombinedMemoryPrompt,
  buildMemoryPrompt
} from './core/memory-prompt';

// 核心实现 — 记忆保存验证
export {
  shouldSave,
  containsExcludedPattern,
  normalizeMemoryContent,
  extractBodySections,
  ensureBodySections
} from './core/memory-save';

// 存储提供者
export { MockMemoryStorageProvider } from './core/memory-storage';
export { NodeFileMemoryStorageProvider } from './core/NodeFileMemoryStorageProvider';

// G40: 记忆搜索指导
export {
  buildSearchingPastContextSection,
  detectMemorySearchTrigger
} from './core/memory-search-guide';

// G39: Memory daily-log 模式
export {
  buildDailyLogEntry,
  serializeDailyLog,
  parseDailyLog,
  formatDailyLogForPrompt,
  getDailyLogFilename,
  isDailyLogFile,
  DEFAULT_DAILY_LOG_CONFIG
} from './core/memory-daily-log';
export type { DailyLogEntry, DailyLogConfig } from './core/memory-daily-log';

// N25: SessionMemory 服务
export {
  createInitialSessionMemoryState,
  addSessionNote,
  removeSessionNote,
  formatSessionNotesForPrompt,
  buildSessionMemoryAutoSavePrompt,
  DEFAULT_SESSION_MEMORY_CONFIG
} from './core/session-memory';
export type { SessionMemoryConfig, SessionNote, SessionMemoryState } from './core/session-memory';
