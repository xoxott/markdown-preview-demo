/**
 * StreamableHTTP Transport Adapter 测试 — P40 SDK StreamableHTTPClientTransport → @suga McpTransport
 * 适配
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpHTTPServerConfig } from '../types/mcp-config';
import type { McpTransport } from '../types/mcp-transport';
import { StreamableHTTPTransportAdapter } from '../transport/StreamableHTTPTransportAdapter';

// Mock SDK StreamableHTTPClientTransport — 使用类mock模式
const mockStart = vi.fn(async () => {});
const mockSend = vi.fn(async () => {});
const mockClose = vi.fn(async () => {});
const mockTerminateSession = vi.fn(async () => {});

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => {
  return {
    StreamableHTTPClientTransport: class MockStreamableHTTPClientTransport {
      onmessage?: (message: unknown) => void;
      onerror?: (error: Error) => void;
      onclose?: () => void;
      sessionId?: string;

      // eslint-disable-next-line @typescript-eslint/no-useless-constructor
      constructor(_url: URL, _options?: unknown) {}

      async start() {
        mockStart();
      }
      async send(_message: unknown) {
        mockSend();
      }
      async close() {
        mockClose();
      }
      async terminateSession() {
        mockTerminateSession();
      }
    }
  };
});

describe('StreamableHTTPTransportAdapter', () => {
  const config: McpHTTPServerConfig = {
    type: 'http',
    url: 'http://localhost:3001/mcp',
    headers: { Authorization: 'Bearer test-token' }
  };

  beforeEach(() => {
    mockStart.mockClear();
    mockSend.mockClear();
    mockClose.mockClear();
    mockTerminateSession.mockClear();
  });

  it('构造: 使用配置URL和headers创建SDK transport', () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    expect(adapter).toBeDefined();
  });

  it('构造: 无headers时仍正常创建', () => {
    const minimalConfig: McpHTTPServerConfig = {
      type: 'http',
      url: 'http://localhost:3001/mcp'
    };
    const adapter = new StreamableHTTPTransportAdapter(minimalConfig);
    expect(adapter).toBeDefined();
  });

  it('start: 调用SDK transport的start方法', async () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    await adapter.start();
    expect(mockStart).toHaveBeenCalled();
  });

  it('send: 调用SDK transport的send方法', async () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    await adapter.send({ jsonrpc: '2.0', method: 'ping', id: 1 });
    expect(mockSend).toHaveBeenCalled();
  });

  it('close: 调用SDK transport的close方法', async () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    await adapter.close();
    expect(mockClose).toHaveBeenCalled();
  });

  it('sessionId: 默认返回undefined', () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    expect(adapter.sessionId).toBeUndefined();
  });

  it('terminateSession: 调用SDK的terminateSession', async () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    await adapter.terminateSession();
    expect(mockTerminateSession).toHaveBeenCalled();
  });

  it('implements McpTransport接口', () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    const transport: McpTransport = adapter;
    expect(typeof transport.start).toBe('function');
    expect(typeof transport.send).toBe('function');
    expect(typeof transport.close).toBe('function');
  });

  it('onmessage可设置回调', () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    adapter.onmessage = _msg => {};
    expect(adapter.onmessage).toBeDefined();
  });

  it('onerror可设置回调', () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    // eslint-disable-next-line n/handle-callback-err, @typescript-eslint/no-unused-vars
    adapter.onerror = _err => {};
    expect(adapter.onerror).toBeDefined();
  });

  it('onclose可设置回调', () => {
    const adapter = new StreamableHTTPTransportAdapter(config);
    adapter.onclose = () => {};
    expect(adapter.onclose).toBeDefined();
  });

  it('fetchOverride: 自定义fetch传递到SDK构造参数', () => {
    const customFetch = vi.fn(async () => new Response('{}', { status: 200 }));
    const adapter = new StreamableHTTPTransportAdapter(config, customFetch);
    expect(adapter).toBeDefined();
  });
});
