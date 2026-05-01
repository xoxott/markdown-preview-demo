/** MockMcpProvider — 测试用的 MCP 命令模拟 */

import type { McpCommandProvider, McpServerConfig, McpServerEntry } from '../../types/providers';

const DEFAULT_SERVERS: McpServerEntry[] = [
  { name: 'filesystem', state: 'connected', configType: 'stdio', error: undefined },
  { name: 'github', state: 'connected', configType: 'stdio', error: undefined },
  { name: 'postgres', state: 'failed', configType: 'stdio', error: 'Connection refused' }
];

export class MockMcpProvider implements McpCommandProvider {
  private _servers: McpServerEntry[] = DEFAULT_SERVERS;
  private _added: Map<string, McpServerConfig> = new Map();
  private _removed: Set<string> = new Set();
  private _restarted: Set<string> = new Set();

  setServers(servers: McpServerEntry[]): this {
    this._servers = servers;
    return this;
  }

  async listServers(): Promise<McpServerEntry[]> {
    return this._servers;
  }

  async addServer(name: string, config: McpServerConfig): Promise<void> {
    this._added.set(name, config);
    this._servers.push({ name, state: 'pending', configType: config.type });
  }

  async removeServer(name: string): Promise<void> {
    this._removed.add(name);
    this._servers = this._servers.filter(s => s.name !== name);
  }

  async restartServer(name: string): Promise<void> {
    this._restarted.add(name);
  }

  /** 测试辅助 */
  getAdded(): Map<string, McpServerConfig> {
    return this._added;
  }

  getRemoved(): Set<string> {
    return this._removed;
  }

  getRestarted(): Set<string> {
    return this._restarted;
  }
}
