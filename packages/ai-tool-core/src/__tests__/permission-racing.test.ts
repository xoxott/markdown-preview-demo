/** P44 原子竞争权限架构测试 — createResolveOnce + PermissionContextFactory + 5-path racing */

import { describe, expect, it } from 'vitest';
import { createResolveOnce } from '../permission/createResolveOnce';
import { createPermissionContext } from '../permission/PermissionContextFactory';
import {
  InMemoryPermissionQueueOps,
  createPermissionQueueOps
} from '../permission/PermissionQueueOpsFactory';
import {
  handleCoordinatorPermission,
  handleInteractivePermission
} from '../permission/permission-racing';
import type {
  BridgePermissionCallbacks,
  ChannelPermissionCallbacks,
  PermissionQueueItem,
  ResolveOnce
} from '../types/permission-racing';
import type { PermissionResult } from '../types/permission';
import type { ToolPermissionContext } from '../types/permission-context';
import { DEFAULT_TOOL_PERMISSION_CONTEXT } from '../types/permission-context';

// ============================================================
// createResolveOnce — 原子竞争守卫
// ============================================================

describe('createResolveOnce', () => {
  it('claim() 第一次调用返回 true（原子抢占成功）', () => {
    const resolved: PermissionResult[] = [];
    const guard: ResolveOnce<PermissionResult> = createResolveOnce(value => {
      resolved.push(value as PermissionResult);
    });

    expect(guard.claim()).toBe(true);
    expect(guard.isResolved()).toBe(true);
  });

  it('claim() 第二次调用返回 false（已被其他 racer 抢占）', () => {
    const resolved: PermissionResult[] = [];
    const guard = createResolveOnce(value => {
      resolved.push(value as PermissionResult);
    });

    expect(guard.claim()).toBe(true);
    expect(guard.claim()).toBe(false);
  });

  it('resolve() 仅第一次生效（delivered 标志防止双重 resolve）', () => {
    const resolved: PermissionResult[] = [];
    const guard = createResolveOnce(value => {
      resolved.push(value as PermissionResult);
    });

    const allowDecision: PermissionResult = {
      behavior: 'allow',
      decisionSource: 'classifier',
      structuredReason: 'classifier_allow'
    };

    guard.resolve(allowDecision);
    expect(resolved.length).toBe(1);
    expect(resolved[0]).toEqual(allowDecision);

    // 第二次 resolve → 无效
    const denyDecision: PermissionResult = {
      behavior: 'deny',
      message: 'second',
      decisionSource: 'rule',
      structuredReason: 'deny_rule_match'
    };
    guard.resolve(denyDecision);
    expect(resolved.length).toBe(1); // 不增加
  });

  it('isResolved() 是只读检查（不改变状态）', () => {
    const resolved: PermissionResult[] = [];
    const guard = createResolveOnce(value => {
      resolved.push(value as PermissionResult);
    });

    expect(guard.isResolved()).toBe(false); // 尚未抢占
    expect(guard.isResolved()).toBe(false); // 再次检查仍为 false
    expect(guard.claim()).toBe(true); // claim 仍然成功
  });

  it('并发竞争 — 多个 racer 只有 1 个赢', () => {
    const resolved: PermissionResult[] = [];
    const guard = createResolveOnce(value => {
      resolved.push(value as PermissionResult);
    });

    // 模拟 5 个 racer 竞争
    const results = [guard.claim(), guard.claim(), guard.claim(), guard.claim(), guard.claim()];

    // 只有 1 个 true
    expect(results.filter(Boolean).length).toBe(1);

    // isResolved 为 true
    expect(guard.isResolved()).toBe(true);
  });

  it('claim() + resolve() 组合 — claim 赢后安全交付', () => {
    const resolved: PermissionResult[] = [];
    const guard = createResolveOnce(value => {
      resolved.push(value as PermissionResult);
    });

    // racer A: claim 成功 + resolve
    if (guard.claim()) {
      guard.resolve({
        behavior: 'allow',
        decisionSource: 'user',
        structuredReason: 'ask_rule_match'
      });
    }

    // racer B: claim 失败 → 静默退出
    if (guard.claim()) {
      guard.resolve({
        behavior: 'deny',
        message: 'B',
        decisionSource: 'rule',
        structuredReason: 'deny_rule_match'
      });
    }

    expect(resolved.length).toBe(1);
    expect(resolved[0].behavior).toBe('allow');
  });
});

// ============================================================
// PermissionContextFactory — 冻结上下文
// ============================================================

describe('createPermissionContext', () => {
  const testPermCtx: ToolPermissionContext = {
    ...DEFAULT_TOOL_PERMISSION_CONTEXT,
    mode: 'default'
  };

  it('返回冻结对象 — 不可修改', () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_1'
    });

    expect(Object.isFrozen(ctx)).toBe(true);
    // 尝试修改 → TypeError (在 strict mode 下)
    expect(() => {
      (ctx as any).toolName = 'modified';
    }).toThrow();
  });

  it('resolveIfAborted — 未 abort 时返回 false', () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_2'
    });

    const resolved: PermissionResult[] = [];
    const result = ctx.resolveIfAborted(value => {
      resolved.push(value as PermissionResult);
    });
    expect(result).toBe(false);
    expect(resolved.length).toBe(0);
  });

  it('resolveIfAborted — abort 后返回 true 并 resolve cancel', () => {
    const abortController = new AbortController();
    abortController.abort(); // 立即 abort

    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_3',
      signal: abortController.signal
    });

    const resolved: PermissionResult[] = [];
    const result = ctx.resolveIfAborted(value => {
      resolved.push(value as PermissionResult);
    });
    expect(result).toBe(true);
    expect(resolved.length).toBe(1);
    expect(resolved[0].behavior).toBe('deny');
  });

  it('cancelAndAbort — 构建 deny 决策（中断标记）', () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_4'
    });

    const result = ctx.cancelAndAbort('test feedback', true);
    expect(result.behavior).toBe('deny');
    expect((result as any).message).toContain('中断');
    expect((result as any).feedback).toBe('test feedback');
  });

  it('buildAllow — 构建 allow 决策', () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_5'
    });

    const result = ctx.buildAllow({ command: 'ls -la' });
    expect(result.behavior).toBe('allow');
    expect((result as any).updatedInput).toEqual({ command: 'ls -la' });
  });

  it('buildDeny — 构建 deny 决策', () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'rm -rf' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_6'
    });

    const result = ctx.buildDeny('dangerous command', 'classifier_deny');
    expect(result.behavior).toBe('deny');
    expect(result.structuredReason).toBe('classifier_deny');
  });

  it('handleUserAllow — 持久化 + 日志 + 返回 allow', () => {
    const persisted: unknown[] = [];
    const logged: unknown[] = [];

    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_7',
      persistFn: update => {
        persisted.push(update);
      },
      logFn: args => {
        logged.push(args);
      }
    });

    const result = ctx.handleUserAllow({ command: 'ls -la' }, undefined, 'ok');
    expect(result.behavior).toBe('allow');
    expect((result as any).feedback).toBe('ok');
    expect(logged.length).toBe(1);
  });

  it('handleHookAllow — 持久化 + 日志 + 返回 allow (hook source)', () => {
    const logged: unknown[] = [];

    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_8',
      logFn: args => {
        logged.push(args);
      }
    });

    const result = ctx.handleHookAllow(undefined, undefined, 'security-check');
    expect(result.behavior).toBe('allow');
    expect(result.decisionSource).toBe('hook');
    expect(logged.length).toBe(1);
  });

  it('队列操作 — push/remove/update', () => {
    const queueOps = new InMemoryPermissionQueueOps();

    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_9',
      queueOps
    });

    // push
    ctx.pushToQueue({
      toolUseID: 'tool_test_9',
      tool: { name: 'bash' } as any,
      input: { command: 'ls' },
      permCtx: testPermCtx,
      message: 'test',
      reason: 'ask_rule_match',
      classifierSuggestion: undefined,
      onAllow: () => {},
      onReject: () => {},
      onAbort: () => {},
      recheckPermission: () => {},
      onUserInteraction: () => {}
    });
    expect(queueOps.size).toBe(1);

    // remove
    ctx.removeFromQueue();
    expect(queueOps.size).toBe(0);
  });

  it('logDecision / logCancelled — 记录日志', () => {
    const logged: unknown[] = [];

    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID: 'tool_test_10',
      logFn: args => {
        logged.push(args);
      }
    });

    ctx.logDecision({
      behavior: 'allow',
      decisionSource: 'user',
      decisionReason: 'ask_rule_match'
    });
    expect(logged.length).toBe(1);

    ctx.logCancelled();
    expect(logged.length).toBe(2);
  });
});

// ============================================================
// PermissionQueueOps — 队列工厂
// ============================================================

describe('InMemoryPermissionQueueOps', () => {
  it('push + getItems + remove', () => {
    const ops = new InMemoryPermissionQueueOps();
    const item: PermissionQueueItem = {
      toolUseID: 'test_1',
      tool: { name: 'bash' } as any,
      input: { command: 'ls' },
      permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
      message: 'test',
      reason: 'ask_rule_match',
      classifierSuggestion: undefined,
      onAllow: () => {},
      onReject: () => {},
      onAbort: () => {},
      recheckPermission: () => {},
      onUserInteraction: () => {}
    };

    ops.push(item);
    expect(ops.size).toBe(1);
    expect(ops.getItems()[0].toolUseID).toBe('test_1');

    ops.remove('test_1');
    expect(ops.size).toBe(0);
  });

  it('update — 部分更新队列条目', () => {
    const ops = new InMemoryPermissionQueueOps();
    const item: PermissionQueueItem = {
      toolUseID: 'test_2',
      tool: { name: 'bash' } as any,
      input: { command: 'ls' },
      permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
      message: 'original message',
      reason: 'ask_rule_match',
      classifierSuggestion: undefined,
      onAllow: () => {},
      onReject: () => {},
      onAbort: () => {},
      recheckPermission: () => {},
      onUserInteraction: () => {}
    };

    ops.push(item);
    ops.update('test_2', { message: 'updated message' });
    expect(ops.getItems()[0].message).toBe('updated message');
  });

  it('remove — 不存在的 ID 不报错', () => {
    const ops = new InMemoryPermissionQueueOps();
    ops.remove('nonexistent');
    expect(ops.size).toBe(0);
  });
});

describe('createPermissionQueueOps', () => {
  it('functional setState — push/remove/update', () => {
    const queue: PermissionQueueItem[] = [];
    const setQueue = (updater: (q: PermissionQueueItem[]) => PermissionQueueItem[]) => {
      const result = updater(queue);
      queue.length = 0;
      queue.push(...result);
    };

    const ops = createPermissionQueueOps(setQueue);

    const item: PermissionQueueItem = {
      toolUseID: 'react_1',
      tool: { name: 'bash' } as any,
      input: { command: 'ls' },
      permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
      message: 'test',
      reason: 'ask_rule_match',
      classifierSuggestion: undefined,
      onAllow: () => {},
      onReject: () => {},
      onAbort: () => {},
      recheckPermission: () => {},
      onUserInteraction: () => {}
    };

    ops.push(item);
    expect(queue.length).toBe(1);

    ops.remove('react_1');
    expect(queue.length).toBe(0);
  });
});

// ============================================================
// handleInteractivePermission — 5-racer 竞争
// ============================================================

describe('handleInteractivePermission', () => {
  const testPermCtx: ToolPermissionContext = {
    ...DEFAULT_TOOL_PERMISSION_CONTEXT,
    mode: 'default'
  };

  function createTestCtx(toolUseID: string, overrides?: Record<string, unknown>) {
    return createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: testPermCtx,
      toolUseID,
      ...overrides
    });
  }

  it('Racer 1 onAllow — claim 赢 + resolve allow', async () => {
    const queueOps = new InMemoryPermissionQueueOps();

    const resultPromise = new Promise<PermissionResult>(resolve => {
      handleInteractivePermission(
        {
          ctx: createTestCtx('racer_allow_1', { queueOps }),
          description: 'test',
          result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' },
          bridgeCallbacks: undefined,
          channelCallbacks: undefined
        },
        resolve
      );

      // 模拟 Racer 1 onAllow
      const queueItem = queueOps.getItems()[0];
      queueItem.onAllow();
    });

    const result = await resultPromise;
    expect(result.behavior).toBe('allow');
    expect(queueOps.size).toBe(0); // removeFromQueue
  });

  it('Racer 1 onReject — claim 赢 + resolve deny', async () => {
    const queueOps = new InMemoryPermissionQueueOps();

    const resultPromise = new Promise<PermissionResult>(resolve => {
      handleInteractivePermission(
        {
          ctx: createTestCtx('racer_reject_1', { queueOps }),
          description: 'test',
          result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' },
          bridgeCallbacks: undefined,
          channelCallbacks: undefined
        },
        resolve
      );

      const queueItem = queueOps.getItems()[0];
      queueItem.onReject('user feedback');
    });

    const result = await resultPromise;
    expect(result.behavior).toBe('deny');
    expect((result as any).feedback).toBe('user feedback');
  });

  it('Racer 1 onAbort — claim 赢 + resolve cancel+abort', async () => {
    const queueOps = new InMemoryPermissionQueueOps();

    const resultPromise = new Promise<PermissionResult>(resolve => {
      handleInteractivePermission(
        {
          ctx: createTestCtx('racer_abort_1', { queueOps }),
          description: 'test',
          result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' },
          bridgeCallbacks: undefined,
          channelCallbacks: undefined
        },
        resolve
      );

      const queueItem = queueOps.getItems()[0];
      queueItem.onAbort();
    });

    const result = await resultPromise;
    expect(result.behavior).toBe('deny');
    expect((result as any).message).toContain('中断');
  });

  it('Bridge racer + local racer 竞争 — local 先 claim 赢', async () => {
    const queueOps = new InMemoryPermissionQueueOps();
    const bridgeRequests: unknown[] = [];
    const bridgeCancelled: string[] = [];

    const bridgeCallbacks: BridgePermissionCallbacks = {
      sendRequest: (requestId, request) => {
        bridgeRequests.push({ requestId, request });
      },
      cancelRequest: requestId => {
        bridgeCancelled.push(requestId);
      },
      onResponse: () => () => {} // 不触发 bridge 响应
    };

    const resultPromise = new Promise<PermissionResult>(resolve => {
      handleInteractivePermission(
        {
          ctx: createTestCtx('bridge_local_1', { queueOps }),
          description: 'test',
          result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' },
          bridgeCallbacks,
          channelCallbacks: undefined
        },
        resolve
      );

      // local racer 先 claim
      const queueItem = queueOps.getItems()[0];
      queueItem.onAllow();
    });

    const result = await resultPromise;
    expect(result.behavior).toBe('allow');
    // bridge 请求被取消
    expect(bridgeCancelled.length).toBe(1);
  });

  it('Bridge racer 响应 — approve', async () => {
    const queueOps = new InMemoryPermissionQueueOps();
    let unsubscribeFn: (() => void) | undefined;

    const bridgeCallbacks: BridgePermissionCallbacks = {
      sendRequest: () => {},
      cancelRequest: () => {},
      onResponse: (_requestId, callback) => {
        // 立即触发 approve 响应
        setTimeout(() => {
          callback({ behavior: 'approve', persistent: false });
        }, 10);
        unsubscribeFn = () => {};
        return unsubscribeFn;
      }
    };

    const resultPromise = new Promise<PermissionResult>(resolve => {
      handleInteractivePermission(
        {
          ctx: createTestCtx('bridge_approve_1', { queueOps }),
          description: 'test',
          result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' },
          bridgeCallbacks,
          channelCallbacks: undefined
        },
        resolve
      );
    });

    const result = await resultPromise;
    expect(result.behavior).toBe('allow');
  });

  it('Channel racer 响应 — approve (取消 bridge)', async () => {
    const queueOps = new InMemoryPermissionQueueOps();
    const bridgeCancelled: string[] = [];

    const bridgeCallbacks: BridgePermissionCallbacks = {
      sendRequest: () => {},
      cancelRequest: requestId => {
        bridgeCancelled.push(requestId);
      },
      onResponse: () => () => {}
    };

    const channelCallbacks: ChannelPermissionCallbacks = {
      sendNotification: () => {},
      onResponse: (_requestId, callback) => {
        setTimeout(() => {
          callback({ behavior: 'approve', fromServer: 'telegram' });
        }, 10);
        return () => {};
      }
    };

    const resultPromise = new Promise<PermissionResult>(resolve => {
      handleInteractivePermission(
        {
          ctx: createTestCtx('channel_approve_1', { queueOps }),
          description: 'test',
          result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' },
          bridgeCallbacks,
          channelCallbacks
        },
        resolve
      );
    });

    const result = await resultPromise;
    expect(result.behavior).toBe('allow');
    // bridge 也被取消
    expect(bridgeCancelled.length).toBe(1);
  });

  it('多个 racer 同时 claim — 只有 1 个赢', async () => {
    const queueOps = new InMemoryPermissionQueueOps();
    let bridgeResponseCallback:
      | ((response: import('../types/permission-prompt').PermissionPromptResponse) => void)
      | undefined;

    const bridgeCallbacks: BridgePermissionCallbacks = {
      sendRequest: () => {},
      cancelRequest: () => {},
      onResponse: (_requestId, callback) => {
        bridgeResponseCallback = callback;
        return () => {};
      }
    };

    const resultPromise = new Promise<PermissionResult>(resolve => {
      handleInteractivePermission(
        {
          ctx: createTestCtx('multi_claim_1', { queueOps }),
          description: 'test',
          result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' },
          bridgeCallbacks,
          channelCallbacks: undefined
        },
        resolve
      );
    });

    // 两个 racer 同时尝试 claim
    // local onAllow 和 bridge approve 同时触发
    const queueItem = queueOps.getItems()[0];
    queueItem.onAllow(); // local claim 成功

    // bridge 的 claim 应失败（local 已赢）
    if (bridgeResponseCallback) {
      bridgeResponseCallback({ behavior: 'approve' }); // claim 失败 → 无效
    }

    const result = await resultPromise;
    expect(result.behavior).toBe('allow');
    // 只 resolve 一次
    expect(queueOps.size).toBe(0);
  });
});

// ============================================================
// handleCoordinatorPermission — 顺序自动检查
// ============================================================

describe('handleCoordinatorPermission', () => {
  it('hooks 返回 deny → 立即返回 deny', async () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'rm -rf /' },
      permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
      toolUseID: 'coord_1',
      hookRunner: {
        runPermissionHooks: async () => ({
          behavior: 'deny',
          message: 'security hook blocked',
          decisionSource: 'hook',
          structuredReason: 'hook_deny'
        })
      }
    });

    const result = await handleCoordinatorPermission({
      ctx,
      result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' }
    });

    expect(result).not.toBeNull();
    expect(result!.behavior).toBe('deny');
  });

  it('hooks 返回 allow → 立即返回 allow', async () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
      toolUseID: 'coord_2',
      hookRunner: {
        runPermissionHooks: async () => ({
          behavior: 'allow',
          decisionSource: 'hook',
          structuredReason: 'hook_allow'
        })
      }
    });

    const result = await handleCoordinatorPermission({
      ctx,
      result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' }
    });

    expect(result).not.toBeNull();
    expect(result!.behavior).toBe('allow');
  });

  it('hooks 和 classifier 都未解决 → 返回 null', async () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
      toolUseID: 'coord_3'
    });

    const result = await handleCoordinatorPermission({
      ctx,
      result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' }
    });

    expect(result).toBeNull();
  });

  it('hooks 失败 → graceful degradation (返回 null)', async () => {
    const ctx = createPermissionContext({
      toolName: 'bash',
      input: { command: 'ls' },
      permCtx: DEFAULT_TOOL_PERMISSION_CONTEXT,
      toolUseID: 'coord_4',
      hookRunner: {
        runPermissionHooks: async () => {
          throw new Error('Hook execution failed');
        }
      }
    });

    const result = await handleCoordinatorPermission({
      ctx,
      result: { behavior: 'ask', message: 'test', structuredReason: 'ask_rule_match' }
    });

    // Hook 失败 → graceful degradation, 不阻断
    expect(result).toBeNull();
  });
});
