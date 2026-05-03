/** WebSessionServer 测试 — HTTP API + WebSocket 桥接 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { WebSessionServer } from '../server/WebSessionServer';
import type { WebServerConfig, WebSessionInfo } from '../types/web-server';

/** 创建最小测试配置（不连接真实LLM） */
function createTestConfig(): WebServerConfig {
  return {
    port: 0, // 随机端口（测试不冲突）
    host: '127.0.0.1',
    corsOrigin: '*',
    runtimeConfig: {
      provider: {
        callModel: async function* callModel() {
          yield { textDelta: 'mock response', done: true };
        },
        formatToolDefinition() {
          return { name: 'mock', description: 'mock', inputSchema: {} };
        }
      },
      fsProvider: {
        stat: async () => ({
          exists: false,
          isFile: false,
          isDirectory: false,
          size: 0,
          mtimeMs: 0
        }),
        readFile: async () => '' as any,
        writeFile: async () => {},
        editFile: async () => ({ success: true }) as any,
        glob: async () => [],
        grep: async () => ({ results: [], truncated: false }) as any,
        ls: async () => [],
        runCommand: async () => ({ stdout: '', stderr: '', exitCode: 0 }) as any
      }
    }
  };
}

/** 获取服务器实际端口 */
function getServerPort(server: WebSessionServer): number {
  return server.getAddress().port;
}

describe('WebSessionServer', () => {
  let server: WebSessionServer;

  beforeEach(async () => {
    server = new WebSessionServer(createTestConfig());
    await server.start();
  });

  afterEach(async () => {
    await server.shutdown();
  });

  it('启动后应监听端口', () => {
    expect(server.isStarted()).toBe(true);
    const port = getServerPort(server);
    expect(port).toBeGreaterThan(0);
  });

  it('POST /sessions → 创建会话返回 sessionId + wsUrl', async () => {
    const port = getServerPort(server);
    const res = await fetch(`http://127.0.0.1:${port}/sessions`, {
      method: 'POST'
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as WebSessionInfo;
    expect(body.sessionId).toBeDefined();
    expect(body.sessionId.startsWith('web_sess_')).toBe(true);
    expect(body.wsUrl).toBeDefined();
    expect(body.status).toBe('starting');
  });

  it('GET /sessions → 列出活跃会话', async () => {
    const port = getServerPort(server);

    // 先创建一个会话
    await fetch(`http://127.0.0.1:${port}/sessions`, { method: 'POST' });

    const res = await fetch(`http://127.0.0.1:${port}/sessions`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as WebSessionInfo[];
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /sessions/:id → 获取单个会话信息', async () => {
    const port = getServerPort(server);

    const createRes = await fetch(`http://127.0.0.1:${port}/sessions`, { method: 'POST' });
    const createBody = (await createRes.json()) as WebSessionInfo;

    const res = await fetch(`http://127.0.0.1:${port}/sessions/${createBody.sessionId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as WebSessionInfo;
    expect(body.sessionId).toBe(createBody.sessionId);
  });

  it('GET /sessions/:id → 404 不存在的会话', async () => {
    const port = getServerPort(server);

    const res = await fetch(`http://127.0.0.1:${port}/sessions/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('DELETE /sessions/:id → 停止会话', async () => {
    const port = getServerPort(server);

    const createRes = await fetch(`http://127.0.0.1:${port}/sessions`, { method: 'POST' });
    const createBody = (await createRes.json()) as WebSessionInfo;

    const res = await fetch(`http://127.0.0.1:${port}/sessions/${createBody.sessionId}`, {
      method: 'DELETE'
    });
    expect(res.status).toBe(204);
  });

  it('OPTIONS → CORS preflight 204', async () => {
    const port = getServerPort(server);

    const res = await fetch(`http://127.0.0.1:${port}/sessions`, {
      method: 'OPTIONS'
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('404 → 未匹配路由', async () => {
    const port = getServerPort(server);

    const res = await fetch(`http://127.0.0.1:${port}/unknown`);
    expect(res.status).toBe(404);
  });

  it('WebSocket连接 → 收到 session_info', async () => {
    const port = getServerPort(server);
    const wsUrl = `ws://127.0.0.1:${port}`;

    const ws = new WebSocket(wsUrl);
    const received: unknown[] = [];

    ws.on('message', data => {
      received.push(JSON.parse(data.toString()));
    });

    // 等待连接和初始消息
    await new Promise<void>(resolve => {
      ws.on('open', () => {
        setTimeout(resolve, 100);
      });
    });

    expect(received.length).toBeGreaterThan(0);
    const firstMsg = received[0] as { type: string };
    expect(firstMsg.type).toBe('session_info');

    ws.close();
  });

  it('WebSocket + sessionId → 关联到已有会话', async () => {
    const port = getServerPort(server);

    // 先创建会话
    const createRes = await fetch(`http://127.0.0.1:${port}/sessions`, { method: 'POST' });
    const createBody = (await createRes.json()) as WebSessionInfo;

    // 用 sessionId 连接
    const ws = new WebSocket(`ws://127.0.0.1:${port}?sessionId=${createBody.sessionId}`);
    const received: unknown[] = [];

    ws.on('message', data => {
      received.push(JSON.parse(data.toString()));
    });

    await new Promise<void>(resolve => {
      ws.on('open', () => {
        setTimeout(resolve, 100);
      });
    });

    // 应收到 session_info 且 sessionId 匹配
    const firstMsg = received[0] as { type: string; info: { sessionId: string } };
    expect(firstMsg.type).toBe('session_info');
    expect(firstMsg.info.sessionId).toBe(createBody.sessionId);

    ws.close();
  });

  it('authToken → 未认证请求401', async () => {
    const authConfig: WebServerConfig = {
      ...createTestConfig(),
      authToken: 'test-secret-token'
    };
    const authServer = new WebSessionServer(authConfig);
    await authServer.start();
    const port = getServerPort(authServer);

    const res = await fetch(`http://127.0.0.1:${port}/sessions`, { method: 'POST' });
    expect(res.status).toBe(401);

    // 带认证 → 201
    const authRes = await fetch(`http://127.0.0.1:${port}/sessions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test-secret-token' }
    });
    expect(authRes.status).toBe(201);

    await authServer.shutdown();
  });
});
