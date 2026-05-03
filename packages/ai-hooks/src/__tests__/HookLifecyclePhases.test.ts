/** P59 测试 — 6个Hook Phase补齐 (SessionStart/End/UserPrompt/Notification/PreCompact/PostCompact) */
/* eslint-disable no-empty */

import { describe, expect, it } from 'vitest';
import { HookRegistry } from '../registry/HookRegistry';
import { HookSessionStartPhase } from '../phase/HookSessionStartPhase';
import { HookSessionEndPhase } from '../phase/HookSessionEndPhase';
import { HookUserPromptPhase } from '../phase/HookUserPromptPhase';
import { HookNotificationPhase } from '../phase/HookNotificationPhase';
import { HookPreCompactPhase } from '../phase/HookPreCompactPhase';
import { HookPostCompactPhase } from '../phase/HookPostCompactPhase';
import type {
  NotificationInput,
  PostCompactInput,
  PreCompactInput,
  SessionEndInput,
  SessionStartInput,
  UserPromptSubmitInput
} from '../types/input';

// ============================================================
// Mock MutableAgentContext
// ============================================================

interface MockState {
  sessionId: string;
  messages: { role: string; content: string }[];
  toolUseContext: {
    abortController: AbortController;
    tools: unknown;
  };
  transition: { type: string };
}

function createMockCtx(overrides?: Partial<{ meta: Record<string, unknown>; state: Partial<MockState> }>) {
  const messages: { role: string; content: string }[] = [
    { role: 'user', content: 'test message' },
    { role: 'assistant', content: 'response text' }
  ];

  const state: MockState = {
    sessionId: 'test-session-1',
    messages: overrides?.state?.messages ?? messages,
    toolUseContext: {
      abortController: new AbortController(),
      tools: null
    },
    transition: overrides?.state?.transition ?? { type: 'completed' }
  };

  const ctx = {
    meta: overrides?.meta ?? {},
    state,
    toolUses: [],
    setError: (_err: Error) => { /* mock */ },
    appendText: (_text: string) => { /* mock */ },
    setNeedsToolExecution: (_v: boolean) => { /* mock */ }
  };

  return ctx;
}

// Mock next() — 不 yield 任何事件
async function* mockNext(): AsyncGenerator<never> {}

// ============================================================
// HookSessionStartPhase
// ============================================================

describe('HookSessionStartPhase', () => {
  it('无匹配hooks → 直接next()', async () => {
    const registry = new HookRegistry();
    const phase = new HookSessionStartPhase(registry);
    const ctx = createMockCtx();

    const gen = phase.execute(ctx as any, mockNext);
    const events = [];
    for await (const e of gen) events.push(e);
    expect(events.length).toBe(0);
  });

  it('SessionStart hook → 附加上下文', async () => {
    const registry = new HookRegistry();
    registry.register({
      name: 'init-env',
      event: 'SessionStart',
      handler: async (_input: SessionStartInput) => ({
        outcome: 'success',
        additionalContext: 'initialized'
      })
    });

    const phase = new HookSessionStartPhase(registry);
    const ctx = createMockCtx();

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(ctx.meta.hookSessionStartContexts).toEqual(['initialized']);
  });

  it('SessionStart hook preventContinuation → setError', async () => {
    const registry = new HookRegistry();
    let errorSet = false;
    registry.register({
      name: 'block-session',
      event: 'SessionStart',
      handler: async () => ({
        outcome: 'success',
        preventContinuation: true,
        stopReason: 'blocked by policy'
      })
    });

    const phase = new HookSessionStartPhase(registry);
    const ctx = createMockCtx();
    ctx.setError = () => {
      errorSet = true;
    };

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(errorSet).toBe(true);
  });
});

// ============================================================
// HookSessionEndPhase
// ============================================================

describe('HookSessionEndPhase', () => {
  it('next_turn → 不触发SessionEnd hooks', async () => {
    const registry = new HookRegistry();
    let hookCalled = false;
    registry.register({
      name: 'cleanup',
      event: 'SessionEnd',
      handler: async () => { hookCalled = true; return { outcome: 'success' }; }
    });

    const phase = new HookSessionEndPhase(registry);
    const ctx = createMockCtx({ state: { transition: { type: 'next_turn' } } });

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(hookCalled).toBe(false);
  });

  it('terminal transition → 执行SessionEnd hooks', async () => {
    const registry = new HookRegistry();
    let capturedInput: SessionEndInput | null = null;
    registry.register({
      name: 'archive',
      event: 'SessionEnd',
      handler: async (input: SessionEndInput) => {
        capturedInput = input;
        return { outcome: 'success', additionalContext: 'archived' };
      }
    });

    const phase = new HookSessionEndPhase(registry);
    const ctx = createMockCtx({ state: { transition: { type: 'completed' } } });

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(capturedInput).not.toBeNull();
    expect(capturedInput!.hookEventName).toBe('SessionEnd');
    expect(capturedInput!.transitionType).toBe('completed');
    expect(capturedInput!.turnCount).toBe(1);
    expect(capturedInput!.lastAssistantMessage).toBe('response text');
  });
});

// ============================================================
// HookUserPromptPhase
// ============================================================

describe('HookUserPromptPhase', () => {
  it('无匹配hooks → 直接next()', async () => {
    const registry = new HookRegistry();
    const phase = new HookUserPromptPhase(registry);
    const ctx = createMockCtx();

    const gen = phase.execute(ctx as any, mockNext);
    const events = [];
    for await (const e of gen) events.push(e);
    expect(events.length).toBe(0);
  });

  it('UserPromptSubmit hook → 修改消息', async () => {
    const registry = new HookRegistry();
    registry.register({
      name: 'rewrite-prompt',
      event: 'UserPromptSubmit',
      handler: async (_input: UserPromptSubmitInput) => ({
        outcome: 'success',
        updatedInput: { userMessage: 'rewritten prompt' }
      })
    });

    const phase = new HookUserPromptPhase(registry);
    const ctx = createMockCtx();

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(ctx.meta.hookUserPromptModifiedMessage).toBe('rewritten prompt');
  });

  it('UserPromptSubmit hook preventContinuation → 拦截', async () => {
    const registry = new HookRegistry();
    let errorSet = false;
    registry.register({
      name: 'block-prompt',
      event: 'UserPromptSubmit',
      handler: async () => ({
        outcome: 'success',
        preventContinuation: true,
        stopReason: 'blocked'
      })
    });

    const phase = new HookUserPromptPhase(registry);
    const ctx = createMockCtx();
    ctx.setError = () => {
      errorSet = true;
    };

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(errorSet).toBe(true);
    expect(ctx.meta.hookUserPromptPrevent).toBe(true);
  });
});

// ============================================================
// HookNotificationPhase
// ============================================================

describe('HookNotificationPhase', () => {
  it('无notificationMessage → 不触发hooks', async () => {
    const registry = new HookRegistry();
    let hookCalled = false;
    registry.register({
      name: 'notify',
      event: 'Notification',
      handler: async () => { hookCalled = true; return { outcome: 'success' }; }
    });

    const phase = new HookNotificationPhase(registry);
    const ctx = createMockCtx();

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(hookCalled).toBe(false);
  });

  it('有notificationMessage → 执行Notification hooks', async () => {
    const registry = new HookRegistry();
    let capturedInput: NotificationInput | null = null;
    registry.register({
      name: 'notify',
      event: 'Notification',
      handler: async (input: NotificationInput) => {
        capturedInput = input;
        return { outcome: 'success', additionalContext: 'forwarded' };
      }
    });

    const phase = new HookNotificationPhase(registry);
    const ctx = createMockCtx({ meta: { notificationMessage: 'deploy complete', notificationToolName: 'Bash' } });

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(capturedInput).not.toBeNull();
    expect(capturedInput!.hookEventName).toBe('Notification');
    expect(capturedInput!.message).toBe('deploy complete');
    expect(capturedInput!.toolName).toBe('Bash');
  });
});

// ============================================================
// HookPreCompactPhase
// ============================================================

describe('HookPreCompactPhase', () => {
  it('无estimatedTokens → 不触发hooks', async () => {
    const registry = new HookRegistry();
    let hookCalled = false;
    registry.register({
      name: 'compact-guard',
      event: 'PreCompact',
      handler: async () => { hookCalled = true; return { outcome: 'success' }; }
    });

    const phase = new HookPreCompactPhase(registry);
    const ctx = createMockCtx();

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(hookCalled).toBe(false);
  });

  it('有token信息 → 执行PreCompact hooks', async () => {
    const registry = new HookRegistry();
    let capturedInput: PreCompactInput | null = null;
    registry.register({
      name: 'compact-guard',
      event: 'PreCompact',
      handler: async (input: PreCompactInput) => {
        capturedInput = input;
        return { outcome: 'success' };
      }
    });

    const phase = new HookPreCompactPhase(registry);
    const ctx = createMockCtx({ meta: { estimatedTokens: 150000, contextWindow: 200000 } });

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(capturedInput).not.toBeNull();
    expect(capturedInput!.estimatedTokens).toBe(150000);
    expect(capturedInput!.contextWindow).toBe(200000);
  });

  it('PreCompact hook preventContinuation → 阻止压缩', async () => {
    const registry = new HookRegistry();
    registry.register({
      name: 'block-compact',
      event: 'PreCompact',
      handler: async () => ({
        outcome: 'success',
        preventContinuation: true
      })
    });

    const phase = new HookPreCompactPhase(registry);
    const ctx = createMockCtx({ meta: { estimatedTokens: 150000, contextWindow: 200000 } });

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(ctx.meta.hookPreCompactPrevent).toBe(true);
  });
});

// ============================================================
// HookPostCompactPhase
// ============================================================

describe('HookPostCompactPhase', () => {
  it('无压缩结果 → 不触发hooks', async () => {
    const registry = new HookRegistry();
    let hookCalled = false;
    registry.register({
      name: 'compact-log',
      event: 'PostCompact',
      handler: async () => { hookCalled = true; return { outcome: 'success' }; }
    });

    const phase = new HookPostCompactPhase(registry);
    const ctx = createMockCtx();

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(hookCalled).toBe(false);
  });

  it('有压缩结果 → 执行PostCompact hooks', async () => {
    const registry = new HookRegistry();
    let capturedInput: PostCompactInput | null = null;
    registry.register({
      name: 'compact-log',
      event: 'PostCompact',
      handler: async (input: PostCompactInput) => {
        capturedInput = input;
        return { outcome: 'success', additionalContext: 'logged' };
      }
    });

    const phase = new HookPostCompactPhase(registry);
    const ctx = createMockCtx({ meta: { originalTokenCount: 180000, compressedTokenCount: 50000, compressionMethod: 'collapse' } });

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(capturedInput).not.toBeNull();
    expect(capturedInput!.originalTokenCount).toBe(180000);
    expect(capturedInput!.compressedTokenCount).toBe(50000);
    expect(capturedInput!.compressionMethod).toBe('collapse');
  });

  it('默认compressionMethod → "unknown"', async () => {
    const registry = new HookRegistry();
    let capturedInput: PostCompactInput | null = null;
    registry.register({
      name: 'compact-log',
      event: 'PostCompact',
      handler: async (input: PostCompactInput) => {
        capturedInput = input;
        return { outcome: 'success' };
      }
    });

    const phase = new HookPostCompactPhase(registry);
    const ctx = createMockCtx({ meta: { originalTokenCount: 180000, compressedTokenCount: 50000 } });

    const gen = phase.execute(ctx as any, mockNext);
    for await (const _ of gen) {}
    expect(capturedInput!.compressionMethod).toBe('unknown');
  });
});