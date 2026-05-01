/** MCP 工具/服务器名称字符串工具函数测试 */

import { describe, expect, it } from 'vitest';
import {
  buildMcpToolName,
  extractMcpToolDisplayName,
  getMcpDisplayName,
  getMcpPrefix,
  getToolNameForPermissionCheck,
  mcpInfoFromString
} from '../naming/mcpStringUtils';

describe('mcpInfoFromString', () => {
  it('有效 MCP 工具名 → 返回服务器名+工具名', () => {
    const result = mcpInfoFromString('mcp__github__create_issue');
    expect(result).toEqual({ serverName: 'github', toolName: 'create_issue' });
  });

  it('仅服务器前缀 → 工具名空字符串', () => {
    const result = mcpInfoFromString('mcp__github__');
    expect(result?.serverName).toBe('github');
    expect(result?.toolName).toBe('');
  });

  it('非 MCP 格式 → null', () => {
    expect(mcpInfoFromString('Bash')).toBeNull();
    expect(mcpInfoFromString('Write')).toBeNull();
    expect(mcpInfoFromString('')).toBeNull();
  });

  it('工具名含双下划线 → 保留', () => {
    const result = mcpInfoFromString('mcp__server__tool__name');
    expect(result).toEqual({ serverName: 'server', toolName: 'tool__name' });
  });
});

describe('getMcpPrefix', () => {
  it('返回正确前缀', () => {
    expect(getMcpPrefix('github')).toBe('mcp__github__');
  });

  it('规范化服务器名', () => {
    expect(getMcpPrefix('my server')).toBe('mcp__my_server__');
  });
});

describe('buildMcpToolName', () => {
  it('构建完整工具名', () => {
    expect(buildMcpToolName('github', 'create_issue')).toBe('mcp__github__create_issue');
  });

  it('规范化名称', () => {
    expect(buildMcpToolName('my server', 'my tool')).toBe('mcp__my_server__my_tool');
  });
});

describe('getMcpDisplayName', () => {
  it('去除 MCP 前缀', () => {
    expect(getMcpDisplayName('mcp__github__create_issue', 'github')).toBe('create_issue');
  });

  it('规范化服务器名后去除', () => {
    expect(getMcpDisplayName('mcp__my_server__my_tool', 'my server')).toBe('my_tool');
  });
});

describe('extractMcpToolDisplayName', () => {
  it('去除 (MCP) 后缀', () => {
    expect(extractMcpToolDisplayName('Create issue (MCP)')).toBe('Create issue');
  });

  it('去除服务器前缀和 (MCP)', () => {
    expect(extractMcpToolDisplayName('github - Add comment to issue (MCP)')).toBe(
      'Add comment to issue'
    );
  });

  it('仅去除 (MCP)', () => {
    expect(extractMcpToolDisplayName('My tool (MCP)')).toBe('My tool');
  });

  it('无后缀无前缀 → 返回原名', () => {
    expect(extractMcpToolDisplayName('My tool')).toBe('My tool');
  });
});

describe('getToolNameForPermissionCheck', () => {
  it('MCP 工具 → 使用完整 mcp__server__tool 名', () => {
    expect(
      getToolNameForPermissionCheck({
        name: 'Write',
        mcpInfo: { serverName: 'github', toolName: 'create_issue' }
      })
    ).toBe('mcp__github__create_issue');
  });

  it('非 MCP 工具 → 使用 tool.name', () => {
    expect(getToolNameForPermissionCheck({ name: 'Bash' })).toBe('Bash');
  });
});
