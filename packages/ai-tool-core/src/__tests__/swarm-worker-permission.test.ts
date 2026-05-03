/** P48 测试 — Swarm Worker 权限转发 + Path 5 */

import { describe, expect, it, vi } from 'vitest';
import { handleSwarmWorkerPermission } from '../permission/handleSwarmWorkerPermission';
import type {
  SwarmPermissionRequest,
  SwarmPermissionResponse,
  SwarmWorkerMailboxOps
} from '../types/swarm-worker-mailbox';
import type { PermissionAllow, PermissionDeny, PermissionResult } from '../types/permission';
import type { PermissionContextMethods } from '../types/permission-racing';

// ============================================================
// Mock helpers
// ============================================================

function createMockCtx(toolName = 'bash', input = { command: 'ls' }): PermissionContextMethods {
  return {
    toolName,
    input,
    toolUseID: 'tool_use_1',
    permCtx: {
      mode: 'default',
      bypassPermissions: false,
      classifierFn: undefined,
      ironGate: undefined
    },
    tryClassifier: vi.fn().mockResolvedValue(undefined),
    runHooks: vi.fn().mockResolvedValue(undefined),
    buildAllow: vi.fn().mockReturnValue({
      behavior: 'allow',
      decisionSource: 'classifier',
      structuredReason: 'classifier_allow'
    } as PermissionAllow),
    buildDeny: vi.fn().mockReturnValue({
      behavior: 'deny',
      message: 'denied',
      decisionSource: 'flag',
      structuredReason: 'swarm_worker_timeout_deny'
    } as PermissionDeny),
    handleUserAllow: vi.fn().mockReturnValue({
      behavior: 'allow',
      decisionSource: 'user'
    } as PermissionAllow),
    handleHookAllow: vi.fn().mockReturnValue({
      behavior: 'allow',
      decisionSource: 'hook'
    } as PermissionAllow),
    cancelAndAbort: vi.fn().mockReturnValue({
      behavior: 'deny',
      message: 'aborted',
      decisionSource: 'flag',
      structuredReason: 'swarm_worker_timeout_deny'
    } as PermissionDeny),
    resolveIfAborted: vi.fn().mockReturnValue(false),
    pushToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    logCancelled: vi.fn(),
    updateQueueItem: vi.fn()
  } as unknown as PermissionContextMethods;
}

function createMockMailbox(): SwarmWorkerMailboxOps {
  return {
    sendRequest: vi.fn().mockResolvedValue('request_1'),
    pollResponse: vi.fn().mockResolvedValue(null)
  };
}

function createAskResult(message = '工具 "bash" 需要确认'): PermissionResult & { behavior: 'ask' } {
  return {
    behavior: 'ask',
    message,
    decisionSource: 'rule',
    structuredReason: 'ask_rule_match'
  };
}

// ============================================================
// handleSwarmWorkerPermission tests
// ============================================================

describe('handleSwarmWorkerPermission', () => {
  it('classifier allow → 直接返回', async () => {
    const ctx = createMockCtx();
    const classifierAllow: PermissionAllow = {
      behavior: 'allow',
      decisionSource: 'classifier',
      structuredReason: 'classifier_allow'
    };
    ctx.tryClassifier = vi.fn().mockResolvedValue(classifierAllow);

    const result = await handleSwarmWorkerPermission(
      ctx,
      createAskResult(),
      createMockMailbox(),
      'worker_1',
      'worker-name'
    );

    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow') {
      expect(result.structuredReason).toBe('classifier_allow');
    }
  });

  it('classifier deny → 直接返回', async () => {
    const ctx = createMockCtx();
    const classifierDeny: PermissionDeny = {
      behavior: 'deny',
      decisionSource: 'classifier',
      structuredReason: 'classifier_deny',
      message: 'dangerous command'
    };
    ctx.tryClassifier = vi.fn().mockResolvedValue(classifierDeny);

    const result = await handleSwarmWorkerPermission(
      ctx,
      createAskResult(),
      createMockMailbox(),
      'worker_1',
      'worker-name'
    );

    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') {
      expect(result.structuredReason).toBe('classifier_deny');
    }
  });

  it('classifier ask → mailbox 转发到 Leader', async () => {
    const ctx = createMockCtx();
    const classifierAsk: PermissionResult = {
      behavior: 'ask',
      decisionSource: 'classifier',
      structuredReason: 'classifier_ask',
      message: 'uncertain'
    };
    ctx.tryClassifier = vi.fn().mockResolvedValue(classifierAsk);

    const mailbox = createMockMailbox();
    const leaderResponse: SwarmPermissionResponse = {
      approved: true,
      reason: 'Leader approved'
    };
    mailbox.pollResponse = vi.fn().mockResolvedValue(leaderResponse);

    const result = await handleSwarmWorkerPermission(
      ctx,
      createAskResult(),
      mailbox,
      'worker_1',
      'worker-name'
    );

    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow') {
      expect(result.structuredReason).toBe('swarm_worker_leader_approved');
    }
    expect(mailbox.sendRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        workerId: 'worker_1',
        classifierSuggestion: expect.any(Object)
      })
    );
  });

  it('Leader 批准 → allow', async () => {
    const ctx = createMockCtx();
    ctx.tryClassifier = vi.fn().mockResolvedValue(undefined);

    const mailbox = createMockMailbox();
    const leaderResponse: SwarmPermissionResponse = {
      approved: true,
      reason: 'approved by leader',
      feedback: 'go ahead'
    };
    mailbox.pollResponse = vi.fn().mockResolvedValue(leaderResponse);

    const result = await handleSwarmWorkerPermission(
      ctx,
      createAskResult(),
      mailbox,
      'worker_1',
      'worker-name'
    );

    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow') {
      expect(result.structuredReason).toBe('swarm_worker_leader_approved');
    }
  });

  it('Leader 拒绝 → deny', async () => {
    const ctx = createMockCtx();
    ctx.tryClassifier = vi.fn().mockResolvedValue(undefined);

    const mailbox = createMockMailbox();
    const leaderResponse: SwarmPermissionResponse = {
      approved: false,
      reason: 'Leader denied',
      feedback: 'this is too risky'
    };
    mailbox.pollResponse = vi.fn().mockResolvedValue(leaderResponse);

    const result = await handleSwarmWorkerPermission(
      ctx,
      createAskResult(),
      mailbox,
      'worker_1',
      'worker-name'
    );

    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') {
      expect(result.structuredReason).toBe('swarm_worker_leader_denied');
      expect(result.feedback).toBe('this is too risky');
    }
  });

  it('Leader 超时 → deny（不 fall through 到 interactive）', async () => {
    const ctx = createMockCtx();
    ctx.tryClassifier = vi.fn().mockResolvedValue(undefined);

    const mailbox = createMockMailbox();
    mailbox.pollResponse = vi.fn().mockResolvedValue(null); // 超时

    const result = await handleSwarmWorkerPermission(
      ctx,
      createAskResult(),
      mailbox,
      'worker_1',
      'worker-name'
    );

    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') {
      expect(result.structuredReason).toBe('swarm_worker_timeout_deny');
    }
    // 关键：不 fall through 到 interactive
  });

  it('classifier 不可用 → mailbox 转发（无 classifierSuggestion）', async () => {
    const ctx = createMockCtx();
    ctx.tryClassifier = vi.fn().mockResolvedValue(undefined);

    const mailbox = createMockMailbox();
    mailbox.sendRequest = vi.fn().mockImplementation(async (req: SwarmPermissionRequest) => {
      expect(req.classifierSuggestion).toBeUndefined();
      return 'request_1';
    });
    const leaderResponse: SwarmPermissionResponse = { approved: true };
    mailbox.pollResponse = vi.fn().mockResolvedValue(leaderResponse);

    const result = await handleSwarmWorkerPermission(
      ctx,
      createAskResult(),
      mailbox,
      'worker_1',
      'worker-name'
    );

    expect(result.behavior).toBe('allow');
  });

  it('sendRequest 包含正确的 workerId 和 workerName', async () => {
    const ctx = createMockCtx('bash', { command: 'rm -rf /' });
    ctx.tryClassifier = vi.fn().mockResolvedValue(undefined);

    const mailbox = createMockMailbox();
    mailbox.sendRequest = vi.fn().mockImplementation(async (req: SwarmPermissionRequest) => {
      expect(req.workerId).toBe('worker_42');
      expect(req.workerName).toBe('my-worker');
      expect(req.toolName).toBe('bash');
      return 'req_42';
    });
    mailbox.pollResponse = vi.fn().mockResolvedValue({ approved: true });

    await handleSwarmWorkerPermission(ctx, createAskResult(), mailbox, 'worker_42', 'my-worker');
  });
});

// ============================================================
// SwarmWorkerMailboxOps interface tests
// ============================================================

describe('SwarmWorkerMailboxOps interface', () => {
  it('sendRequest — 返回 requestId string', async () => {
    const mailbox: SwarmWorkerMailboxOps = {
      sendRequest: vi.fn().mockResolvedValue('req_123'),
      pollResponse: vi.fn().mockResolvedValue(null)
    };

    const id = await mailbox.sendRequest({
      toolName: 'bash',
      toolInput: { command: 'ls' },
      workerId: 'w1',
      workerName: 'worker-1',
      reason: 'test'
    });

    expect(id).toBe('req_123');
    expect(typeof id).toBe('string');
  });

  it('pollResponse — 返回 SwarmPermissionResponse', async () => {
    const response: SwarmPermissionResponse = {
      approved: true,
      reason: 'ok',
      feedback: 'go'
    };
    const mailbox: SwarmWorkerMailboxOps = {
      sendRequest: vi.fn().mockResolvedValue('req_1'),
      pollResponse: vi.fn().mockResolvedValue(response)
    };

    const result = await mailbox.pollResponse('req_1', 30000);
    expect(result!.approved).toBe(true);
  });

  it('pollResponse — 超时返回 null', async () => {
    const mailbox: SwarmWorkerMailboxOps = {
      sendRequest: vi.fn().mockResolvedValue('req_1'),
      pollResponse: vi.fn().mockResolvedValue(null)
    };

    const result = await mailbox.pollResponse('req_1', 1000);
    expect(result).toBeNull();
  });
});
