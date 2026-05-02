/** McpResourceProvider — MCP资源访问宿主注入接口 */

/** MCP资源条目 */
export interface McpResourceEntry {
  uri: string;
  name: string;
  mimeType?: string;
  server: string;
}

/** MCP资源内容 */
export interface McpResourceContent {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    /** base64编码的二进制内容 */
    blob?: string;
  }>;
}

/**
 * McpResourceProvider — MCP资源访问宿主注入
 *
 * 工具通过此接口列出和读取MCP服务器资源。
 * ai-mcp的McpServerConnection可作为真实宿主后端。
 */
export interface McpResourceProvider {
  /** 列出MCP服务器资源，server为空时列出所有服务器 */
  listResources(server?: string): Promise<McpResourceEntry[]>;
  /** 读取MCP服务器资源 */
  readResource(server: string, uri: string): Promise<McpResourceContent>;
}