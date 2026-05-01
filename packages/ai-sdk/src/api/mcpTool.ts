/**
 * mcpTool.ts — SDK MCP工具定义API
 *
 * tool() 和 createSdkMcpServer() 有具体实现（非stub）， 因为这些是纯数据构造函数，不依赖运行时注入。
 */

import type { z } from 'zod/v4';
import type { CreateSdkMcpServerConfig, SdkMcpToolDefinition } from '../sdk/runtimeTypes';

/** SDKAbortError — 用户中止时抛出的错误 */
export class SDKAbortError extends Error {
  constructor(message: string = 'Operation aborted') {
    super(message);
    this.name = 'SDKAbortError';
  }
}

/**
 * tool() — 定义SDK MCP工具
 *
 * 创建一个工具定义对象，用于createSdkMcpServer()注册。 此函数有具体实现 — 构造工具定义数据对象。
 *
 * @param name 工具名称
 * @param description 工具描述
 * @param inputSchema Zod输入schema
 * @param handler 处理函数
 * @returns SdkMcpToolDefinition对象
 */
export function tool<T>(
  name: string,
  description: string,
  inputSchema: z.ZodType<T>,
  handler: (input: T) => Promise<string>
): SdkMcpToolDefinition<T> {
  return {
    name,
    description,
    input_schema: inputSchema,
    handler
  };
}

/**
 * createSdkMcpServer() — 创建SDK MCP服务器配置
 *
 * 创建MCP进程内服务器配置对象，用于SDK transport。 此函数有具体实现 — 构造MCP服务器配置数据对象。
 *
 * @param config 服务器配置（name, version, tools）
 * @returns MCP SDK服务器配置对象
 */
export function createSdkMcpServer(config: CreateSdkMcpServerConfig): {
  type: 'sdk';
  name: string;
  version: string;
  tools: readonly SdkMcpToolDefinition[];
} {
  return {
    type: 'sdk',
    name: config.name,
    version: config.version,
    tools: config.tools
  };
}
