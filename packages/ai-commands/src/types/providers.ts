/**
 * Provider 接口定义 — 宿主注入的 I/O 抽象
 *
 * 每个命令需要的 I/O 操作通过窄接口委托给宿主。 命令本身不直接使用 fs/child_process/git，完全依赖宿主注入。
 */

// === Git Provider ===

/** Git 文件变更 */
/** Token 使用信息 */
/** Token 使用信息 — P53 统一从 @suga/ai-tool-adapter re-export */
import type { CostInfo, TokenUsageInfo } from '@suga/ai-tool-adapter';

export interface GitFileChange {
  readonly path: string;
  readonly status: 'added' | 'modified' | 'deleted' | 'renamed';
}

/** Git 状态结果 */
export interface GitStatusResult {
  readonly staged: readonly GitFileChange[];
  readonly unstaged: readonly GitFileChange[];
  readonly untracked: readonly string[];
  readonly branch: string;
  readonly aheadBehind?: { readonly ahead: number; readonly behind: number };
}

/** Git 日志条目 */
export interface GitLogEntry {
  readonly hash: string;
  readonly subject: string;
  readonly author: string;
  readonly date: string;
}

/** Git 操作 provider — /commit, /diff 需要 */
export interface GitProvider {
  /** 获取 git status（porcelain 格式解析后的结构化数据） */
  getStatus(): Promise<GitStatusResult>;
  /** 获取 staged diff */
  getStagedDiff(): Promise<string>;
  /** 获取 unstaged diff */
  getUnstagedDiff(): Promise<string>;
  /** 获取最近 N 条 commit 日志 */
  getLog(count: number): Promise<GitLogEntry[]>;
  /** 获取完整 diff（staged + unstaged） */
  getFullDiff(): Promise<string>;
}

// === Config Provider ===

/** 配置值来源 */
export type ConfigSource = 'default' | 'user' | 'project';

/** 配置节 */
export interface ConfigSection {
  readonly key: string;
  readonly value: unknown;
  readonly source: ConfigSource;
  readonly description?: string;
}

/** 配置值 */
export interface ConfigValue {
  readonly key: string;
  readonly value: unknown;
  readonly source: ConfigSource;
  readonly defaultValue?: unknown;
}

/** 配置管理 provider — /config 需要 */
export interface ConfigProvider {
  /** 获取所有配置节 */
  list(): Promise<ConfigSection[]>;
  /** 获取指定配置值 */
  get(key: string): Promise<ConfigValue | undefined>;
  /** 设置配置值 */
  set(key: string, value: unknown): Promise<void>;
  /** 重置配置键为默认值 */
  reset(key: string): Promise<void>;
  /** 获取完整配置为结构化对象 */
  getAll(): Promise<Record<string, unknown>>;
}

// === Session Info Provider ===

/** 会话状态 */
export interface SessionStatus {
  readonly sessionId: string;
  readonly turnCount: number;
  readonly status: 'active' | 'paused' | 'completed';
}
export type { CostInfo, TokenUsageInfo };

/** 会话信息 provider — /status 需要 */
export interface SessionInfoProvider {
  /** 获取当前会话状态 */
  getStatus(): Promise<SessionStatus>;
  /** 获取 token 使用信息 */
  getTokenUsage(): Promise<TokenUsageInfo>;
  /** 获取成本信息 */
  getCost(): Promise<CostInfo>;
  /** 获取会话持续时间（毫秒） */
  getDuration(): Promise<number>;
  /** 获取当前模型名称 */
  getCurrentModel(): Promise<string>;
}

// === Memory Command Provider ===

/** 记忆头部输入（用于 save 命令） */
export interface MemoryHeaderInput {
  readonly name: string;
  readonly description: string;
  readonly type: string;
}

/** 记忆条目（用于 recall 命令返回） */
export interface MemoryEntry {
  readonly filePath: string;
  readonly name: string;
  readonly description: string;
  readonly type: string;
  readonly body: string;
  readonly mtimeMs: number;
}

/** 保存结果 */
export interface SaveResult {
  readonly success: boolean;
  readonly path: string;
  readonly error?: string;
}

/** 刷新结果 */
export interface RefreshResult {
  readonly filesLoaded: number;
  readonly filesSkipped: number;
  readonly errors: readonly string[];
}

/**
 * 记忆命令 provider — /memory 需要
 *
 * 宿主适配器内部调用 @suga/ai-memory 纯函数， ai-commands 不直接 import ai-memory
 */
export interface MemoryCommandProvider {
  /** 保存记忆条目 */
  save(path: string, content: string, header: MemoryHeaderInput): Promise<SaveResult>;
  /** 搜索/召回记忆 */
  recall(query: string, limit?: number): Promise<MemoryEntry[]>;
  /** 删除记忆条目 */
  forget(path: string): Promise<boolean>;
  /** 刷新/重新加载所有记忆 */
  refresh(): Promise<RefreshResult>;
}

// === MCP Command Provider ===

/** MCP 服务器连接状态 */
export type McpConnectionState = 'connected' | 'failed' | 'pending' | 'needs-auth' | 'disabled';

/** MCP 服务器条目（用于 list 命令） */
export interface McpServerEntry {
  readonly name: string;
  readonly state: McpConnectionState;
  readonly configType?: string;
  readonly error?: string;
}

/** MCP 服务器配置（用于 add 命令） */
export interface McpServerConfig {
  readonly type: string;
  readonly command?: string;
  readonly args?: readonly string[];
  readonly url?: string;
  readonly env?: Record<string, string>;
}

/**
 * MCP 命令 provider — /mcp 需要
 *
 * 宿主适配器内部调用 @suga/ai-mcp 连接管理， ai-commands 不直接 import ai-mcp
 */
export interface McpCommandProvider {
  /** 列出所有 MCP 服务器及状态 */
  listServers(): Promise<McpServerEntry[]>;
  /** 添加 MCP 服务器 */
  addServer(name: string, config: McpServerConfig): Promise<void>;
  /** 移除 MCP 服务器 */
  removeServer(name: string): Promise<void>;
  /** 重启/重连 MCP 服务器 */
  restartServer(name: string): Promise<void>;
}

// === Diagnostic Provider ===

/** 诊断检查结果 */
export interface DiagnosticCheck {
  readonly name: string;
  readonly status: 'pass' | 'fail' | 'warn';
  readonly message: string;
  readonly details?: string;
}

/** 诊断报告 */
export interface DiagnosticReport {
  readonly checks: readonly DiagnosticCheck[];
  readonly passCount: number;
  readonly failCount: number;
  readonly warnCount: number;
}

/** 诊断 provider — /doctor 需要 */
export interface DiagnosticProvider {
  /** 检查 Node.js 版本 */
  checkNodeVersion(): Promise<DiagnosticCheck>;
  /** 检查 git 可用性 */
  checkGit(): Promise<DiagnosticCheck>;
  /** 检查工具注册表健康 */
  checkToolRegistry(): Promise<DiagnosticCheck>;
  /** 检查 skill 注册表健康 */
  checkSkillRegistry(): Promise<DiagnosticCheck>;
  /** 检查 MCP 连接 */
  checkMcpConnections(): Promise<DiagnosticCheck>;
  /** 检查权限配置 */
  checkPermissions(): Promise<DiagnosticCheck>;
  /** 运行所有检查 */
  runAll(): Promise<DiagnosticReport>;
}

// === Session Control Provider ===

/** 会话控制 provider — /clear 需要 */
export interface SessionControlProvider {
  /** 清空会话上下文/历史 */
  clearContext(): Promise<void>;
}

// === Model Control Provider ===

/** 模型信息 */
export interface ModelInfo {
  readonly name: string;
  readonly description: string;
  readonly maxTokens?: number;
}

/** 模型控制 provider — /fast, /model 需要 */
export interface ModelControlProvider {
  /** 获取当前模型名称 */
  getCurrentModel(): Promise<string>;
  /** 列出可用模型 */
  getAvailableModels(): Promise<ModelInfo[]>;
  /** 切换模型 — 返回切换后的模型名称 */
  switchModel(modelName: string): Promise<string>;
}

// === Permissions Provider ===

/** 权限规则 */
export interface PermissionRule {
  readonly id: string;
  readonly tool: string;
  readonly pattern: string;
  readonly scope: 'allow' | 'deny' | 'ask';
}

/** 权限管理 provider — /permissions 需要 */
export interface PermissionsProvider {
  /** 列出所有权限规则 */
  listRules(): Promise<PermissionRule[]>;
  /** 授予权限（添加 allow 规则） */
  grant(tool: string, pattern: string): Promise<PermissionRule>;
  /** 撤销权限（删除规则） */
  revoke(ruleId: string): Promise<boolean>;
}

// === Session / Resume Provider ===

/** 已保存会话的元数据条目 */
export interface SessionEntry {
  readonly id: string;
  readonly title?: string;
  readonly cwd: string;
  readonly startedAt: number;
  readonly updatedAt: number;
  readonly turnCount: number;
  readonly preview?: string;
}

/** Session/Resume provider — /resume, /session, /rename 需要 */
export interface SessionStoreProvider {
  /** 列出已保存的会话（按更新时间倒序） */
  list(limit?: number): Promise<SessionEntry[]>;
  /** 加载会话 */
  resume(sessionId: string): Promise<{ readonly success: boolean; readonly error?: string }>;
  /** 重命名会话 */
  rename(sessionId: string, title: string): Promise<boolean>;
  /** 删除会话 */
  delete(sessionId: string): Promise<boolean>;
  /** 当前会话 ID */
  getCurrentSessionId(): Promise<string | null>;
}

// === Auth Provider ===

/** 用户身份 */
export interface AuthIdentity {
  readonly userId?: string;
  readonly email?: string;
  readonly tier?: string;
  readonly orgId?: string;
}

/** 鉴权 provider — /login, /logout 需要（命令层别名，避免与 @suga/ai-auth.AuthProvider 冲突） */
export interface CommandAuthProvider {
  /** 是否已登录 */
  isLoggedIn(): Promise<boolean>;
  /** 当前身份信息 */
  whoAmI(): Promise<AuthIdentity | null>;
  /** 启动登录流程（OAuth）；返回 deviceCode/url 或最终凭证 */
  login(provider?: string): Promise<{
    readonly url?: string;
    readonly userCode?: string;
    readonly success: boolean;
    readonly error?: string;
  }>;
  /** 退出登录 */
  logout(): Promise<void>;
}

// === Plan Mode Provider ===

/** Plan Mode 状态 */
export interface PlanModeState {
  readonly enabled: boolean;
  readonly defaultEnabled?: boolean;
}

/** Plan Mode provider — /plan 需要 */
export interface PlanModeProvider {
  /** 当前是否启用 plan mode */
  getState(): Promise<PlanModeState>;
  /** 启用/禁用 */
  setEnabled(enabled: boolean): Promise<PlanModeState>;
}

// === Theme Provider ===

/** 主题信息 */
export interface ThemeInfo {
  readonly name: string;
  readonly description?: string;
  readonly isDark?: boolean;
}

/** 主题 provider — /theme 需要 */
export interface ThemeProvider {
  /** 当前主题 */
  getCurrent(): Promise<ThemeInfo>;
  /** 列出可用主题 */
  list(): Promise<ThemeInfo[]>;
  /** 切换主题 */
  setTheme(name: string): Promise<ThemeInfo>;
}

// === IDE Provider ===

/** 检测到的 IDE 实例 */
export interface IDEInstance {
  readonly id: string;
  readonly name: string;
  readonly workspace?: string;
  readonly running?: boolean;
}

/** IDE provider — /ide 需要 */
export interface IDEProvider {
  /** 列出当前可见/正在运行的 IDE */
  list(): Promise<IDEInstance[]>;
  /** 连接到指定 IDE */
  connect(id: string): Promise<{ readonly success: boolean; readonly error?: string }>;
  /** 断开当前 IDE */
  disconnect(): Promise<void>;
  /** 当前已连接的 IDE id */
  getConnectedId(): Promise<string | null>;
}

// === Skills Provider ===

/** Skill 简略信息 */
export interface SkillSummary {
  readonly name: string;
  readonly description: string;
  readonly source: 'bundled' | 'project' | 'user' | 'mcp';
  readonly enabled: boolean;
}

/** Skills provider — /skills 需要 */
export interface SkillsProvider {
  /** 列出已注册的 skill */
  list(): Promise<SkillSummary[]>;
  /** 启用 skill */
  enable(name: string): Promise<boolean>;
  /** 禁用 skill */
  disable(name: string): Promise<boolean>;
}

// === Hooks Provider ===

/** Hook 注册信息 */
export interface HookEntry {
  readonly id: string;
  readonly event: string;
  readonly command?: string;
  readonly source: 'project' | 'user';
  readonly enabled: boolean;
}

/** Hooks provider — /hooks 需要 */
export interface HooksProvider {
  /** 列出所有 hook */
  list(): Promise<HookEntry[]>;
  /** 启用/禁用 hook */
  setEnabled(id: string, enabled: boolean): Promise<boolean>;
  /** 重新加载 hook 配置 */
  reload(): Promise<{ readonly loaded: number; readonly errors: readonly string[] }>;
}

// === Tasks Provider (Cron / Background Loops) ===

/** 任务状态（命令层别名，避免与 @suga/ai-coordinator.TaskStatus 冲突） */
export type CommandTaskStatus = 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';

/** 任务条目 */
export interface TaskEntry {
  readonly id: string;
  readonly title: string;
  readonly status: CommandTaskStatus;
  readonly schedule?: string;
  readonly nextRun?: number;
  readonly lastRun?: number;
}

/** Tasks provider — /tasks 需要 */
export interface TasksProvider {
  /** 列出已调度的任务 */
  list(): Promise<TaskEntry[]>;
  /** 取消任务 */
  cancel(id: string): Promise<boolean>;
  /** 立即触发任务 */
  trigger(id: string): Promise<boolean>;
}

// === Export Provider ===

/** 导出格式 */
export type ExportFormat = 'json' | 'markdown' | 'jsonl';

/** Export 结果 */
export interface ExportResult {
  readonly format: ExportFormat;
  readonly path?: string;
  readonly bytes: number;
  readonly success: boolean;
  readonly error?: string;
}

/** Export provider — /export 需要 */
export interface ExportProvider {
  /** 导出当前会话到磁盘或返回内容 */
  exportSession(format: ExportFormat, outputPath?: string): Promise<ExportResult>;
}

// === Usage / Stats Provider ===

/** Usage 统计快照 */
export interface UsageSnapshot {
  readonly totalRequests: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCacheCreationTokens?: number;
  readonly totalCacheReadTokens?: number;
  readonly totalCostUsd: number;
  readonly windowStart?: number;
  readonly windowEnd?: number;
}

/** Stats provider — /usage, /stats 需要 */
export interface StatsProvider {
  /** 当前会话 token usage */
  getSessionUsage(): Promise<UsageSnapshot>;
  /** 跨会话累计（当日 / 当月） */
  getAggregateUsage(scope: 'day' | 'week' | 'month' | 'all'): Promise<UsageSnapshot>;
}
