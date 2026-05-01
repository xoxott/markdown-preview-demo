/** MCP 配置类型测试 — 7种传输配置 Zod schema */

import { describe, expect, it } from 'vitest';
import {
  McpHTTPServerConfigSchema,
  McpJsonConfigSchema,
  McpSSEIDEServerConfigSchema,
  McpSSEServerConfigSchema,
  McpSdkServerConfigSchema,
  McpServerConfigSchema,
  McpStdioServerConfigSchema,
  McpWebSocketIDEServerConfigSchema,
  McpWebSocketServerConfigSchema
} from '../types/mcp-config';
import type {
  McpSSEServerConfig,
  McpServerConfig,
  McpStdioServerConfig
} from '../types/mcp-config';

describe('McpStdioServerConfigSchema', () => {
  it('有效 stdio 配置（含 type）', () => {
    const result = McpStdioServerConfigSchema.safeParse({
      type: 'stdio',
      command: 'node',
      args: ['server.js']
    });
    expect(result.success).toBe(true);
  });

  it('有效 stdio 配置（无 type，向后兼容）', () => {
    const result = McpStdioServerConfigSchema.safeParse({
      command: 'node',
      args: ['server.js']
    });
    expect(result.success).toBe(true);
  });

  it('空命令 → 验证失败', () => {
    const result = McpStdioServerConfigSchema.safeParse({
      type: 'stdio',
      command: ''
    });
    expect(result.success).toBe(false);
  });

  it('带 env', () => {
    const result = McpStdioServerConfigSchema.safeParse({
      command: 'node',
      args: [],
      env: { API_KEY: '123' }
    });
    expect(result.success).toBe(true);
  });
});

describe('McpSSEServerConfigSchema', () => {
  it('有效 SSE 配置', () => {
    const result = McpSSEServerConfigSchema.safeParse({
      type: 'sse',
      url: 'http://localhost:3000/sse'
    });
    expect(result.success).toBe(true);
  });

  it('带 headers', () => {
    const result = McpSSEServerConfigSchema.safeParse({
      type: 'sse',
      url: 'http://localhost:3000/sse',
      headers: { Authorization: 'Bearer token' }
    });
    expect(result.success).toBe(true);
  });

  it('带 oauth', () => {
    const result = McpSSEServerConfigSchema.safeParse({
      type: 'sse',
      url: 'http://localhost:3000/sse',
      oauth: { clientId: 'my-client' }
    });
    expect(result.success).toBe(true);
  });
});

describe('McpHTTPServerConfigSchema', () => {
  it('有效 HTTP 配置', () => {
    const result = McpHTTPServerConfigSchema.safeParse({
      type: 'http',
      url: 'http://localhost:3000/mcp'
    });
    expect(result.success).toBe(true);
  });
});

describe('McpWebSocketServerConfigSchema', () => {
  it('有效 WebSocket 配置', () => {
    const result = McpWebSocketServerConfigSchema.safeParse({
      type: 'ws',
      url: 'ws://localhost:3000/ws'
    });
    expect(result.success).toBe(true);
  });
});

describe('McpSSEIDEServerConfigSchema', () => {
  it('有效 SSE-IDE 配置', () => {
    const result = McpSSEIDEServerConfigSchema.safeParse({
      type: 'sse-ide',
      url: 'http://localhost:3000/sse',
      ideName: 'vscode'
    });
    expect(result.success).toBe(true);
  });
});

describe('McpWebSocketIDEServerConfigSchema', () => {
  it('有效 WebSocket-IDE 配置', () => {
    const result = McpWebSocketIDEServerConfigSchema.safeParse({
      type: 'ws-ide',
      url: 'ws://localhost:3000/ws',
      ideName: 'vscode',
      authToken: 'token123'
    });
    expect(result.success).toBe(true);
  });
});

describe('McpSdkServerConfigSchema', () => {
  it('有效 SDK 配置', () => {
    const result = McpSdkServerConfigSchema.safeParse({
      type: 'sdk',
      name: 'my-server'
    });
    expect(result.success).toBe(true);
  });
});

describe('McpServerConfigSchema (union)', () => {
  it('识别 stdio 配置', () => {
    const result = McpServerConfigSchema.safeParse({
      command: 'node',
      args: ['server.js']
    });
    expect(result.success).toBe(true);
  });

  it('识别 SSE 配置', () => {
    const result = McpServerConfigSchema.safeParse({
      type: 'sse',
      url: 'http://localhost:3000/sse'
    });
    expect(result.success).toBe(true);
  });

  it('识别 HTTP 配置', () => {
    const result = McpServerConfigSchema.safeParse({
      type: 'http',
      url: 'http://localhost:3000/mcp'
    });
    expect(result.success).toBe(true);
  });

  it('识别 SDK 配置', () => {
    const result = McpServerConfigSchema.safeParse({
      type: 'sdk',
      name: 'my-server'
    });
    expect(result.success).toBe(true);
  });

  it('无效配置 → 失败', () => {
    const result = McpServerConfigSchema.safeParse({
      type: 'invalid'
    });
    expect(result.success).toBe(false);
  });
});

describe('McpJsonConfigSchema', () => {
  it('有效 .mcp.json', () => {
    const result = McpJsonConfigSchema.safeParse({
      mcpServers: {
        myServer: {
          command: 'node',
          args: ['server.js']
        }
      }
    });
    expect(result.success).toBe(true);
  });

  it('空 mcpServers', () => {
    const result = McpJsonConfigSchema.safeParse({
      mcpServers: {}
    });
    expect(result.success).toBe(true);
  });

  it('无效服务器配置 → 失败', () => {
    const result = McpJsonConfigSchema.safeParse({
      mcpServers: {
        myServer: { type: 'invalid' }
      }
    });
    expect(result.success).toBe(false);
  });
});

describe('McpServerConfig 类型窄化', () => {
  it('stdio 配置窄化', () => {
    const config: McpServerConfig = { command: 'node', args: [] };
    if (config.type === undefined || config.type === 'stdio') {
      const stdio = config as McpStdioServerConfig;
      expect(stdio.command).toBe('node');
    }
  });

  it('SSE 配置窄化', () => {
    const config: McpServerConfig = { type: 'sse', url: 'http://example.com' };
    if (config.type === 'sse') {
      const sse = config as McpSSEServerConfig;
      expect(sse.url).toBe('http://example.com');
    }
  });
});
