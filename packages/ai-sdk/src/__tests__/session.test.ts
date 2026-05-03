/** P46 测试 — SDK Session API 注入 + 管线 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionEngine, setSessionEngine } from '../api/sessionEngine';
import type { SessionEngineLike } from '../api/sessionEngine';
import {
  forkSession,
  getSessionInfo,
  getSessionMessages,
  listSessions,
  renameSession,
  tagSession,
  unstable_v2_createSession,
  unstable_v2_resumeSession
} from '../api/session';
import type { SDKSession } from '../sdk/runtimeTypes';
import type { SDKMessage, SDKSessionInfo } from '../sdk/sdkMessages';

// ============================================================
// Mock SessionEngine
// ============================================================

function createMockEngine(): SessionEngineLike {
  const mockSession: SDKSession = {
    sessionId: 'mock_session_1',
    prompt: vi.fn().mockImplementation(async function* mockPrompt(): AsyncIterable<SDKMessage> {
      yield {
        type: 'result',
        subtype: 'success',
        result: 'mock',
        duration_ms: 100,
        is_error: false,
        num_turns: 1
      };
    }),
    abort: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined)
  };

  return {
    createSession: vi.fn().mockResolvedValue(mockSession),
    resumeSession: vi.fn().mockResolvedValue(mockSession),
    getSessionMessages: vi.fn().mockResolvedValue([]),
    listSessions: vi.fn().mockResolvedValue([]),
    getSessionInfo: vi.fn().mockResolvedValue({
      sessionId: 'mock_session_1',
      createdAt: Date.now(),
      lastModified: Date.now(),
      fileSize: 0,
      firstPrompt: '',
      summary: undefined,
      gitBranch: undefined,
      cwd: undefined
    } as SDKSessionInfo),
    renameSession: vi.fn().mockResolvedValue(undefined),
    tagSession: vi.fn().mockResolvedValue(undefined),
    forkSession: vi.fn().mockResolvedValue({
      new_session_id: 'fork_1',
      session_id: 'mock_session_1'
    })
  };
}

describe('SDK Session API', () => {
  beforeEach(() => {
    // 每次测试前清除注入
    setSessionEngine(null as unknown as SessionEngineLike);
  });

  // === 未注入 → throw 错误 ===

  it('未注入 sessionEngine → unstable_v2_createSession throw', () => {
    expect(() => unstable_v2_createSession()).toThrow('call setSessionEngine() first');
  });

  it('未注入 sessionEngine → unstable_v2_resumeSession throw', () => {
    expect(() => unstable_v2_resumeSession('test')).toThrow('call setSessionEngine() first');
  });

  it('未注入 sessionEngine → getSessionMessages throw', () => {
    expect(() => getSessionMessages('test')).toThrow('call setSessionEngine() first');
  });

  it('未注入 sessionEngine → listSessions throw', () => {
    expect(() => listSessions()).toThrow('call setSessionEngine() first');
  });

  it('未注入 sessionEngine → renameSession throw', () => {
    expect(() => renameSession('test', 'title')).toThrow('call setSessionEngine() first');
  });

  // === 注入后 → 委托调用 ===

  it('setSessionEngine 注入 + unstable_v2_createSession 委托', async () => {
    const engine = createMockEngine();
    setSessionEngine(engine);

    const session = await unstable_v2_createSession();
    expect(session.sessionId).toBe('mock_session_1');
    expect(engine.createSession).toHaveBeenCalled();
  });

  it('setSessionEngine 注入 + unstable_v2_resumeSession 委托', async () => {
    const engine = createMockEngine();
    setSessionEngine(engine);

    const session = await unstable_v2_resumeSession('mock_session_1');
    expect(session.sessionId).toBe('mock_session_1');
    expect(engine.resumeSession).toHaveBeenCalledWith('mock_session_1');
  });

  it('setSessionEngine 注入 + getSessionMessages 委托', async () => {
    const engine = createMockEngine();
    setSessionEngine(engine);

    const messages = await getSessionMessages('mock_session_1');
    expect(messages).toEqual([]);
    expect(engine.getSessionMessages).toHaveBeenCalledWith('mock_session_1', undefined);
  });

  it('setSessionEngine 注入 + listSessions 委托', async () => {
    const engine = createMockEngine();
    setSessionEngine(engine);

    const sessions = await listSessions();
    expect(sessions).toEqual([]);
    expect(engine.listSessions).toHaveBeenCalled();
  });

  it('setSessionEngine 注入 + getSessionInfo 委托', async () => {
    const engine = createMockEngine();
    setSessionEngine(engine);

    const info = await getSessionInfo('mock_session_1');
    expect(info.sessionId).toBe('mock_session_1');
    expect(engine.getSessionInfo).toHaveBeenCalledWith('mock_session_1');
  });

  it('setSessionEngine 注入 + renameSession 委托', async () => {
    const engine = createMockEngine();
    setSessionEngine(engine);

    await renameSession('mock_session_1', 'My Session');
    expect(engine.renameSession).toHaveBeenCalledWith('mock_session_1', 'My Session');
  });

  it('setSessionEngine 注入 + tagSession 委托', async () => {
    const engine = createMockEngine();
    setSessionEngine(engine);

    await tagSession('mock_session_1', 'important');
    expect(engine.tagSession).toHaveBeenCalledWith('mock_session_1', 'important');
  });

  it('setSessionEngine 注入 + forkSession 委托', async () => {
    const engine = createMockEngine();
    setSessionEngine(engine);

    const result = await forkSession('mock_session_1', { from_message_id: 'msg_5' });
    expect(result.new_session_id).toBe('fork_1');
    expect(engine.forkSession).toHaveBeenCalledWith('mock_session_1', { from_message_id: 'msg_5' });
  });

  // === 注入机制 ===

  it('重复注入 → 后者覆盖前者', () => {
    const engine1 = createMockEngine();
    const engine2 = createMockEngine();
    setSessionEngine(engine1);
    setSessionEngine(engine2);
    expect(getSessionEngine()).toBe(engine2);
  });

  it('getSessionEngine → 返回当前注入实例', () => {
    const engine = createMockEngine();
    setSessionEngine(engine);
    expect(getSessionEngine()).toBe(engine);
  });
});
