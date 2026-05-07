/**
 * @suga/ai-commands SkillExecutionContext 扩展
 *
 * 定义扩展的上下文类型，包含所有 provider 接口。
 * 命令通过 ExtendedSkillExecutionContext 获取宿主注入的 provider。
 * 所有 provider 可选 (?)，命令运行时检查必需 provider，缺失则报错。
 */

import type { SkillExecutionContext } from '@suga/ai-skill';
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
} from './types/providers';

/** 扩展的 SkillExecutionContext — 包含所有命令 provider */
export interface ExtendedSkillExecutionContext extends SkillExecutionContext {
  /** Git provider（/commit, /diff 需要） */
  readonly gitProvider?: GitProvider;
  /** 配置 provider（/config 需要） */
  readonly configProvider?: ConfigProvider;
  /** 会话信息 provider（/status 需要） */
  readonly sessionInfoProvider?: SessionInfoProvider;
  /** 记忆命令 provider（/memory 需要） */
  readonly memoryProvider?: MemoryCommandProvider;
  /** MCP 命令 provider（/mcp 需要） */
  readonly mcpProvider?: McpCommandProvider;
  /** 诊断 provider（/doctor 需要） */
  readonly diagnosticProvider?: DiagnosticProvider;
  /** 文件系统 provider（/init, /add-dir 需要） */
  readonly fsProvider?: FileSystemProvider;
  /** 会话控制 provider（/clear 需要） */
  readonly sessionControlProvider?: SessionControlProvider;
  /** 模型控制 provider（/fast, /model 需要） */
  readonly modelControlProvider?: ModelControlProvider;
  /** 权限管理 provider（/permissions 需要） */
  readonly permissionsProvider?: PermissionsProvider;
  /** 会话存储 provider（/resume, /session, /rename 需要） */
  readonly sessionStoreProvider?: SessionStoreProvider;
  /** 鉴权 provider（/login, /logout 需要） */
  readonly authProvider?: CommandAuthProvider;
  /** Plan Mode provider（/plan 需要） */
  readonly planModeProvider?: PlanModeProvider;
  /** 主题 provider（/theme 需要） */
  readonly themeProvider?: ThemeProvider;
  /** IDE provider（/ide 需要） */
  readonly ideProvider?: IDEProvider;
  /** Skills provider（/skills 需要） */
  readonly skillsProvider?: SkillsProvider;
  /** Hooks provider（/hooks 需要） */
  readonly hooksProvider?: HooksProvider;
  /** Tasks provider（/tasks 需要） */
  readonly tasksProvider?: TasksProvider;
  /** Export provider（/export 需要） */
  readonly exportProvider?: ExportProvider;
  /** Stats provider（/usage, /stats 需要） */
  readonly statsProvider?: StatsProvider;
}

/** Provider 缺失错误 — 统一报错格式 */
export class ProviderMissingError extends Error {
  constructor(name: string, commandName: string) {
    super(`${commandName}: ${name} not available. Host must inject ${name}.`);
    this.name = 'ProviderMissingError';
  }
}

/** 检查必需 provider，缺失时返回错误 prompt */
export function requireProvider<T>(
  context: ExtendedSkillExecutionContext,
  providerKey: keyof ExtendedSkillExecutionContext,
  commandName: string
): T | { readonly content: string } {
  const provider = context[providerKey];
  if (provider === undefined || provider === null) {
    return {
      content: `Error: ${commandName} requires ${providerName(providerKey)}. Host must inject it via SkillExecutionContext.`
    };
  }
  return provider as T;
}

/** provider key → 人类可读名称 */
function providerName(key: keyof ExtendedSkillExecutionContext): string {
  const names: Record<string, string> = {
    gitProvider: 'GitProvider',
    configProvider: 'ConfigProvider',
    sessionInfoProvider: 'SessionInfoProvider',
    memoryProvider: 'MemoryCommandProvider',
    mcpProvider: 'McpCommandProvider',
    diagnosticProvider: 'DiagnosticProvider',
    fsProvider: 'FileSystemProvider',
    sessionControlProvider: 'SessionControlProvider',
    modelControlProvider: 'ModelControlProvider',
    permissionsProvider: 'PermissionsProvider',
    sessionStoreProvider: 'SessionStoreProvider',
    authProvider: 'AuthProvider',
    planModeProvider: 'PlanModeProvider',
    themeProvider: 'ThemeProvider',
    ideProvider: 'IDEProvider',
    skillsProvider: 'SkillsProvider',
    hooksProvider: 'HooksProvider',
    tasksProvider: 'TasksProvider',
    exportProvider: 'ExportProvider',
    statsProvider: 'StatsProvider'
  };
  return names[key] ?? key;
}
