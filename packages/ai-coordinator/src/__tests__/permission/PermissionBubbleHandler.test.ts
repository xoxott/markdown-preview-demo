/** 权限冒泡处理器测试 */

import { describe, expect, it } from 'vitest';
import { InMemoryMailbox } from '../../mailbox/InMemoryMailbox';
import {
  pollPermissionBubbleResponse,
  receivePermissionBubbleRequests,
  sendPermissionBubble,
  sendPermissionBubbleResponse
} from '../../permission/PermissionBubbleHandler';
import type {
  PermissionBubbleRequest,
  PermissionBubbleResponse
} from '../../types/permission-bubble';

describe('sendPermissionBubble', () => {
  it('发送权限请求 → Leader inbox', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');

    const request: PermissionBubbleRequest = {
      type: 'permission_request',
      workerId: 'worker-1',
      workerName: 'researcher',
      toolName: 'bash',
      toolInput: { command: 'npm test' },
      reason: '需要执行命令'
    };

    const requestId = await sendPermissionBubble(mailbox, request, 'leader');
    expect(requestId).toBeTruthy();
    expect(requestId.startsWith('perm_')).toBe(true);

    const hasPending = await mailbox.hasPending('leader');
    expect(hasPending).toBe(true);
  });
});

describe('receivePermissionBubbleRequests', () => {
  it('Leader 接收权限请求 → 解析为 PermissionBubbleRequest', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');

    const request: PermissionBubbleRequest = {
      type: 'permission_request',
      workerId: 'worker-1',
      workerName: 'researcher',
      toolName: 'bash',
      toolInput: { command: 'npm test' },
      reason: '需要执行命令'
    };

    await sendPermissionBubble(mailbox, request, 'leader');
    const received = await receivePermissionBubbleRequests(mailbox, 'leader');

    expect(received.length).toBe(1);
    expect(received[0].workerId).toBe('worker-1');
    expect(received[0].toolName).toBe('bash');
  });

  it('无权限请求 → 空列表', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('leader');

    const received = await receivePermissionBubbleRequests(mailbox, 'leader');
    expect(received).toEqual([]);
  });
});

describe('sendPermissionBubbleResponse', () => {
  it('Leader 发送响应 → Worker inbox', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('worker-1');

    const response: PermissionBubbleResponse = {
      type: 'permission_response',
      workerId: 'worker-1',
      approved: true,
      requestId: 'perm_123',
      resolvedBy: 'leader'
    };

    await sendPermissionBubbleResponse(mailbox, response, 'worker-1');
    const hasPending = await mailbox.hasPending('worker-1');
    expect(hasPending).toBe(true);
  });
});

describe('pollPermissionBubbleResponse', () => {
  it('Worker 轮询匹配的响应 → 返回', async () => {
    const mailbox = new InMemoryMailbox();
    mailbox.registerRecipient('worker-1');
    mailbox.registerRecipient('leader');

    // Worker 发请求
    const request: PermissionBubbleRequest = {
      type: 'permission_request',
      workerId: 'worker-1',
      workerName: 'researcher',
      toolName: 'bash',
      toolInput: { command: 'npm test' },
      reason: '需要执行命令'
    };
    const requestId = await sendPermissionBubble(mailbox, request, 'leader');

    // Leader 接收 + 回复
    await receivePermissionBubbleRequests(mailbox, 'leader');
    const response: PermissionBubbleResponse = {
      type: 'permission_response',
      workerId: 'worker-1',
      approved: true,
      requestId,
      resolvedBy: 'leader'
    };
    await sendPermissionBubbleResponse(mailbox, response, 'worker-1');

    // Worker 轮询响应
    const result = await pollPermissionBubbleResponse(mailbox, 'worker-1', requestId, 5000);
    expect(result).not.toBeNull();
    expect(result!.approved).toBe(true);
    expect(result!.requestId).toBe(requestId);
  });
});
