/** 内置 Skill 集合 - barrel 导出 */

import { registerSimplifySkill } from './simplify';
import { registerVerifySkill } from './verify';
import { registerRememberSkill } from './remember';
import { registerLoremIpsumSkill } from './lorem-ipsum';

export {
  BundledSkillRegistry,
  getGlobalBundledSkillRegistry,
  resetGlobalBundledSkillRegistry,
  registerBundledSkill
} from './BundledSkill';
export type {
  BundledSkillDefinition,
  BundledSkillContext,
  BundledSkillContentBlock
} from './BundledSkill';

// 内置 skill 注册函数
export { registerSimplifySkill } from './simplify';
export { registerVerifySkill } from './verify';
export { registerRememberSkill } from './remember';
export { registerLoremIpsumSkill, generateLoremIpsum } from './lorem-ipsum';

// MCP Skill 构造器
export {
  registerMCPSkillBuilders,
  getMCPSkillBuilders,
  resetMCPSkillBuilders
} from './mcpSkillBuilders';
export type { MCPSkillBuilders, SkillCommand, SkillFrontmatterFields } from './mcpSkillBuilders';

// MCP Skill 抓取
export {
  isMcpSkillPromptName,
  stripMcpSkillPrefix,
  fetchMcpSkillsForServer,
  McpSkillsFetcher
} from './mcpSkills';
export type {
  McpPromptInfo,
  McpPromptArgument,
  McpPromptsProvider,
  FetchMcpSkillsOptions
} from './mcpSkills';

/**
 * 初始化所有内置 skill — 启动时调用一次
 *
 * 对齐 CC src/skills/bundled/index.ts initBundledSkills()
 */
export function initBundledSkills(): void {
  registerSimplifySkill();
  registerVerifySkill();
  registerRememberSkill();
  registerLoremIpsumSkill();
}
