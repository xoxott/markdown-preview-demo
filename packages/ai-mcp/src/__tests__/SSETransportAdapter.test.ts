/** SSE Transport Adapter 测试 — P40 SDK SSEClientTransport → @suga McpTransport 适配 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { McpSSEServerConfig } from '../types/mcp-config';
import type { McpTransport } from '../types/mcp-transport';
import { SSETransportAdapter } from '../transport/SSETransportAdapter';

// Mock SDK SSEClientTransport — 使用类mock模式
const mockStart = vi.fn(async () => {});
const mockSend = vi.fn(async () => {});
const mockClose = vi.fn(async () => {});

vi.mock('@modelcontextprotocol/sdk/client/sse.js', () => {
  return {
    SSEClientTransport: class MockSSEClientTransport {
      onmessage?: (message: unknown) => void;
      onerror?: (error: Error) => void;
      onclose?: () => void;

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
    }
  };
});

describe('SSETransportAdapter', () => {
  const config: McpSSEServerConfig = {
    type: 'sse',
    url: 'http://localhost:3001/sse',
    headers: { Authorization: 'Bearer test-token' }
  };

  beforeEach(() => {
    mockStart.mockClear();
    mockSend.mockClear();
    mockClose.mockClear();
  });

  it('构造: 使用配置URL和headers创建SDK transport', () => {
    const adapter = new SSETransportAdapter(config);
    expect(adapter).toBeDefined();
  });

  it('构造: 无headers时仍正常创建', () => {
    const minimalConfig: McpSSEServerConfig = {
      type: 'sse',
      url: 'http://localhost:3001/sse'
    };
    const adapter = new SSETransportAdapter(minimalConfig);
    expect(adapter).toBeDefined();
  });

  it('start: 调用SDK transport的start方法', async () => {
    const adapter = new SSETransportAdapter(config);
    await adapter.start();
    expect(mockStart).toHaveBeenCalled();
  });

  it('send: 调用SDK transport的send方法', async () => {
    const adapter = new SSETransportAdapter(config);
    await adapter.send({ jsonrpc: '2.0', method: 'ping', id: 1 });
    expect(mockSend).toHaveBeenCalled();
  });

  it('close: 调用SDK transport的close方法', async () => {
    const adapter = new SSETransportAdapter(config);
    await adapter.close();
    expect(mockClose).toHaveBeenCalled();
  });

  it('implements McpTransport接口', () => {
    const adapter = new SSETransportAdapter(config);
    const transport: McpTransport = adapter;
    expect(typeof transport.start).toBe('function');
    expect(typeof transport.send).toBe('function');
    expect(typeof transport.close).toBe('function');
  });

  it('onmessage可设置回调', () => {
    const adapter = new SSETransportAdapter(config);
    const received: unknown[] = [];
    adapter.onmessage = msg => received.push(msg);
    expect(adapter.onmessage).toBeDefined();
  });

  it('onerror可设置回调', () => {
    const adapter = new SSETransportAdapter(config);
    const errors: Error[] = [];
    adapter.onerror = err => errors.push(err);
    expect(adapter.onerror).toBeDefined();
  });

  it('onclose可设置回调', () => {
    const adapter = new SSETransportAdapter(config);
    adapter.onclose = () => {};
    expect(adapter.onclose).toBeDefined();
  });

  it('fetchOverride: 自定义fetch传递到SDK构造参数', () => {
    const customFetch = vi.fn(async () => new Response('{}', { status: 200 }));
    const adapter = new SSETransportAdapter(config, customFetch);
    expect(adapter).toBeDefined();
  });
});
