/** Leader 端权限请求队列测试 */

import { describe, expect, it } from 'vitest';
import { PermissionBubbleQueue } from '../../permission/PermissionBubbleQueue';
import type { PermissionBubbleRequest } from '../../types/permission-bubble';

const mockRequest: PermissionBubbleRequest = {
  type: 'permission_request',
  workerId: 'worker-1',
  workerName: 'researcher',
  toolName: 'bash',
  toolInput: { command: 'npm test' },
  reason: '需要执行命令'
};

describe('PermissionBubbleQueue', () => {
  it('enqueue → 添加请求到队列', () => {
    const queue = new PermissionBubbleQueue();
    const entry = queue.enqueue(mockRequest, 'perm_1');

    expect(entry.request).toEqual(mockRequest);
    expect(entry.requestId).toBe('perm_1');
    expect(entry.status).toBe('pending');
    expect(entry.receivedAt).toBeGreaterThan(0);
  });

  it('getPending → 返回所有 pending 状态的请求', () => {
    const queue = new PermissionBubbleQueue();
    queue.enqueue(mockRequest, 'perm_1');

    const another: PermissionBubbleRequest = {
      type: 'permission_request',
      workerId: 'worker-2',
      workerName: 'coder',
      toolName: 'write',
      toolInput: { path: '/tmp' },
      reason: '需要写入文件'
    };
    queue.enqueue(another, 'perm_2');

    const pending = queue.getPending();
    expect(pending.length).toBe(2);
  });

  it('resolve → 批准请求', () => {
    const queue = new PermissionBubbleQueue();
    queue.enqueue(mockRequest, 'perm_1');

    const resolved = queue.resolve('perm_1', true);
    expect(resolved.status).toBe('approved');
    expect(resolved.requestId).toBe('perm_1');
  });

  it('resolve → 拒绝请求', () => {
    const queue = new PermissionBubbleQueue();
    queue.enqueue(mockRequest, 'perm_1');

    const resolved = queue.resolve('perm_1', false);
    expect(resolved.status).toBe('rejected');
  });

  it('resolve → requestId 不存在 → 报错', () => {
    const queue = new PermissionBubbleQueue();
    expect(() => queue.resolve('nonexist', true)).toThrow();
  });

  it('getPending → 已 resolve 的不在 pending 中', () => {
    const queue = new PermissionBubbleQueue();
    queue.enqueue(mockRequest, 'perm_1');
    queue.enqueue({ ...mockRequest, workerId: 'worker-2' }, 'perm_2');

    queue.resolve('perm_1', true);
    const pending = queue.getPending();
    expect(pending.length).toBe(1);
    expect(pending[0].requestId).toBe('perm_2');
  });

  it('clearResolved → 移除已处理的请求', () => {
    const queue = new PermissionBubbleQueue();
    queue.enqueue(mockRequest, 'perm_1');
    queue.resolve('perm_1', true);
    queue.enqueue({ ...mockRequest, workerId: 'worker-2' }, 'perm_2');

    queue.clearResolved();
    expect(queue.size).toBe(1); // 仅 perm_2 (pending)
  });
});
