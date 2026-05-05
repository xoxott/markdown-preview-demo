/** P93 测试 — MCP Server 端实现 */

import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { McpServerHost } from '../server/McpServerHost';
import { McpServerBuilder } from '../server/McpServerBuilder';
import {
  createStdioServerTransport,
  createStreamableHttpServerTransport
} from '../server/McpServerTransports';
import { createLinkedTransportPair } from '../transport/InProcessTransport';

// ============================================================
// McpServerHost 测试
// ============================================================

describe('McpServerHost', () => {
  it('创建 — serverInfo 名称和版本', () => {
    const host = new McpServerHost({
      serverInfo: { name: 'test-server', version: '1.0.0' }
    });

    expect(host.server).toBeDefined();
    expect(host.isConnected()).toBe(false);
  });

  it('创建 — 带选项 instructions', () => {
    const host = new McpServerHost({
      serverInfo: { name: 'my-server', version: '2.0.0' },
      options: { instructions: 'This is a test server' }
    });

    expect(host.server).toBeDefined();
  });

  it('registerTool — 注册工具并返回 RegisteredTool', () => {
    const host = new McpServerHost({
      serverInfo: { name: 'test-server', version: '1.0.0' }
    });

    const registered = host.registerTool(
      {
        name: 'echo',
        description: 'Echo input back',
        inputSchema: { message: z.string().describe('The message to echo') }
      },
      async args => ({
        content: [{ type: 'text' as const, text: String(args.message ?? '') }]
      })
    );

    expect(registered).toBeDefined();
    expect(registered.disable).toBeDefined();
    expect(registered.enable).toBeDefined();
    expect(registered.remove).toBeDefined();
  });

  it('registerResource — 注册资源并返回 RegisteredResource', () => {
    const host = new McpServerHost({
      serverInfo: { name: 'test-server', version: '1.0.0' }
    });

    const registered = host.registerResource(
      {
        name: 'config',
        uri: 'file:///config.json',
        description: 'Application configuration',
        mimeType: 'application/json'
      },
      async uri => ({
        contents: [{ uri: uri.toString(), mimeType: 'application/json', text: '{}' }]
      })
    );

    expect(registered).toBeDefined();
    expect(registered.name).toBe('config');
    expect(registered.disable).toBeDefined();
    expect(registered.enable).toBeDefined();
  });

  it('registerPrompt — 注册提示并返回 RegisteredPrompt', () => {
    const host = new McpServerHost({
      serverInfo: { name: 'test-server', version: '1.0.0' }
    });

    const registered = host.registerPrompt(
      {
        name: 'greet',
        description: 'Greet someone',
        argsSchema: { name: z.string().describe('Person name') }
      },
      async args => ({
        messages: [
          {
            role: 'user' as const,
            content: { type: 'text' as const, text: `Hello, ${args.name}!` }
          }
        ]
      })
    );

    expect(registered).toBeDefined();
    expect(registered.disable).toBeDefined();
    expect(registered.enable).toBeDefined();
  });

  it('connect — 连接 InProcessTransport', async () => {
    const host = new McpServerHost({
      serverInfo: { name: 'test-server', version: '1.0.0' }
    });

    host.registerTool(
      {
        name: 'ping',
        description: 'Ping tool'
      },
      async () => ({
        content: [{ type: 'text' as const, text: 'pong' }]
      })
    );

    const { serverTransport } = createLinkedTransportPair();
    await host.connect(serverTransport);

    expect(host.isConnected()).toBe(true);

    await host.close();
    expect(host.isConnected()).toBe(false);
  });

  it('sendToolListChanged — 发送通知', () => {
    const host = new McpServerHost({
      serverInfo: { name: 'test-server', version: '1.0.0' }
    });

    // 未连接时调用不应抛错
    host.sendToolListChanged();
  });

  it('sendResourceListChanged — 发送通知', () => {
    const host = new McpServerHost({
      serverInfo: { name: 'test-server', version: '1.0.0' }
    });

    host.sendResourceListChanged();
  });

  it('sendPromptListChanged — 发送通知', () => {
    const host = new McpServerHost({
      serverInfo: { name: 'test-server', version: '1.0.0' }
    });

    host.sendPromptListChanged();
  });
});

// ============================================================
// McpServerBuilder 测试
// ============================================================

describe('McpServerBuilder', () => {
  it('create — 创建 Builder', () => {
    const builder = McpServerBuilder.create('my-server', '1.0.0');
    expect(builder).toBeDefined();
  });

  it('withInstructions — 设置 instructions', () => {
    const builder = McpServerBuilder.create('my-server', '1.0.0').withInstructions(
      'Test server instructions'
    );

    expect(builder).toBeDefined();
  });

  it('withTool — 添加工具注册', () => {
    const builder = McpServerBuilder.create('my-server', '1.0.0').withTool(
      'echo',
      {
        description: 'Echo input',
        inputSchema: { message: z.string() }
      },
      async args => ({
        content: [{ type: 'text' as const, text: String(args.message ?? '') }]
      })
    );

    expect(builder).toBeDefined();
  });

  it('withResource — 添加资源注册', () => {
    const builder = McpServerBuilder.create('my-server', '1.0.0').withResource(
      'config',
      'file:///config.json',
      {
        mimeType: 'application/json'
      },
      async uri => ({
        contents: [{ uri: uri.toString(), mimeType: 'application/json', text: '{}' }]
      })
    );

    expect(builder).toBeDefined();
  });

  it('withPrompt — 添加提示注册', () => {
    const builder = McpServerBuilder.create('my-server', '1.0.0').withPrompt(
      'greet',
      {
        description: 'Greet someone',
        argsSchema: { name: z.string() }
      },
      async _args => ({
        messages: [{ role: 'user' as const, content: { type: 'text' as const, text: `Hello!` } }]
      })
    );

    expect(builder).toBeDefined();
  });

  it('build — 构建 McpServerHost', () => {
    const host = McpServerBuilder.create('my-server', '1.0.0')
      .withTool('ping', { description: 'Ping' }, async () => ({
        content: [{ type: 'text' as const, text: 'pong' }]
      }))
      .build();

    expect(host).toBeDefined();
    expect(host.isConnected()).toBe(false);
  });

  it('build — 多个工具注册', () => {
    const host = McpServerBuilder.create('my-server', '1.0.0')
      .withTool('tool_a', { description: 'Tool A' }, async () => ({
        content: [{ type: 'text' as const, text: 'A' }]
      }))
      .withTool('tool_b', { description: 'Tool B' }, async () => ({
        content: [{ type: 'text' as const, text: 'B' }]
      }))
      .withResource(
        'res1',
        'file:///data.json',
        {
          description: 'Data resource'
        },
        async uri => ({
          contents: [{ uri: uri.toString(), text: 'data' }]
        })
      )
      .withPrompt(
        'prompt1',
        {
          description: 'Test prompt'
        },
        async () => ({
          messages: [{ role: 'user' as const, content: { type: 'text' as const, text: 'test' } }]
        })
      )
      .build();

    expect(host).toBeDefined();
    expect(host.isConnected()).toBe(false);
  });

  it('connect — 构建 + 连接 InProcessTransport', async () => {
    const { serverTransport } = createLinkedTransportPair();

    const host = await McpServerBuilder.create('my-server', '1.0.0')
      .withTool('ping', { description: 'Ping' }, async () => ({
        content: [{ type: 'text' as const, text: 'pong' }]
      }))
      .connect(serverTransport);

    expect(host.isConnected()).toBe(true);

    await host.close();
    expect(host.isConnected()).toBe(false);
  });
});

// ============================================================
// McpServerTransports 测试
// ============================================================

describe('McpServerTransports', () => {
  it('createStdioServerTransport — 创建传输实例', () => {
    // 不实际 start（因为需要 stdin），只验证创建
    const transport = createStdioServerTransport();
    expect(transport).toBeDefined();
  });

  it('createStreamableHttpServerTransport — 创建传输实例', () => {
    const transport = createStreamableHttpServerTransport();
    expect(transport).toBeDefined();
  });

  it('createStreamableHttpServerTransport — 带选项', () => {
    const transport = createStreamableHttpServerTransport({
      options: {
        sessionIdGenerator: undefined // 无状态模式
      }
    });
    expect(transport).toBeDefined();
  });
});
