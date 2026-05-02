/** StdioTransport 测试 — spawn 子进程 + newline-delimited JSON 帧通信 */

import { describe, expect, it } from 'vitest';
import { StdioTransport } from '../transport/StdioTransport';
import { StdioTransportFactory } from '../transport/StdioTransportFactory';
import type { McpStdioServerConfig } from '../types/mcp-config';

/** 辅助：创建 echo MCP 服务器脚本 */
const ECHO_SERVER_SCRIPT = `
const lines = [];
let buf = '';
process.stdin.on('data', d => {
  buf += d.toString();
  const parts = buf.split('\\n');
  buf = parts.pop() || '';
  for (const line of parts.filter(l => l.trim())) {
    try {
      const m = JSON.parse(line);
      const response = { jsonrpc: '2.0', id: m.id, result: { echo: m.method ?? true } };
      process.stdout.write(JSON.stringify(response) + '\\n');
    } catch {}
  }
});
process.stdin.on('end', () => { process.exit(0); });
`;

/** 辅助：等待消息 */
function waitForMessage(transport: StdioTransport, timeoutMs = 2000): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('waitForMessage timeout')), timeoutMs);
    transport.onmessage = msg => {
      clearTimeout(timer);
      resolve(msg);
    };
  });
}

/** 辅助：等待 onclose */
function waitForClose(transport: StdioTransport, timeoutMs = 3000): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('waitForClose timeout')), timeoutMs);
    transport.onclose = () => {
      clearTimeout(timer);
      resolve();
    };
  });
}

describe('StdioTransport', () => {
  it('start → send → receive → close 基本生命周期', async () => {
    const config: McpStdioServerConfig = {
      command: 'node',
      args: ['-e', ECHO_SERVER_SCRIPT]
    };
    const transport = new StdioTransport(config);
    await transport.start();

    // 发送请求
    await transport.send({ jsonrpc: '2.0', id: 1, method: 'ping' });

    // 接收响应
    const response = await waitForMessage(transport);
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { echo: 'ping' }
    });

    // 关闭
    await transport.close();
  });

  it('close 前未 start → 不崩溃', async () => {
    const config: McpStdioServerConfig = { command: 'node', args: ['-e', '""'] };
    const transport = new StdioTransport(config);
    await transport.close();
    // 不抛错，幂等
  });

  it('双重 close → 幂等，不触发重复 onclose', async () => {
    const config: McpStdioServerConfig = {
      command: 'node',
      args: ['-e', 'process.exit(0)']
    };
    const transport = new StdioTransport(config);
    await transport.start();

    let closeCount = 0;
    transport.onclose = () => {
      closeCount++;
    };

    await transport.close();
    await transport.close();
    expect(closeCount).toBe(1);
  });

  it('close 后 send → 抛错', async () => {
    const config: McpStdioServerConfig = {
      command: 'node',
      args: ['-e', ECHO_SERVER_SCRIPT]
    };
    const transport = new StdioTransport(config);
    await transport.start();
    await transport.close();

    await expect(transport.send({ test: 1 })).rejects.toThrow(
      'StdioTransport is closed or not started'
    );
  });

  it('进程异常退出 → onerror', async () => {
    const config: McpStdioServerConfig = {
      command: 'node',
      args: ['-e', 'process.exit(1)']
    };
    const transport = new StdioTransport(config);

    const errorPromise = new Promise<Error>(resolve => {
      transport.onerror = (err: Error) => {
        resolve(err);
      };
    });

    await transport.start();
    const error = await errorPromise;
    expect(error.message).toContain('exited with code 1');
  });

  it('stderr 转发 → onStderrData 回调', async () => {
    const config: McpStdioServerConfig = {
      command: 'node',
      args: [
        '-e',
        'process.stderr.write("hello stderr\\n"); setTimeout(() => process.exit(0), 200)'
      ]
    };
    const stderrLines: string[] = [];
    const transport = new StdioTransport(config, {
      onStderrData: line => {
        stderrLines.push(line);
      }
    });

    await transport.start();
    await waitForClose(transport);
    expect(stderrLines).toContain('hello stderr');
  });

  it('多消息快速发送 → 全部接收', async () => {
    const config: McpStdioServerConfig = {
      command: 'node',
      args: ['-e', ECHO_SERVER_SCRIPT]
    };
    const transport = new StdioTransport(config);
    await transport.start();

    const received: unknown[] = [];
    transport.onmessage = msg => {
      received.push(msg);
    };

    await transport.send({ jsonrpc: '2.0', id: 1, method: 'a' });
    await transport.send({ jsonrpc: '2.0', id: 2, method: 'b' });
    await transport.send({ jsonrpc: '2.0', id: 3, method: 'c' });

    // 等待所有消息接收
    await new Promise(resolve => {
      setTimeout(resolve, 300);
    });

    expect(received).toHaveLength(3);
    expect(received.map(r => (r as any).id)).toEqual([1, 2, 3]);

    await transport.close();
  });
});

describe('StdioTransportFactory', () => {
  it('stdio config → 创建 StdioTransport', async () => {
    const factory = new StdioTransportFactory();
    const config: McpStdioServerConfig = { command: 'node', args: ['-e', '""'] };
    const transport = await factory.createTransport('test-server', config);
    expect(transport).toBeInstanceOf(StdioTransport);
  });

  it('sdk config → 创建 InProcessTransport pair 的 clientTransport', async () => {
    const factory = new StdioTransportFactory();
    const transport = await factory.createTransport('sdk-server', {
      type: 'sdk',
      name: 'sdk-server'
    });
    // InProcessTransport 实例不是 StdioTransport
    expect(transport).not.toBeInstanceOf(StdioTransport);
  });

  it('sse config → throw unsupported', async () => {
    const factory = new StdioTransportFactory();
    await expect(
      factory.createTransport('sse-server', { type: 'sse', url: 'http://localhost:8080' })
    ).rejects.toThrow('unsupported MCP transport type');
  });
});
