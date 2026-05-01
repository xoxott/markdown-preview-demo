/** MCP 配置加载器纯函数测试 */

import { describe, expect, it } from 'vitest';
import {
  getMcpServerTransportType,
  getStdioCommandArray,
  isRemoteConfig,
  isStdioConfig,
  mergeScopedConfigs,
  validateMcpConfigScope,
  validateMcpJsonConfig,
  validateMcpServerConfig
} from '../connection/McpConfigLoader';
import type { McpServerConfig } from '../types/mcp-config';
import type { McpConfigScope } from '../types/mcp-scope';

describe('validateMcpServerConfig', () => {
  it('有效 stdio 配置', () => {
    const result = validateMcpServerConfig({ command: 'node', args: [] });
    expect(result.valid).toBe(true);
  });

  it('有效 SSE 配置', () => {
    const result = validateMcpServerConfig({ type: 'sse', url: 'http://example.com' });
    expect(result.valid).toBe(true);
  });

  it('无效配置 → 报告错误', () => {
    const result = validateMcpServerConfig({ type: 'invalid' });
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(0);
  });

  it('空命令 → 报告错误', () => {
    const result = validateMcpServerConfig({ command: '' });
    expect(result.valid).toBe(false);
  });

  it('null → 失败', () => {
    const result = validateMcpServerConfig(null);
    expect(result.valid).toBe(false);
  });
});

describe('validateMcpJsonConfig', () => {
  it('有效 JSON', () => {
    const result = validateMcpJsonConfig({ mcpServers: {} });
    expect(result.valid).toBe(true);
  });

  it('无效 JSON', () => {
    const result = validateMcpJsonConfig({ mcpServers: { bad: { type: 'invalid' } } });
    expect(result.valid).toBe(false);
  });
});

describe('validateMcpConfigScope', () => {
  it('有效 scope', () => {
    expect(validateMcpConfigScope('user').valid).toBe(true);
    expect(validateMcpConfigScope('enterprise').valid).toBe(true);
  });

  it('无效 scope', () => {
    expect(validateMcpConfigScope('invalid').valid).toBe(false);
  });
});

describe('getMcpServerTransportType', () => {
  it('stdio 配置（无 type）', () => {
    expect(getMcpServerTransportType({ command: 'node' })).toBe('stdio');
  });

  it('stdio 配置（有 type）', () => {
    expect(getMcpServerTransportType({ type: 'stdio', command: 'node' })).toBe('stdio');
  });

  it('SSE 配置', () => {
    expect(getMcpServerTransportType({ type: 'sse', url: 'http://example.com' })).toBe('sse');
  });

  it('HTTP 配置', () => {
    expect(getMcpServerTransportType({ type: 'http', url: 'http://example.com' })).toBe('http');
  });

  it('WebSocket 配置', () => {
    expect(getMcpServerTransportType({ type: 'ws', url: 'ws://example.com' })).toBe('ws');
  });

  it('SDK 配置', () => {
    expect(getMcpServerTransportType({ type: 'sdk', name: 'my-server' })).toBe('sdk');
  });
});

describe('isStdioConfig', () => {
  it('stdio（无 type）', () => {
    expect(isStdioConfig({ command: 'node' })).toBe(true);
  });

  it('stdio（有 type）', () => {
    expect(isStdioConfig({ type: 'stdio', command: 'node' })).toBe(true);
  });

  it('SSE → false', () => {
    expect(isStdioConfig({ type: 'sse', url: 'http://example.com' })).toBe(false);
  });
});

describe('isRemoteConfig', () => {
  it('stdio → false', () => {
    expect(isRemoteConfig({ command: 'node' })).toBe(false);
  });

  it('SSE → true', () => {
    expect(isRemoteConfig({ type: 'sse', url: 'http://example.com' })).toBe(true);
  });

  it('SDK → false', () => {
    expect(isRemoteConfig({ type: 'sdk', name: 'my-server' })).toBe(false);
  });
});

describe('getStdioCommandArray', () => {
  it('stdio → [command, ...args]', () => {
    expect(getStdioCommandArray({ command: 'node', args: ['server.js'] })).toEqual([
      'node',
      'server.js'
    ]);
  });

  it('stdio 无 args → [command]', () => {
    expect(getStdioCommandArray({ command: 'node' })).toEqual(['node']);
  });

  it('非 stdio → null', () => {
    expect(getStdioCommandArray({ type: 'sse', url: 'http://example.com' })).toBeNull();
  });
});

describe('mergeScopedConfigs', () => {
  it('合并多个 scope', () => {
    const result = mergeScopedConfigs({
      local: { localServer: { command: 'local-node' } },
      project: { projServer: { type: 'sse', url: 'http://proj.com' } },
      user: { userServer: { command: 'user-node' } }
    });
    expect(result.size).toBe(3);
    expect(result.get('localServer')?.scope).toBe('local');
    expect(result.get('projServer')?.scope).toBe('project');
    expect(result.get('userServer')?.scope).toBe('user');
  });

  it('高优先级覆盖低优先级同名服务器', () => {
    const result = mergeScopedConfigs({
      local: { shared: { command: 'local-node' } },
      user: { shared: { command: 'user-node' } }
    });
    expect(result.get('shared')?.scope).toBe('user');
    // user 优先级高于 local，所以 shared 是 user scope 的配置
  });

  it('空 scope → 无服务器', () => {
    const result = mergeScopedConfigs({
      local: {},
      user: {},
      project: {}
    });
    expect(result.size).toBe(0);
  });

  it('缺失 scope → 被跳过', () => {
    const result = mergeScopedConfigs({
      local: { s1: { command: 'node' } }
      // user 缺失
    } as Partial<Record<McpConfigScope, Record<string, McpServerConfig>>>);
    expect(result.size).toBe(1);
  });
});
