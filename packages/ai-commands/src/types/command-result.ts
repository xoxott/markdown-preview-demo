/** 命令结果类型 — prompt builder 的输入结构化类型 */

import type {
  ConfigSection,
  ConfigValue,
  CostInfo,
  DiagnosticReport,
  GitLogEntry,
  GitStatusResult,
  McpServerEntry,
  MemoryEntry,
  RefreshResult,
  SaveResult,
  SessionStatus,
  TokenUsageInfo
} from './providers';

// === Tier 1 prompt builder 输入 ===

/** /commit prompt 输入 */
export interface CommitPromptInput {
  readonly status: GitStatusResult;
  readonly diff: string;
  readonly recentLog: readonly GitLogEntry[];
  readonly instruction?: string;
  readonly amend?: boolean;
}

/** /compact prompt 输入 */
export interface CompactPromptInput {
  readonly instruction?: string;
  readonly force?: boolean;
}

/** /memory save prompt 输入 */
export interface MemorySavePromptInput {
  readonly result: SaveResult;
  readonly name: string;
  readonly type: string;
}

/** /memory recall prompt 输入 */
export interface MemoryRecallPromptInput {
  readonly entries: readonly MemoryEntry[];
  readonly query: string;
}

/** /memory forget prompt 输入 */
export interface MemoryForgetPromptInput {
  readonly success: boolean;
  readonly path: string;
}

/** /memory refresh prompt 输入 */
export interface MemoryRefreshPromptInput {
  readonly result: RefreshResult;
}

/** /config list prompt 输入 */
export interface ConfigListPromptInput {
  readonly sections: readonly ConfigSection[];
}

/** /config get prompt 输入 */
export interface ConfigGetPromptInput {
  readonly key: string;
  readonly value: ConfigValue | undefined;
}

/** /config set prompt 输入 */
export interface ConfigSetPromptInput {
  readonly key: string;
  readonly value: unknown;
}

/** /config reset prompt 输入 */
export interface ConfigResetPromptInput {
  readonly key: string;
}

/** /doctor prompt 输入 */
export interface DoctorPromptInput {
  readonly report: DiagnosticReport;
  readonly filter?: string;
}

// === Tier 2 prompt builder 输入 ===

/** /add-dir prompt 输入 */
export interface AddDirPromptInput {
  readonly path: string;
  readonly success: boolean;
}

/** /init prompt 输入 */
export interface InitPromptInput {
  readonly template: string;
  readonly projectRoot: string;
  readonly filesCreated: readonly string[];
}

/** /status prompt 输入 */
export interface StatusPromptInput {
  readonly sessionStatus: SessionStatus;
  readonly tokenUsage: TokenUsageInfo;
  readonly cost: CostInfo;
  readonly durationMs: number;
  readonly model: string;
  readonly verbose?: boolean;
}

/** /diff prompt 输入 */
export interface DiffPromptInput {
  readonly diff: string;
  readonly stagedOnly?: boolean;
  readonly branch: string;
  readonly filter?: string;
}

/** /mcp list prompt 输入 */
export interface McpListPromptInput {
  readonly servers: readonly McpServerEntry[];
}

/** /mcp add prompt 输入 */
export interface McpAddPromptInput {
  readonly name: string;
  readonly configType: string;
}

/** /mcp remove prompt 输入 */
export interface McpRemovePromptInput {
  readonly name: string;
}

/** /mcp restart prompt 输入 */
export interface McpRestartPromptInput {
  readonly name: string;
}
