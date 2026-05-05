/** P89 测试 — ConversationState 域 + SessionPersistence */

import { describe, expect, it } from 'vitest';
import type { DeepImmutable } from '../../immutable';
import type { ConversationStateDomain } from '../../state/AppState';
import {
  appendMessage,
  getDefaultConversationState,
  incrementTurnCount,
  initSessionTimestamps,
  resetConversation,
  setCurrentPrompt,
  setLastModelResponse
} from '../../state/conversationState';
import { getDefaultAppState } from '../../state/createAppStateStore';
import { InMemorySessionPersistence } from '../../session/InMemorySessionPersistence';

// ============================================================
// ConversationState 域测试
// ============================================================

describe('ConversationStateDomain', () => {
  it('默认值 → 空消息 + turnCount=0', () => {
    const state = getDefaultConversationState();
    expect(state.messages).toEqual([]);
    expect(state.turnCount).toBe(0);
    expect(state.currentPrompt).toBeUndefined();
    expect(state.lastModelResponse).toBeUndefined();
  });

  it('getDefaultAppState → 含 conversation 域', () => {
    const appState = getDefaultAppState();
    expect(appState.conversation).toBeDefined();
    expect(appState.conversation.messages).toEqual([]);
    expect(appState.conversation.turnCount).toBe(0);
  });

  it('appendMessage → 消息追加 + sessionLastActiveAt 更新', () => {
    const appState = getDefaultAppState();
    const msg = { role: 'user', content: 'hello' };
    const updated = appendMessage(appState, msg);
    expect(updated.conversation.messages).toHaveLength(1);
    expect(updated.conversation.sessionLastActiveAt).toBeGreaterThan(0);
  });

  it('setCurrentPrompt → 设置当前提示', () => {
    const appState = getDefaultAppState();
    const updated = setCurrentPrompt(appState, '用户输入');
    expect(updated.conversation.currentPrompt).toBe('用户输入');
    expect(updated.conversation.sessionLastActiveAt).toBeGreaterThan(0);
  });

  it('incrementTurnCount → 轮次+1', () => {
    const appState = getDefaultAppState();
    const updated = incrementTurnCount(appState);
    expect(updated.conversation.turnCount).toBe(1);
    const updated2 = incrementTurnCount(updated);
    expect(updated2.conversation.turnCount).toBe(2);
  });

  it('setLastModelResponse → 设置最近响应', () => {
    const appState = getDefaultAppState();
    const updated = setLastModelResponse(appState, '模型回复');
    expect(updated.conversation.lastModelResponse).toBe('模型回复');
  });

  it('initSessionTimestamps → 设置创建和活跃时间', () => {
    const appState = getDefaultAppState();
    const updated = initSessionTimestamps(appState);
    expect(updated.conversation.sessionCreatedAt).toBeGreaterThan(0);
    expect(updated.conversation.sessionLastActiveAt).toBeGreaterThan(0);
  });

  it('initSessionTimestamps 不覆盖已存在的 createdAt', () => {
    const appState = getDefaultAppState();
    const withTs = initSessionTimestamps(appState);
    const createdAt = withTs.conversation.sessionCreatedAt;
    // 再次调用不应覆盖
    const updated2 = initSessionTimestamps(withTs);
    expect(updated2.conversation.sessionCreatedAt).toBe(createdAt);
  });

  it('resetConversation → 清空所有对话状态', () => {
    const appState = getDefaultAppState();
    const withMsg = appendMessage(appState, { role: 'user', content: 'hi' });
    const withTurn = incrementTurnCount(withMsg);
    const reset = resetConversation(withTurn);
    expect(reset.conversation.messages).toEqual([]);
    expect(reset.conversation.turnCount).toBe(0);
  });

  it('多条消息追加 → 消息顺序正确', () => {
    let state = getDefaultAppState();
    state = appendMessage(state, { role: 'user', content: 'first' });
    state = appendMessage(state, { role: 'assistant', content: 'second' });
    state = appendMessage(state, { role: 'user', content: 'third' });
    expect(state.conversation.messages).toHaveLength(3);
    expect((state.conversation.messages as { content: string }[])[0].content).toBe('first');
    expect((state.conversation.messages as { content: string }[])[2].content).toBe('third');
  });
});

// ============================================================
// InMemorySessionPersistence 测试
// ============================================================

describe('InMemorySessionPersistence', () => {
  it('save + load → 恢复对话状态', async () => {
    const persistence = new InMemorySessionPersistence();
    const state = getDefaultConversationState();
    const withMsg: DeepImmutable<ConversationStateDomain> = {
      ...state,
      messages: [{ role: 'user', content: 'hello' }],
      turnCount: 1
    };

    await persistence.saveSession('session-1', withMsg);
    const loaded = await persistence.loadSession('session-1');

    expect(loaded).toBeDefined();
    expect(loaded!.turnCount).toBe(1);
    expect(loaded!.messages).toHaveLength(1);
  });

  it('load 未知 session → undefined', async () => {
    const persistence = new InMemorySessionPersistence();
    const loaded = await persistence.loadSession('unknown');
    expect(loaded).toBeUndefined();
  });

  it('delete → 会话删除', async () => {
    const persistence = new InMemorySessionPersistence();
    await persistence.saveSession('session-1', getDefaultConversationState());
    await persistence.deleteSession('session-1');
    const loaded = await persistence.loadSession('session-1');
    expect(loaded).toBeUndefined();
  });

  it('listSessions → 列出所有会话 ID', async () => {
    const persistence = new InMemorySessionPersistence();
    await persistence.saveSession('s1', getDefaultConversationState());
    await persistence.saveSession('s2', getDefaultConversationState());
    const sessions = await persistence.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions).toContain('s1');
    expect(sessions).toContain('s2');
  });

  it('clear → 清空所有会话', async () => {
    const persistence = new InMemorySessionPersistence();
    await persistence.saveSession('s1', getDefaultConversationState());
    persistence.clear();
    expect(persistence.size).toBe(0);
    const sessions = await persistence.listSessions();
    expect(sessions).toHaveLength(0);
  });

  it('save 覆盖 → 更新已有会话', async () => {
    const persistence = new InMemorySessionPersistence();
    await persistence.saveSession('s1', getDefaultConversationState());

    const updated: DeepImmutable<ConversationStateDomain> = {
      ...getDefaultConversationState(),
      turnCount: 5,
      lastModelResponse: 'updated'
    };
    await persistence.saveSession('s1', updated);

    const loaded = await persistence.loadSession('s1');
    expect(loaded!.turnCount).toBe(5);
    expect(loaded!.lastModelResponse).toBe('updated');
  });
});
