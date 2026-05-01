/** 命令 catalog 类型定义 */

import type { FileSystemProvider } from '@suga/ai-tools';
import type {
  ConfigProvider,
  DiagnosticProvider,
  GitProvider,
  McpCommandProvider,
  MemoryCommandProvider,
  SessionInfoProvider
} from './providers';

/** 命令 tier 分类 */
export type CommandTier = 'tier1' | 'tier2';

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
}
