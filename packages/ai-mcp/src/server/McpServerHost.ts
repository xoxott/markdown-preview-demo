/**
 * MCP Server Host — 封装 @modelcontextprotocol/sdk 的 McpServer，提供简化高层 API
 *
 * 设计原则：
 *
 * - 类型安全：工具/资源/提示注册时验证 Zod schema
 * - 生命周期管理：创建/连接/关闭一站式管理
 * - 通知机制：工具列表变更、资源列表变更等
 * - Builder 模式：McpServerBuilder 简化 Server 创建和注册
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  CallToolResult,
  GetPromptResult,
  Implementation,
  LoggingMessageNotification,
  ReadResourceResult,
  ToolAnnotations
} from '@modelcontextprotocol/sdk/types.js';
import type { ServerOptions } from '@modelcontextprotocol/sdk/server/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { AnySchema, ZodRawShapeCompat } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type {
  RegisteredPrompt,
  RegisteredResource,
  RegisteredTool
} from '@modelcontextprotocol/sdk/server/mcp.js';

/** 工具注册配置 */
export interface McpToolConfig {
  /** 工具名称 */
  readonly name: string;
  /** 工具描述 */
  readonly description?: string;
  /** 输入参数 Zod schema */
  readonly inputSchema?: ZodRawShapeCompat;
  /** 输出 schema */
  readonly outputSchema?: ZodRawShapeCompat | AnySchema;
  /** 工具注解 */
  readonly annotations?: ToolAnnotations;
}

/** 工具回调类型 */
export type McpToolCallback<Args extends ZodRawShapeCompat | undefined = undefined> =
  Args extends ZodRawShapeCompat
    ? (args: Record<string, unknown>, extra: unknown) => CallToolResult | Promise<CallToolResult>
    : (extra: unknown) => CallToolResult | Promise<CallToolResult>;

/** 资源注册配置 */
export interface McpResourceConfig {
  /** 资源名称 */
  readonly name: string;
  /** 资源 URI */
  readonly uri: string;
  /** 资源描述 */
  readonly description?: string;
  /** MIME 类型 */
  readonly mimeType?: string;
}

/** 资源读取回调 — SDK ReadResourceCallback 签名 */
export type McpResourceReadCallback = (
  uri: URL,
  extra: unknown
) => ReadResourceResult | Promise<ReadResourceResult>;

/** 提示注册配置 */
export interface McpPromptConfig {
  /** 提示名称 */
  readonly name: string;
  /** 提示描述 */
  readonly description?: string;
  /** 提示参数 Zod schema */
  readonly argsSchema?: ZodRawShapeCompat;
}

/** 提示回调类型 */
export type McpPromptCallback<Args extends ZodRawShapeCompat | undefined = undefined> =
  Args extends ZodRawShapeCompat
    ? (args: Record<string, unknown>, extra: unknown) => GetPromptResult | Promise<GetPromptResult>
    : (extra: unknown) => GetPromptResult | Promise<GetPromptResult>;

/** MCP Server Host 配置 */
export interface McpServerHostConfig {
  /** 服务器信息 */
  readonly serverInfo: Implementation;
  /** 服务器选项 */
  readonly options?: ServerOptions;
}

/** 日志级别 */
export type McpLogLevel =
  | 'error'
  | 'debug'
  | 'info'
  | 'notice'
  | 'warning'
  | 'critical'
  | 'alert'
  | 'emergency';

/**
 * MCP Server Host — 简化高层 API
 *
 * 封装 SDK McpServer，提供：
 *
 * 1. 注册Tool（registerTool） — 类型安全 + Zod schema 验证
 * 2. 注册Resource（registerResource） — 固定 URI 资源
 * 3. 注册Prompt（registerPrompt） — 提示模板
 * 4. 连接 Transport（connect） — Stdio/SSE/StreamableHTTP
 * 5. 关闭 Server（close）
 * 6. 发送通知（sendToolListChanged 等）
 */
export class McpServerHost {
  private readonly mcpServer: McpServer;
  private connected = false;

  constructor(config: McpServerHostConfig) {
    this.mcpServer = new McpServer(config.serverInfo, config.options);
  }

  /** 获取底层 SDK McpServer（高级操作用） */
  get server(): McpServer {
    return this.mcpServer;
  }

  /** 是否已连接到传输 */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * 注册工具
   *
   * @param config 工具配置
   * @param callback 工具回调
   * @returns RegisteredTool（可 enable/disable/update/remove）
   */
  registerTool(
    config: McpToolConfig,
    callback: McpToolCallback<typeof config.inputSchema>
  ): RegisteredTool {
    return this.mcpServer.registerTool(
      config.name,
      {
        description: config.description,
        inputSchema: config.inputSchema,
        outputSchema: config.outputSchema,
        annotations: config.annotations
      },
      callback as Parameters<McpServer['registerTool']>[2]
    );
  }

  /**
   * 注册资源 — 固定 URI
   *
   * @param config 资源配置
   * @param readCallback 资源读取回调
   * @returns RegisteredResource
   */
  registerResource(
    config: McpResourceConfig,
    readCallback: McpResourceReadCallback
  ): RegisteredResource {
    // SDK registerResource 签名：registerResource(name, uriOrTemplate, config, readCallback)
    // 这里 uri 是 string 类型，对应固定 URI 资源
    return this.mcpServer.registerResource(
      config.name,
      config.uri,
      {
        description: config.description,
        mimeType: config.mimeType
      },
      readCallback as import('@modelcontextprotocol/sdk/server/mcp.js').ReadResourceCallback
    );
  }

  /**
   * 注册提示
   *
   * @param config 提示配置
   * @param callback 提示回调
   * @returns RegisteredPrompt
   */
  registerPrompt(
    config: McpPromptConfig,
    callback: McpPromptCallback<typeof config.argsSchema>
  ): RegisteredPrompt {
    return this.mcpServer.registerPrompt(
      config.name,
      {
        description: config.description,
        argsSchema: config.argsSchema
      },
      callback as Parameters<McpServer['registerPrompt']>[2]
    );
  }

  /**
   * 连接到 Transport 并启动 Server
   *
   * @param transport MCP 传输实例
   */
  async connect(transport: Transport): Promise<void> {
    await this.mcpServer.connect(transport);
    this.connected = true;
  }

  /** 关闭 Server 连接 */
  async close(): Promise<void> {
    await this.mcpServer.close();
    this.connected = false;
  }

  /** 发送工具列表变更通知 */
  sendToolListChanged(): void {
    this.mcpServer.sendToolListChanged();
  }

  /** 发送资源列表变更通知 */
  sendResourceListChanged(): void {
    this.mcpServer.sendResourceListChanged();
  }

  /** 发送提示列表变更通知 */
  sendPromptListChanged(): void {
    this.mcpServer.sendPromptListChanged();
  }

  /** 发送日志消息 */
  async sendLoggingMessage(params: LoggingMessageNotification['params']): Promise<void> {
    await this.mcpServer.sendLoggingMessage(params);
  }
}

// 重导出 SDK 的 Registered 类型（供宿主使用）
export type { RegisteredTool, RegisteredResource, RegisteredPrompt };
