/**
 * MCP 工具/资源类型定义
 *
 * 定义 MCP 工具描述、资源、序列化格式
 */

/** MCP 工具定义 */
export interface McpToolDefinition {
  /** 工具名称 */
  readonly name: string;
  /** 工具描述 */
  readonly description: string;
  /** 输入 JSON Schema */
  readonly inputSchema?: {
    readonly [x: string]: unknown;
    readonly type: 'object';
    readonly properties?: { readonly [x: string]: unknown };
  };
  /** 是否为 MCP 工具 */
  readonly isMcp?: boolean;
  /** 原始未规范化工具名 */
  readonly originalToolName?: string;
}

/** MCP 资源 */
export interface McpResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

/** 带服务器标识的 MCP 资源 */
export interface McpServerResource extends McpResource {
  readonly server: string;
}

/** 规范化名称映射 */
export interface McpNormalizedNames {
  /** 规范化名 → 原始名 */
  readonly normalizedToOriginal: Record<string, string>;
}

/** MCP CLI 状态 — 序列化格式 */
export interface McpCliState {
  readonly clients: McpSerializedClient[];
  readonly configs: Record<string, import('./mcp-scope').ScopedMcpServerConfig>;
  readonly tools: McpToolDefinition[];
  readonly resources: Record<string, McpServerResource[]>;
  readonly normalizedNames?: McpNormalizedNames;
}

/** MCP 序列化客户端 */
export interface McpSerializedClient {
  readonly name: string;
  readonly type: 'connected' | 'failed' | 'needs-auth' | 'pending' | 'disabled';
  readonly capabilities?: import('./mcp-registry').McpServerCapabilities;
}
