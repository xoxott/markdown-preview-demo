/**
 * 命令 catalog 纯数据 — 无 Skill 实现依赖，可供浏览器宿主只读展示 catalog。
 */

import type { CommandCatalogEntry } from './types/catalog';

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
  { name: 'mcp', tier: 'tier2', category: 'mcp', requiredProviders: ['mcpProvider'] },
  // Tier 3
  { name: 'help', tier: 'tier3', category: 'session', requiredProviders: [] },
  {
    name: 'clear',
    tier: 'tier3',
    category: 'session',
    requiredProviders: ['sessionControlProvider']
  },
  { name: 'cost', tier: 'tier3', category: 'session', requiredProviders: ['sessionInfoProvider'] },
  { name: 'fast', tier: 'tier3', category: 'config', requiredProviders: ['modelControlProvider'] },
  { name: 'model', tier: 'tier3', category: 'config', requiredProviders: ['modelControlProvider'] },
  {
    name: 'permissions',
    tier: 'tier3',
    category: 'config',
    requiredProviders: ['permissionsProvider']
  },
  { name: 'vim', tier: 'tier3', category: 'config', requiredProviders: ['configProvider'] },
  { name: 'terminal-setup', tier: 'tier3', category: 'config', requiredProviders: ['fsProvider'] },
  {
    name: 'session',
    tier: 'tier3',
    category: 'session',
    requiredProviders: ['sessionStoreProvider']
  },
  {
    name: 'resume',
    tier: 'tier3',
    category: 'session',
    requiredProviders: ['sessionStoreProvider']
  },
  { name: 'login', tier: 'tier3', category: 'auth', requiredProviders: ['authProvider'] },
  { name: 'logout', tier: 'tier3', category: 'auth', requiredProviders: ['authProvider'] },
  { name: 'plan', tier: 'tier3', category: 'mode', requiredProviders: ['planModeProvider'] },
  { name: 'theme', tier: 'tier3', category: 'config', requiredProviders: ['themeProvider'] },
  { name: 'ide', tier: 'tier3', category: 'integration', requiredProviders: ['ideProvider'] },
  { name: 'skills', tier: 'tier3', category: 'config', requiredProviders: ['skillsProvider'] },
  { name: 'hooks', tier: 'tier3', category: 'config', requiredProviders: ['hooksProvider'] },
  { name: 'tasks', tier: 'tier3', category: 'tasks', requiredProviders: ['tasksProvider'] },
  { name: 'export', tier: 'tier3', category: 'session', requiredProviders: ['exportProvider'] },
  { name: 'usage', tier: 'tier3', category: 'stats', requiredProviders: ['statsProvider'] },
  { name: 'stats', tier: 'tier3', category: 'stats', requiredProviders: ['statsProvider'] }
];
