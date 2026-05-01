/** MCP 连接管理器测试 */

import { describe, expect, it } from 'vitest';
import { InMemoryMcpConnectionManager } from '../connection/McpConnectionManager';
import type { McpTransport, McpTransportFactory } from '../types/mcp-transport';
import type { ScopedMcpServerConfig } from '../types/mcp-scope';
import type { McpElicitResult, McpElicitationHandler } from '../types/mcp-elicitation';

const baseConfig: ScopedMcpServerConfig = { command: 'node', args: [], scope: 'user' };

/** Mock 传输工厂 */
function createMockTransportFactory(shouldFail = false): McpTransportFactory {
  return {
    createTransport: async () => {
      if (shouldFail) throw new Error('Connection failed');
      const transport: McpTransport = {
        start: async () => {},
        send: async () => {},
        close: async () => {}
      };
      return transport;
    }
  };
}

/** Mock Elicitation 处理器 */
function createMockElicitationHandler(
  defaultResult: McpElicitResult = { action: 'accept' }
): McpElicitationHandler {
  return {
    handleElicitation: async () => defaultResult
  };
}

describe('InMemoryMcpConnectionManager', () => {
  it('初始状态 → 无连接', () => {
    const manager = new InMemoryMcpConnectionManager();
    expect(manager.getConnections().size).toBe(0);
  });

  it('connect → 无传输工厂 → pending', async () => {
    const manager = new InMemoryMcpConnectionManager();
    await manager.connect('server1', baseConfig);
    const conn = manager.getConnections().get('server1');
    expect(conn?.type).toBe('pending');
  });

  it('connect → 有传输工厂 → connected', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    const conn = manager.getConnections().get('server1');
    expect(conn?.type).toBe('connected');
  });

  it('connect → 传输工厂失败 → failed', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(true));
    await manager.connect('server1', baseConfig);
    const conn = manager.getConnections().get('server1');
    expect(conn?.type).toBe('failed');
  });

  it('disconnect → 移除连接', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    await manager.disconnect('server1');
    expect(manager.getConnections().has('server1')).toBe(false);
  });

  it('markNeedsAuth → 状态变为 needs-auth', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    manager.markNeedsAuth('server1');
    const conn = manager.getConnections().get('server1');
    expect(conn?.type).toBe('needs-auth');
  });

  it('markAuthComplete → needs-auth 重新连接', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    manager.markNeedsAuth('server1');
    await manager.markAuthComplete('server1');
    const conn = manager.getConnections().get('server1');
    expect(conn?.type).toBe('connected');
  });

  it('reconnect → failed 重新连接', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    // 手动设为 failed
    manager.setTransportFactory(createMockTransportFactory(true));
    await manager.connect('server1', baseConfig); // 会失败
    expect(manager.getConnections().get('server1')?.type).toBe('failed');
    // 恢复成功工厂
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.reconnect('server1');
    expect(manager.getConnections().get('server1')?.type).toBe('connected');
  });

  it('reconnect → 非 failed 状态 → 无变化', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    await manager.reconnect('server1'); // connected, 不应变化
    expect(manager.getConnections().get('server1')?.type).toBe('connected');
  });

  it('onConnectionChange → 监听状态变化', async () => {
    const manager = new InMemoryMcpConnectionManager();
    const sizes: number[] = [];
    manager.onConnectionChange(conns => {
      sizes.push(conns.size);
    });
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    await manager.connect('server2', baseConfig);
    // connect 触发2次变化: pending→connected each
    // 所以 sizes 应为 [1,1,2,2] 或 [1,2] — 取决于是否pending也算
    expect(sizes.length).toBeGreaterThanOrEqual(2);
    expect(sizes[sizes.length - 1]).toBe(2);
  });

  it('onConnectionChange → 取消订阅', async () => {
    const manager = new InMemoryMcpConnectionManager();
    const sizes: number[] = [];
    const unsub = manager.onConnectionChange(conns => {
      sizes.push(conns.size);
    });
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    const sizeAfterFirst = sizes.length;
    unsub();
    await manager.connect('server2', baseConfig);
    // 取消订阅后不再收到变化
    expect(sizes.length).toBe(sizeAfterFirst);
  });

  it('setElicitationHandler → 设置处理器', () => {
    const manager = new InMemoryMcpConnectionManager();
    const handler = createMockElicitationHandler();
    manager.setElicitationHandler(handler);
    expect(manager.getElicitationHandler()).toBe(handler);
  });

  it('updateCapabilities → 更新连接能力', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('server1', baseConfig);
    manager.updateCapabilities('server1', { tools: {} }, { name: 'my-server', version: '1.0' });
    const conn = manager.getConnections().get('server1');
    expect(conn?.type).toBe('connected');
    if (conn?.type === 'connected') {
      expect(conn.capabilities.tools).toBeDefined();
      expect(conn.serverInfo?.name).toBe('my-server');
    }
  });

  it('多个服务器并发连接', async () => {
    const manager = new InMemoryMcpConnectionManager();
    manager.setTransportFactory(createMockTransportFactory(false));
    await manager.connect('s1', baseConfig);
    await manager.connect('s2', {
      type: 'sse',
      url: 'http://example.com',
      scope: 'project'
    } as ScopedMcpServerConfig);
    await manager.connect('s3', {
      type: 'sdk',
      name: 'in-process',
      scope: 'local'
    } as ScopedMcpServerConfig);
    expect(manager.getConnections().size).toBe(3);
  });
});
