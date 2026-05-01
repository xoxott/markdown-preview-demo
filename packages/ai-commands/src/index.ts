/** @suga/ai-commands — 命令系统实现 公共 API */

// 类型导出
export type * from './types';

// 常量导出
export {
  MAX_COMMIT_DIFF_LINES,
  DEFAULT_COMMIT_LOG_COUNT,
  COMPACT_PROMPT_TITLE,
  MEMORY_SAVE_TITLE,
  CONFIG_TITLE,
  DOCTOR_TITLE,
  STATUS_TITLE,
  DIFF_TITLE,
  MCP_TITLE,
  INIT_TITLE,
  PROVIDER_MISSING_TEMPLATE
} from './constants';

// 上下文扩展
export { ProviderMissingError, requireProvider } from './context-merge';
export type { ExtendedSkillExecutionContext } from './context-merge';

// 工具导出
export {
  parseCommandArgs,
  memoryPositionalParser,
  configPositionalParser,
  mcpPositionalParser
} from './utils/args-parser';
export type { PositionalParser } from './utils/args-parser';
export type { ProvidersMap } from './types/catalog';
export {
  formatGitStatus,
  formatGitLog,
  formatConfigSections,
  formatConfigValue,
  formatDiagnosticReport,
  formatMcpServers,
  formatSessionStatus,
  formatMemoryEntries,
  formatRefreshResult
} from './utils/format-helpers';

// Tier 1 命令导出
export { commitSkill, buildCommitPrompt } from './commands/tier1/commit';
export { compactSkill, buildCompactPrompt } from './commands/tier1/compact';
export {
  memorySkill,
  buildMemorySavePrompt,
  buildMemoryRecallPrompt,
  buildMemoryForgetPrompt,
  buildMemoryRefreshPrompt
} from './commands/tier1/memory';
export {
  configSkill,
  buildConfigListPrompt,
  buildConfigGetPrompt,
  buildConfigSetPrompt,
  buildConfigResetPrompt
} from './commands/tier1/config';
export { doctorSkill, buildDoctorPrompt } from './commands/tier1/doctor';

// Tier 2 命令导出
export { addDirSkill, buildAddDirPrompt } from './commands/tier2/add-dir';
export { initSkill, buildInitPrompt } from './commands/tier2/init';
export { statusSkill, buildStatusPrompt } from './commands/tier2/status';
export { diffSkill, buildDiffPrompt } from './commands/tier2/diff';
export {
  mcpSkill,
  buildMcpListPrompt,
  buildMcpAddPrompt,
  buildMcpRemovePrompt,
  buildMcpRestartPrompt
} from './commands/tier2/mcp';

// Catalog 导出
export {
  COMMAND_CATALOG,
  TIER1_COMMANDS,
  TIER2_COMMANDS,
  ALL_COMMANDS,
  registerTierCommands,
  registerAllCommands,
  getCatalogByTier,
  getCatalogByCategory
} from './catalog';
