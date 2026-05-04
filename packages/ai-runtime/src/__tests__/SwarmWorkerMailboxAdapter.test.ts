/** P49 测试 — SwarmWorkerMailboxAdapter 映射 + InProcessTeammate 注入 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SwarmPermissionRequest, SwarmWorkerMailboxOps } from '@suga/ai-tool-core';
import type {
  Mailbox,
  MailboxMessage,
  PermissionBubbleRequest,
  PermissionBubbleResponse,
  SpawnProvider,
  StructuredMessage,
  TaskDefinition,
  TaskExecutionContext
} from '@suga/ai-coordinator';
import { InProcessTeammate } from '@suga/ai-coordinator';
import { SwarmWorkerMailboxAdapter } from '../swarm/SwarmWorkerMailboxAdapter';

// ============================================================
// Mock Mailbox
// ============================================================

function createMockMailbox(): Mailbox {
  const inbox = new Map<string, MailboxMessage[]>();

  return {
    send: vi.fn().mockImplementation(async (msg: MailboxMessage) => {
      const recipientInbox = inbox.get(msg.to) ?? [];
      recipientInbox.push(msg);
      inbox.set(msg.to, recipientInbox);
    }),
    receive: vi.fn().mockImplementation(async (name: string) => {
      const msgs = inbox.get(name) ?? [];
      inbox.set(name, []);
      return msgs;
    }),
    broadcast: vi
      .fn()
      .mockImplementation(
        async (from: string, content: string | StructuredMessage, summary?: string) => {
          for (const [name] of inbox) {
            if (name !== from) {
              const recipientInbox = inbox.get(name) ?? [];
              recipientInbox.push({
                messageId: `broadcast_${Date.now()}`,
                from,
                to: name,
                content,
                timestamp: Date.now(),
                summary
              });
              inbox.set(name, recipientInbox);
            }
          }
        }
      ),
    hasPending: vi.fn().mockImplementation(async (name: string) => {
      return (inbox.get(name)?.length ?? 0) > 0;
    }),
    clear: vi.fn().mockImplementation(async (name: string) => {
      inbox.set(name, []);
    }),
    destroy: vi.fn().mockImplementation(async () => {
      inbox.clear();
    })
  };
}

// ============================================================
// SwarmWorkerMailboxAdapter tests
// ============================================================

describe('SwarmWorkerMailboxAdapter', () => {
  let adapter: SwarmWorkerMailboxAdapter;
  let mailbox: Mailbox;

  beforeEach(() => {
    mailbox = createMockMailbox();
    adapter = new SwarmWorkerMailboxAdapter({
      mailbox,
      leaderName: 'leader',
      workerId: 'worker_1'
    });
  });

  it('sendRequest → 投递 PermissionBubbleRequest 到 Mailbox', async () => {
    const request: SwarmPermissionRequest = {
      toolName: 'bash',
      toolInput: { command: 'ls' },
      workerId: 'worker_1',
      workerName: 'my-worker',
      reason: 'test permission'
    };

    const requestId = await adapter.sendRequest(request);

    expect(typeof requestId).toBe('string');
    expect(requestId.startsWith('perm_')).toBe(true);
    expect(mailbox.send).toHaveBeenCalledOnce();
  });

  it('sendRequest 含 classifierSuggestion → 映射为 permissionSuggestions', async () => {
    const request: SwarmPermissionRequest = {
      toolName: 'bash',
      toolInput: { command: 'rm -rf /' },
      workerId: 'worker_1',
      workerName: 'my-worker',
      reason: 'dangerous command',
      classifierSuggestion: {
        decision: 'deny',
        reason: 'destructive command',
        confidence: 'high'
      }
    };

    await adapter.sendRequest(request);

    const sentMsg = (mailbox.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as MailboxMessage;
    const structured = sentMsg.content as StructuredMessage;
    const payload = structured.payload as PermissionBubbleRequest;

    expect(payload.permissionSuggestions).toBeDefined();
    expect(payload.permissionSuggestions!.length).toBe(1);
    expect(payload.permissionSuggestions![0].decision).toBe('deny');
    expect(payload.permissionSuggestions![0].confidence).toBe('high');
  });

  it('sendRequest 无 classifierSuggestion → permissionSuggestions undefined', async () => {
    const request: SwarmPermissionRequest = {
      toolName: 'read',
      toolInput: { path: '/tmp/test' },
      workerId: 'worker_1',
      workerName: 'my-worker',
      reason: 'read file'
    };

    await adapter.sendRequest(request);

    const sentMsg = (mailbox.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as MailboxMessage;
    const structured = sentMsg.content as StructuredMessage;
    const payload = structured.payload as PermissionBubbleRequest;

    expect(payload.permissionSuggestions).toBeUndefined();
  });

  it('sendRequest → MailboxMessage 的 from/to 正确', async () => {
    const request: SwarmPermissionRequest = {
      toolName: 'bash',
      toolInput: { command: 'ls' },
      workerId: 'worker_1',
      workerName: 'my-worker',
      reason: 'test'
    };

    await adapter.sendRequest(request);

    const sentMsg = (mailbox.send as ReturnType<typeof vi.fn>).mock.calls[0][0] as MailboxMessage;
    expect(sentMsg.from).toBe('worker_1');
    expect(sentMsg.to).toBe('leader');
  });

  it('pollResponse → Leader 批准 → 映射为 approved=true', async () => {
    const request: SwarmPermissionRequest = {
      toolName: 'bash',
      toolInput: { command: 'ls' },
      workerId: 'worker_1',
      workerName: 'my-worker',
      reason: 'test'
    };

    const requestId = await adapter.sendRequest(request);

    // Leader 投递响应到 Worker inbox
    const leaderResponse: PermissionBubbleResponse = {
      type: 'permission_response',
      workerId: 'worker_1',
      approved: true,
      requestId,
      resolvedBy: 'leader',
      feedback: 'go ahead'
    };

    // 手动注入 Leader 响应到 Worker inbox
    const responseMsg: MailboxMessage = {
      messageId: 'resp_1',
      from: 'coordinator',
      to: 'worker_1',
      content: { type: 'permission_response', payload: leaderResponse },
      timestamp: Date.now(),
      summary: '权限响应'
    };

    // 直接投递到 mock inbox
    await mailbox.send(responseMsg);

    const result = await adapter.pollResponse(requestId, 5000);

    expect(result).not.toBeNull();
    expect(result!.approved).toBe(true);
    expect(result!.feedback).toBe('go ahead');
  });

  it('pollResponse → Leader 拒绝 + permissionUpdates → 映射为 SwarmPermissionRule[]', async () => {
    const request: SwarmPermissionRequest = {
      toolName: 'bash',
      toolInput: { command: 'rm -rf /' },
      workerId: 'worker_1',
      workerName: 'my-worker',
      reason: 'dangerous'
    };

    const requestId = await adapter.sendRequest(request);

    const leaderResponse: PermissionBubbleResponse = {
      type: 'permission_response',
      workerId: 'worker_1',
      approved: false,
      requestId,
      resolvedBy: 'leader',
      feedback: 'this is too risky',
      permissionUpdates: [
        { behavior: 'deny', ruleValue: 'Bash(rm -rf *)', source: 'leader', reason: 'destructive' }
      ]
    };

    const responseMsg: MailboxMessage = {
      messageId: 'resp_2',
      from: 'coordinator',
      to: 'worker_1',
      content: { type: 'permission_response', payload: leaderResponse },
      timestamp: Date.now(),
      summary: '权限拒绝'
    };

    await mailbox.send(responseMsg);

    const result = await adapter.pollResponse(requestId, 5000);

    expect(result).not.toBeNull();
    expect(result!.approved).toBe(false);
    expect(result!.feedback).toBe('this is too risky');
    expect(result!.permissionUpdates).toBeDefined();
    expect(result!.permissionUpdates!.length).toBe(1);
    expect(result!.permissionUpdates![0].behavior).toBe('deny');
    expect(result!.permissionUpdates![0].ruleValue).toBe('Bash(rm -rf *)');
  });

  it('pollResponse → 超时（无响应） → 返回 null', async () => {
    const request: SwarmPermissionRequest = {
      toolName: 'bash',
      toolInput: { command: 'ls' },
      workerId: 'worker_1',
      workerName: 'my-worker',
      reason: 'test'
    };

    const requestId = await adapter.sendRequest(request);

    // 不投递任何响应 → pollResponse 超时
    const result = await adapter.pollResponse(requestId, 100);

    expect(result).toBeNull();
  });

  it('实现 SwarmWorkerMailboxOps 接口 — 类型兼容', () => {
    const ops: SwarmWorkerMailboxOps = adapter;
    expect(ops.sendRequest).toBeInstanceOf(Function);
    expect(ops.pollResponse).toBeInstanceOf(Function);
  });
});

// ============================================================
// InProcessTeammate 注入测试
// ============================================================

describe('InProcessTeammate swarmWorkerMailboxOps 注入', () => {
  it('context 含 swarmWorkerMailboxOps → 传递到 SpawnCallOptions', async () => {
    const teammate = new InProcessTeammate();

    const mockMailboxOps: SwarmWorkerMailboxOps = {
      sendRequest: vi.fn().mockResolvedValue('req_1'),
      pollResponse: vi.fn().mockResolvedValue(null)
    };

    const capturedOptions: {
      swarmWorkerMailboxOps?: SwarmWorkerMailboxOps;
      swarmWorkerId?: string;
      swarmWorkerName?: string;
      swarmLeaderName?: string;
    } = {};

    const mockSpawnProvider: SpawnProvider = {
      callModel: vi.fn().mockResolvedValue('result'),
      spawnAgent: vi.fn().mockImplementation(async (_def, _task, options) => {
        capturedOptions.swarmWorkerMailboxOps = options?.swarmWorkerMailboxOps as
          | SwarmWorkerMailboxOps
          | undefined;
        capturedOptions.swarmWorkerId = options?.swarmWorkerId;
        capturedOptions.swarmWorkerName = options?.swarmWorkerName;
        capturedOptions.swarmLeaderName = options?.swarmLeaderName;
        return {
          output: 'done',
          toolCalls: 0,
          tokensUsed: { input: 10, output: 5 },
          success: true
        };
      })
    };

    const task: TaskDefinition = {
      taskId: 'task_1',
      subject: 'test task',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const context: TaskExecutionContext = {
      spawnProvider: mockSpawnProvider,
      meta: {},
      swarmWorkerMailboxOps: mockMailboxOps,
      swarmWorkerId: 'worker_1',
      swarmWorkerName: 'my-worker',
      swarmLeaderName: 'leader'
    };

    await teammate.execute(task, context);

    expect(capturedOptions.swarmWorkerMailboxOps).toBe(mockMailboxOps);
    expect(capturedOptions.swarmWorkerId).toBe('worker_1');
    expect(capturedOptions.swarmWorkerName).toBe('my-worker');
    expect(capturedOptions.swarmLeaderName).toBe('leader');
  });

  it('context 无 swarmWorkerMailboxOps → SpawnCallOptions 无相关字段', async () => {
    const teammate = new InProcessTeammate();

    const capturedOptions: Record<string, unknown> = {};

    const mockSpawnProvider: SpawnProvider = {
      callModel: vi.fn().mockResolvedValue('result'),
      spawnAgent: vi.fn().mockImplementation(async (_def, _task, options) => {
        if (options) {
          Object.assign(capturedOptions, options);
        }
        return {
          output: 'done',
          toolCalls: 0,
          tokensUsed: { input: 10, output: 5 },
          success: true
        };
      })
    };

    const task: TaskDefinition = {
      taskId: 'task_2',
      subject: 'test task without mailbox',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const context: TaskExecutionContext = {
      spawnProvider: mockSpawnProvider,
      meta: {}
    };

    await teammate.execute(task, context);

    expect(capturedOptions.swarmWorkerMailboxOps).toBeUndefined();
    expect(capturedOptions.swarmWorkerId).toBeUndefined();
    expect(capturedOptions.swarmLeaderName).toBeUndefined();
  });
});
