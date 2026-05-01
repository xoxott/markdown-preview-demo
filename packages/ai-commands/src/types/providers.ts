/**
 * Provider 接口定义 — 宿主注入的 I/O 抽象
 *
 * 每个命令需要的 I/O 操作通过窄接口委托给宿主。 命令本身不直接使用 fs/child_process/git，完全依赖宿主注入。
 */

// === Git Provider ===

/** Git 文件变更 */
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

/** Token 使用信息 */
export interface TokenUsageInfo {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

/** 成本信息 */
export interface CostInfo {
  readonly totalCost: number;
  readonly inputCost: number;
  readonly outputCost: number;
}

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
