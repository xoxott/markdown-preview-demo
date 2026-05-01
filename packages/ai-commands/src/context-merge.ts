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
  ConfigProvider,
  DiagnosticProvider,
  GitProvider,
  McpCommandProvider,
  MemoryCommandProvider,
  SessionInfoProvider
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
}

/** Provider 缺失错误 — 统一报错格式 */
export class ProviderMissingError extends Error {
  constructor(providerName: string, commandName: string) {
    super(`${commandName}: ${providerName} not available. Host must inject ${providerName}.`);
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
    fsProvider: 'FileSystemProvider'
  };
  return names[key] ?? key;
}
