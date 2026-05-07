/** @suga/ai-skill — Skill/Command 框架公共 API */

// ——— 类型导出 ———
export type * from './types';

// ——— 常量导出 ———
export { DEFAULT_SKILL_TIMEOUT, SKILL_TOOL_NAME, SKILL_NAME_PATTERN } from './constants';

// ——— 注册表导出 ———
export { SkillRegistry } from './registry/SkillRegistry';

// ——— 执行器导出 ———
export { SkillExecutor } from './executor/SkillExecutor';

// ——— SkillTool 导出 ———
export { createSkillTool } from './tool/SkillTool';
export type { SkillToolResult } from './tool/SkillTool';

// N29: Skill Search 服务
export {
  searchSkillsLocal,
  computeRelevance,
  DEFAULT_SKILL_SEARCH_CONFIG
} from './core/skill-search';
export type {
  SkillSearchConfig,
  SkillSearchResult,
  RemoteSkillLoaderFn
} from './core/skill-search';

// G56: 内置 Skill + MCP skill 抓取
export {
  BundledSkillRegistry,
  getGlobalBundledSkillRegistry,
  resetGlobalBundledSkillRegistry,
  registerBundledSkill,
  registerSimplifySkill,
  registerVerifySkill,
  registerRememberSkill,
  registerLoremIpsumSkill,
  generateLoremIpsum,
  initBundledSkills,
  registerMCPSkillBuilders,
  getMCPSkillBuilders,
  resetMCPSkillBuilders,
  isMcpSkillPromptName,
  stripMcpSkillPrefix,
  fetchMcpSkillsForServer,
  McpSkillsFetcher
} from './bundled';
export type {
  BundledSkillDefinition,
  BundledSkillContext,
  BundledSkillContentBlock,
  MCPSkillBuilders,
  SkillCommand as McpSkillCommand,
  SkillFrontmatterFields,
  McpPromptInfo,
  McpPromptArgument,
  McpPromptsProvider,
  FetchMcpSkillsOptions
} from './bundled';
