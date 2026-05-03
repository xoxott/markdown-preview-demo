/** UnifiedTransportFactory 测试 — P40 统一传输工厂 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpHTTPServerConfig, McpSSEServerConfig, McpServerConfig } from '../types/mcp-config';
import { UnifiedTransportFactory } from '../transport/UnifiedTransportFactory';

// Mock SDK transports (与 SSETransportAdapter/StreamableHTTPTransportAdapter 测试一致的class mock)
vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => {
  return {
    SSEClientTransport: class MockSSEClientTransport {
      onmessage?: (message: unknown) => void;
      onerror?: (error: Error) => void;
      onclose?: () => void;
      // eslint-disable-next-line @typescript-eslint/no-useless-constructor
      constructor(_url: URL, _options?: unknown) {}
      async start() {}
      async send(_message: unknown) {}
      async close() {}
    }
  };
});

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
  return {
    StreamableHTTPClientTransport: class MockStreamableHTTPClientTransport {
      onmessage?: (message: unknown) => void;
      onerror?: (error: Error) => void;
      onclose?: () => void;
      sessionId?: string;
      // eslint-disable-next-line @typescript-eslint/no-useless-constructor
      constructor(_url: URL, _options?: unknown) {}
      async start() {}
      async send(_message: unknown) {}
      async close() {}
      async terminateSession() {}
    }
  };
});

describe('UnifiedTransportFactory', () => {
  let factory: UnifiedTransportFactory;

  beforeEach(() => {
    factory = new UnifiedTransportFactory();
  });

  it('stdio → StdioTransport', async () => {
    const config: McpServerConfig = {
      command: 'node',
      args: ['server.js']
    };
    const transport = await factory.createTransport('test-stdio', config);
    expect(transport).toBeDefined();
    expect(typeof transport.start).toBe('function');
  });

  it('stdio (explicit type) → StdioTransport', async () => {
    const config: McpServerConfig = {
      type: 'stdio',
      command: 'node',
      args: ['server.js']
    };
    const transport = await factory.createTransport('test-stdio-explicit', config);
    expect(transport).toBeDefined();
  });

  it('sdk → InProcessTransport', async () => {
    const config: McpServerConfig = {
      type: 'sdk',
      name: 'test-sdk'
    };
    const transport = await factory.createTransport('test-sdk', config);
    expect(transport).toBeDefined();
  });

  it('sse → SSETransportAdapter', async () => {
    const config: McpSSEServerConfig = {
      type: 'sse',
      url: 'http://localhost:3001/sse'
    };
    const transport = await factory.createTransport('test-sse', config);
    expect(transport).toBeDefined();
    expect(typeof transport.start).toBe('function');
  });

  it('sse-ide → SSETransportAdapter', async () => {
    const config: McpServerConfig = {
      type: 'sse-ide',
      url: 'http://localhost:3001/sse',
      ideName: 'vscode'
    };
    const transport = await factory.createTransport('test-sse-ide', config);
    expect(transport).toBeDefined();
  });

  it('http → StreamableHTTPTransportAdapter', async () => {
    const config: McpHTTPServerConfig = {
      type: 'http',
      url: 'http://localhost:3001/mcp'
    };
    const transport = await factory.createTransport('test-http', config);
    expect(transport).toBeDefined();
    expect(typeof transport.start).toBe('function');
  });

  it('ws → throw unsupported', async () => {
    const config: McpServerConfig = {
      type: 'ws',
      url: 'ws://localhost:3001/ws'
    };
    await expect(factory.createTransport('test-ws', config)).rejects.toThrow('unsupported');
  });

  it('ws-ide → throw unsupported', async () => {
    const config: McpServerConfig = {
      type: 'ws-ide',
      url: 'ws://localhost:3001/ws',
      ideName: 'vscode'
    };
    await expect(factory.createTransport('test-ws-ide', config)).rejects.toThrow('unsupported');
  });

  it('remoteOptions: fetchOverride传递到SSE适配器', async () => {
    const customFetch = vi.fn(async () => new Response('{}', { status: 200 }));
    const factoryWithOptions = new UnifiedTransportFactory({ fetchOverride: customFetch });
    const config: McpSSEServerConfig = {
      type: 'sse',
      url: 'http://localhost:3001/sse'
    };
    const transport = await factoryWithOptions.createTransport('test-sse-custom', config);
    expect(transport).toBeDefined();
  });

  it('remoteOptions: fetchOverride传递到HTTP适配器', async () => {
    const customFetch = vi.fn(async () => new Response('{}', { status: 200 }));
    const factoryWithOptions = new UnifiedTransportFactory({ fetchOverride: customFetch });
    const config: McpHTTPServerConfig = {
      type: 'http',
      url: 'http://localhost:3001/mcp'
    };
    const transport = await factoryWithOptions.createTransport('test-http-custom', config);
    expect(transport).toBeDefined();
  });
});
