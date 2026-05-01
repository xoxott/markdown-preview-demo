/** @suga/ai-sdk — 公开API函数验证 */

import { describe, expect, it } from 'vitest';

describe('@suga/ai-sdk — 公开API函数', () => {
  it('query() — stub模式抛出错误', async () => {
    const { query } = await import('../index');
    expect(() => query('hello')).toThrow('not implemented');
  });

  it('unstable_v2_prompt() — stub模式抛出错误', async () => {
    const { unstable_v2_prompt } = await import('../index');
    expect(() => unstable_v2_prompt('hello')).toThrow('not implemented');
  });

  it('unstable_v2_createSession() — stub模式抛出错误', async () => {
    const { unstable_v2_createSession } = await import('../index');
    expect(() => unstable_v2_createSession()).toThrow('not implemented');
  });

  it('unstable_v2_resumeSession() — stub模式抛出错误', async () => {
    const { unstable_v2_resumeSession } = await import('../index');
    expect(() => unstable_v2_resumeSession('sess_001')).toThrow('not implemented');
  });

  it('getSessionMessages() — stub模式抛出错误', async () => {
    const { getSessionMessages } = await import('../index');
    expect(() => getSessionMessages('sess_001')).toThrow('not implemented');
  });

  it('listSessions() — stub模式抛出错误', async () => {
    const { listSessions } = await import('../index');
    expect(() => listSessions()).toThrow('not implemented');
  });

  it('getSessionInfo() — stub模式抛出错误', async () => {
    const { getSessionInfo } = await import('../index');
    expect(() => getSessionInfo('sess_001')).toThrow('not implemented');
  });

  it('renameSession() — stub模式抛出错误', async () => {
    const { renameSession } = await import('../index');
    expect(() => renameSession('sess_001', 'New Title')).toThrow('not implemented');
  });

  it('tagSession() — stub模式抛出错误', async () => {
    const { tagSession } = await import('../index');
    expect(() => tagSession('sess_001', 'important')).toThrow('not implemented');
  });

  it('forkSession() — stub模式抛出错误', async () => {
    const { forkSession } = await import('../index');
    expect(() => forkSession('sess_001')).toThrow('not implemented');
  });

  it('tool() — 具体实现可用', async () => {
    const z = await import('zod/v4');
    const { tool } = await import('../index');
    const t = tool('test', 'A test tool', z.z.string(), async s => s);
    expect(t.name).toBe('test');
    expect(typeof t.handler).toBe('function');
  });

  it('createSdkMcpServer() — 具体实现可用', async () => {
    const z = await import('zod/v4');
    const { tool, createSdkMcpServer } = await import('../index');
    const t = tool('t1', 'desc', z.z.string(), async s => s);
    const server = createSdkMcpServer({ name: 'my-server', version: '1.0.0', tools: [t] });
    expect(server.type).toBe('sdk');
    expect(server.name).toBe('my-server');
  });

  it('SDKAbortError — 可创建', async () => {
    const { SDKAbortError } = await import('../index');
    const err = new SDKAbortError();
    expect(err.name).toBe('SDKAbortError');
    expect(err.message).toBe('Operation aborted');
  });

  it('常量导出可用', async () => {
    const { HOOK_EVENTS, EXIT_REASONS, PERMISSION_MODES } = await import('../index');
    expect(HOOK_EVENTS.length).toBe(27);
    expect(EXIT_REASONS.length).toBe(6);
    expect(PERMISSION_MODES.length).toBe(6);
    expect(HOOK_EVENTS).toContain('PreToolUse');
    expect(EXIT_REASONS).toContain('complete');
    expect(PERMISSION_MODES).toContain('default');
  });
});
