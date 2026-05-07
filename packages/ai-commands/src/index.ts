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
  PROVIDER_MISSING_TEMPLATE,
  HELP_TITLE,
  CLEAR_TITLE,
  COST_TITLE,
  FAST_TITLE,
  MODEL_TITLE,
  PERMISSIONS_TITLE,
  VIM_TITLE,
  TERMINAL_SETUP_TITLE,
  SESSION_TITLE,
  RESUME_TITLE,
  LOGIN_TITLE,
  LOGOUT_TITLE,
  PLAN_TITLE,
  THEME_TITLE,
  IDE_TITLE,
  SKILLS_TITLE,
  HOOKS_TITLE,
  TASKS_TITLE,
  EXPORT_TITLE,
  USAGE_TITLE,
  STATS_TITLE
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

// Tier 3 命令导出
export { helpSkill, buildHelpPrompt } from './commands/tier3/help';
export { clearSkill, buildClearPrompt } from './commands/tier3/clear';
export { costSkill, buildCostPrompt } from './commands/tier3/cost';
export { fastSkill, buildFastPrompt } from './commands/tier3/fast';
export { modelSkill, buildModelListPrompt, buildModelSwitchPrompt } from './commands/tier3/model';
export {
  permissionsSkill,
  buildPermissionsListPrompt,
  buildPermissionsGrantPrompt,
  buildPermissionsRevokePrompt
} from './commands/tier3/permissions';
export { vimSkill, buildVimPrompt } from './commands/tier3/vim';
export { terminalSetupSkill, buildTerminalSetupPrompt } from './commands/tier3/terminal-setup';
export {
  sessionSkill,
  buildSessionListPrompt,
  buildSessionMutatePrompt
} from './commands/tier3/session';
export { resumeSkill, buildResumePrompt } from './commands/tier3/resume';
export { loginSkill, buildLoginPrompt } from './commands/tier3/login';
export { logoutSkill, buildLogoutPrompt } from './commands/tier3/logout';
export { planSkill, buildPlanPrompt } from './commands/tier3/plan';
export { themeSkill, buildThemePrompt } from './commands/tier3/theme';
export { ideSkill, buildIdePrompt } from './commands/tier3/ide';
export { skillsSkill, buildSkillsPrompt } from './commands/tier3/skills';
export { hooksSkill, buildHooksPrompt } from './commands/tier3/hooks';
export { tasksSkill, buildTasksPrompt } from './commands/tier3/tasks';
export { exportSkill, buildExportPrompt } from './commands/tier3/export';
export { usageSkill, buildUsagePrompt } from './commands/tier3/usage';
export { statsSkill, buildStatsPrompt } from './commands/tier3/stats';

// Catalog 导出
export {
  COMMAND_CATALOG,
  TIER1_COMMANDS,
  TIER2_COMMANDS,
  TIER3_COMMANDS,
  ALL_COMMANDS,
  registerTierCommands,
  registerAllCommands,
  getCatalogByTier,
  getCatalogByCategory
} from './catalog';
