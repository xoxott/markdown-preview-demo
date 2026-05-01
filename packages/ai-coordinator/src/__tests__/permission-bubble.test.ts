/** 权限冒泡消息测试 */

import { describe, expect, it } from 'vitest';
import type { PermissionBubbleRequest, PermissionBubbleResponse } from '../types/permission-bubble';
import type { MailboxMessageType } from '../types/mailbox';

describe('PermissionBubbleRequest', () => {
  it('应能创建完整的请求', () => {
    const request: PermissionBubbleRequest = {
      type: 'permission_request',
      workerId: 'worker-1',
      workerName: 'coder',
      toolName: 'Bash',
      toolInput: { command: 'npm test' },
      reason: '需要执行命令',
      message: 'Worker "coder" 请求执行 Bash 命令',
      consecutiveDenials: 0,
      totalDenials: 5
    };

    expect(request.type).toBe('permission_request');
    expect(request.workerId).toBe('worker-1');
    expect(request.toolName).toBe('Bash');
    expect(request.consecutiveDenials).toBe(0);
    expect(request.totalDenials).toBe(5);
  });

  it('可选字段可省略', () => {
    const request: PermissionBubbleRequest = {
      type: 'permission_request',
      workerId: 'worker-2',
      workerName: 'tester',
      toolName: 'Write',
      toolInput: { path: '/tmp' },
      reason: '写入临时文件'
    };

    expect(request.message).toBeUndefined();
    expect(request.consecutiveDenials).toBeUndefined();
    expect(request.totalDenials).toBeUndefined();
  });
});

describe('PermissionBubbleResponse', () => {
  it('批准执行', () => {
    const response: PermissionBubbleResponse = {
      type: 'permission_response',
      workerId: 'worker-1',
      approved: true,
      reason: '用户确认允许'
    };

    expect(response.type).toBe('permission_response');
    expect(response.approved).toBe(true);
  });

  it('拒绝执行', () => {
    const response: PermissionBubbleResponse = {
      type: 'permission_response',
      workerId: 'worker-1',
      approved: false,
      reason: '安全策略不允许'
    };

    expect(response.approved).toBe(false);
  });

  it('无 reason 也可', () => {
    const response: PermissionBubbleResponse = {
      type: 'permission_response',
      workerId: 'worker-1',
      approved: false
    };

    expect(response.reason).toBeUndefined();
  });
});

describe('MailboxMessageType', () => {
  it('包含 permission_request 和 permission_response', () => {
    const types: MailboxMessageType[] = [
      'idle_notification',
      'task_assignment',
      'task_result',
      'shutdown_request',
      'shutdown_response',
      'plan_approval_response',
      'permission_request',
      'permission_response',
      'broadcast',
      'custom'
    ];
    expect(types.length).toBe(10);
  });
});
