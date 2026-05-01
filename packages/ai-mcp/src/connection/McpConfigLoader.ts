/**
 * MCP 配置加载器 — 宿主注入接口 + 纯函数验证
 *
 * 定义 McpConfigLoader 接口（宿主实现从文件/远程加载配置） validateMcpServerConfig 和 getMcpServerTransportType 为纯函数
 */

import type {
  McpJsonConfig,
  McpServerConfig,
  McpStdioServerConfig,
  McpTransportType
} from '../types/mcp-config';
import type { McpConfigScope, ScopedMcpServerConfig } from '../types/mcp-scope';
import { McpJsonConfigSchema, McpServerConfigSchema } from '../types/mcp-config';
import { McpConfigScopeSchema } from '../types/mcp-scope';

/** MCP 配置加载器接口 — 宿主注入 */
export interface McpConfigLoader {
  /** 从所有来源加载配置 */
  loadAllConfigs(): Promise<ReadonlyMap<string, ScopedMcpServerConfig>>;

  /** 从特定 scope 加载配置 */
  loadConfigsFromScope(scope: McpConfigScope): Promise<Record<string, McpServerConfig>>;

  /** 检查服务器是否被禁用 */
  isServerDisabled(serverName: string): boolean;

  /** 写入项目级 .mcp.json */
  writeProjectMcpJson(config: McpJsonConfig): Promise<void>;

  /** 删除服务器配置 */
  removeServerConfig(serverName: string, scope: McpConfigScope): Promise<void>;
}

/**
 * 验证 McpServerConfig 的纯函数
 *
 * 使用 Zod schema 验证配置对象的结构正确性
 */
export function validateMcpServerConfig(config: unknown): { valid: boolean; errors?: string[] } {
  const result = McpServerConfigSchema.safeParse(config);
  if (result.success) {
    return { valid: true };
  }
  const errors = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
  return { valid: false, errors };
}

/** 验证 .mcp.json 文件格式的纯函数 */
export function validateMcpJsonConfig(config: unknown): { valid: boolean; errors?: string[] } {
  const result = McpJsonConfigSchema.safeParse(config);
  if (result.success) {
    return { valid: true };
  }
  const errors = result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
  return { valid: false, errors };
}

/** 验证 McpConfigScope 的纯函数 */
export function validateMcpConfigScope(scope: unknown): { valid: boolean } {
  return McpConfigScopeSchema.safeParse(scope).success ? { valid: true } : { valid: false };
}

/** 从 McpServerConfig 获取传输类型 */
export function getMcpServerTransportType(config: McpServerConfig): McpTransportType {
  // stdio 配置的 type 字段可选
  if (config.type === undefined || config.type === 'stdio') return 'stdio';
  return config.type as McpTransportType;
}

/** 判断配置是否为 stdio 类型 */
export function isStdioConfig(config: McpServerConfig): boolean {
  return config.type === undefined || config.type === 'stdio';
}

/** 判断配置是否为需要 URL 的远程类型 */
export function isRemoteConfig(config: McpServerConfig): boolean {
  return config.type !== undefined && config.type !== 'stdio' && config.type !== 'sdk';
}

/**
 * 获取 stdio 配置的命令数组
 *
 * @returns 命令数组 [command, ...args]，非 stdio 返回 null
 */
export function getStdioCommandArray(config: McpServerConfig): string[] | null {
  if (!isStdioConfig(config)) return null;
  const stdioConfig = config as McpStdioServerConfig;
  return [stdioConfig.command, ...(stdioConfig.args ?? [])];
}

/**
 * 合并多个 scope 的配置 — policy first-source-wins
 *
 * 高优先级 scope 的配置覆盖低优先级 scope 的同名服务器
 */
export function mergeScopedConfigs(
  configsByScope: Partial<Record<McpConfigScope, Record<string, McpServerConfig>>>
): ReadonlyMap<string, ScopedMcpServerConfig> {
  const result = new Map<string, ScopedMcpServerConfig>();
  const scopeOrder: McpConfigScope[] = [
    'local',
    'project',
    'user',
    'dynamic',
    'enterprise',
    'managed',
    'claudeai'
  ];

  // 低优先级先写入，高优先级覆盖
  for (const scope of scopeOrder) {
    const configs = configsByScope[scope];
    if (!configs) continue;
    for (const [name, config] of Object.entries(configs)) {
      result.set(name, { ...config, scope });
    }
  }

  return result;
}
