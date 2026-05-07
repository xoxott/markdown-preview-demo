/** 命令 catalog 类型定义 */

import type { FileSystemProvider } from '@suga/ai-tools';
import type {
  CommandAuthProvider,
  ConfigProvider,
  DiagnosticProvider,
  ExportProvider,
  GitProvider,
  HooksProvider,
  IDEProvider,
  McpCommandProvider,
  MemoryCommandProvider,
  ModelControlProvider,
  PermissionsProvider,
  PlanModeProvider,
  SessionControlProvider,
  SessionInfoProvider,
  SessionStoreProvider,
  SkillsProvider,
  StatsProvider,
  TasksProvider,
  ThemeProvider
} from './providers';

/** 命令 tier 分类 */
export type CommandTier = 'tier1' | 'tier2' | 'tier3';

/** 命令 catalog 条目 */
export interface CommandCatalogEntry {
  readonly name: string;
  readonly tier: CommandTier;
  readonly category: string;
  readonly requiredProviders: readonly string[];
}

/** Provider 映射类型 */
export interface ProvidersMap {
  gitProvider: GitProvider;
  configProvider: ConfigProvider;
  sessionInfoProvider: SessionInfoProvider;
  memoryProvider: MemoryCommandProvider;
  mcpProvider: McpCommandProvider;
  diagnosticProvider: DiagnosticProvider;
  fsProvider: FileSystemProvider;
  sessionControlProvider: SessionControlProvider;
  modelControlProvider: ModelControlProvider;
  permissionsProvider: PermissionsProvider;
  sessionStoreProvider: SessionStoreProvider;
  authProvider: CommandAuthProvider;
  planModeProvider: PlanModeProvider;
  themeProvider: ThemeProvider;
  ideProvider: IDEProvider;
  skillsProvider: SkillsProvider;
  hooksProvider: HooksProvider;
  tasksProvider: TasksProvider;
  exportProvider: ExportProvider;
  statsProvider: StatsProvider;
}
