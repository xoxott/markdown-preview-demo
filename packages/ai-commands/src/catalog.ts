/** 命令 catalog — 注册 + 发现 + tier 管理 */

import type { SkillDefinition, SkillRegistry } from '@suga/ai-skill';
import type { CommandCatalogEntry, CommandTier } from './types/catalog';
import { commitSkill } from './commands/tier1/commit';
import { compactSkill } from './commands/tier1/compact';
import { memorySkill } from './commands/tier1/memory';
import { configSkill } from './commands/tier1/config';
import { doctorSkill } from './commands/tier1/doctor';
import { addDirSkill } from './commands/tier2/add-dir';
import { initSkill } from './commands/tier2/init';
import { statusSkill } from './commands/tier2/status';
import { diffSkill } from './commands/tier2/diff';
import { mcpSkill } from './commands/tier2/mcp';

/** 命令 catalog 数据 */
export const COMMAND_CATALOG: readonly CommandCatalogEntry[] = [
  // Tier 1
  { name: 'commit', tier: 'tier1', category: 'git', requiredProviders: ['gitProvider'] },
  { name: 'compact', tier: 'tier1', category: 'context', requiredProviders: [] },
  { name: 'memory', tier: 'tier1', category: 'memory', requiredProviders: ['memoryProvider'] },
  { name: 'config', tier: 'tier1', category: 'config', requiredProviders: ['configProvider'] },
  {
    name: 'doctor',
    tier: 'tier1',
    category: 'diagnostics',
    requiredProviders: ['diagnosticProvider']
  },
  // Tier 2
  { name: 'add-dir', tier: 'tier2', category: 'general', requiredProviders: ['fsProvider'] },
  { name: 'init', tier: 'tier2', category: 'general', requiredProviders: ['fsProvider'] },
  {
    name: 'status',
    tier: 'tier2',
    category: 'session',
    requiredProviders: ['sessionInfoProvider']
  },
  { name: 'diff', tier: 'tier2', category: 'git', requiredProviders: ['gitProvider'] },
  { name: 'mcp', tier: 'tier2', category: 'mcp', requiredProviders: ['mcpProvider'] }
];

/** 所有 Tier 1 命令 SkillDefinition */
export const TIER1_COMMANDS: readonly SkillDefinition[] = [
  commitSkill,
  compactSkill,
  memorySkill,
  configSkill,
  doctorSkill
];

/** 所有 Tier 2 命令 SkillDefinition */
export const TIER2_COMMANDS: readonly SkillDefinition[] = [
  addDirSkill,
  initSkill,
  statusSkill,
  diffSkill,
  mcpSkill
];

/** 所有命令 SkillDefinition */
export const ALL_COMMANDS: readonly SkillDefinition[] = [...TIER1_COMMANDS, ...TIER2_COMMANDS];

/** 按名称查找 SkillDefinition */
function findCommand(name: string): SkillDefinition | undefined {
  return ALL_COMMANDS.find(c => c.name === name || c.aliases?.includes(name));
}

/**
 * 注册指定 tier 的所有命令到 SkillRegistry
 *
 * 只注册 catalog 中列出的该 tier 命令
 */
export function registerTierCommands(registry: SkillRegistry, tier: CommandTier): void {
  const tierEntries = COMMAND_CATALOG.filter(e => e.tier === tier);
  for (const entry of tierEntries) {
    const command = findCommand(entry.name);
    if (command) {
      registry.register(command);
    }
  }
}

/**
 * 注册所有可用命令到 SkillRegistry
 *
 * 注册所有已实现的命令（Tier 1 + Tier 2）
 */
export function registerAllCommands(registry: SkillRegistry): void {
  for (const command of ALL_COMMANDS) {
    registry.register(command);
  }
}

/** 按 tier 查询 catalog 条目 */
export function getCatalogByTier(tier: CommandTier): readonly CommandCatalogEntry[] {
  return COMMAND_CATALOG.filter(e => e.tier === tier);
}

/** 按 category 查询 catalog 条目 */
export function getCatalogByCategory(category: string): readonly CommandCatalogEntry[] {
  return COMMAND_CATALOG.filter(e => e.category === category);
}
