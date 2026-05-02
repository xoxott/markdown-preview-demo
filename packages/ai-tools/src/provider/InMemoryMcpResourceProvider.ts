/** InMemoryMcpResourceProvider — 内存MCP资源实现（测试+轻量宿主） */

import type {
  McpResourceContent,
  McpResourceEntry,
  McpResourceProvider
} from '../types/mcp-resource-provider';

export class InMemoryMcpResourceProvider implements McpResourceProvider {
  private resources = new Map<string, McpResourceEntry[]>();
  private contents = new Map<string, McpResourceContent>();

  registerResource(server: string, entry: McpResourceEntry): void {
    const existing = this.resources.get(server) ?? [];
    existing.push(entry);
    this.resources.set(server, existing);
  }

  registerContent(server: string, uri: string, content: McpResourceContent): void {
    this.contents.set(`${server}:${uri}`, content);
  }

  async listResources(server?: string): Promise<McpResourceEntry[]> {
    if (server) {
      return this.resources.get(server) ?? [];
    }
    // 列出所有服务器资源
    const all: McpResourceEntry[] = [];
    for (const entries of this.resources.values()) {
      all.push(...entries);
    }
    return all;
  }

  async readResource(server: string, uri: string): Promise<McpResourceContent> {
    const content = this.contents.get(`${server}:${uri}`);
    if (!content) {
      return { contents: [] };
    }
    return content;
  }

  reset(): void {
    this.resources.clear();
    this.contents.clear();
  }
}