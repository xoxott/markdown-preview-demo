/** MCP 服务器能力/信息类型定义 */

/** MCP 服务器能力声明 */
export interface McpServerCapabilities {
  readonly tools?: Record<string, unknown>;
  readonly resources?: Record<string, unknown>;
  readonly prompts?: Record<string, unknown>;
  readonly experimental?: Record<string, unknown>;
}

/** MCP 服务器信息 */
export interface McpServerInfo {
  readonly name: string;
  readonly version: string;
}
