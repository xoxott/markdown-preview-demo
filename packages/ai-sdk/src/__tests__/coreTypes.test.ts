/** @suga/ai-sdk — 核心类型导出完整性验证 */

import { describe, expect, it } from 'vitest';

// 类型导出完整性由tsc验证（0 errors即表示所有type export存在）
// 此测试文件验证值导出和schema导出

describe('@suga/ai-sdk — 核心类型导出', () => {
  it('tool()/createSdkMcpServer() 可用', async () => {
    const { tool, createSdkMcpServer } = await import('../index');
    expect(typeof tool).toBe('function');
    expect(typeof createSdkMcpServer).toBe('function');
  });

  it('SDKAbortError 类可用', async () => {
    const { SDKAbortError } = await import('../index');
    const err = new SDKAbortError('test abort');
    expect(err.name).toBe('SDKAbortError');
    expect(err.message).toBe('test abort');
  });

  it('tool() 创建工具定义', async () => {
    const z = await import('zod/v4');
    const { tool } = await import('../index');
    const t = tool('my_tool', 'A test tool', z.z.string(), async input => `Result: ${input}`);
    expect(t.name).toBe('my_tool');
    expect(t.description).toBe('A test tool');
  });

  it('createSdkMcpServer() 创建服务器配置', async () => {
    const z = await import('zod/v4');
    const { tool, createSdkMcpServer } = await import('../index');
    const t = tool('test_tool', 'desc', z.z.string(), async s => s);
    const server = createSdkMcpServer({ name: 'my-server', version: '1.0', tools: [t] });
    expect(server.type).toBe('sdk');
    expect(server.name).toBe('my-server');
    expect(server.version).toBe('1.0');
  });
});
