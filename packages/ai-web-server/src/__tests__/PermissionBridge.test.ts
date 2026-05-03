/** PermissionBridge 测试 — 权限请求双向桥接 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionBridge } from '../ws/PermissionBridge';

/** 创建 mock WebSocket 对象 */
function createMockWebSocket(): {
  ws: { send: ReturnType<typeof vi.fn>; readyState: number };
  messages: unknown[];
} {
  const messages: unknown[] = [];
  const ws = {
    send: vi.fn((data: string) => {
      messages.push(JSON.parse(data));
    }),
    readyState: 1 // WebSocket.OPEN
  };
  return { ws, messages };
}

describe('PermissionBridge', () => {
  let bridge: PermissionBridge;
  let mock: ReturnType<typeof createMockWebSocket>;

  beforeEach(() => {
    mock = createMockWebSocket();
    // PermissionBridge 构造函数接受 WebSocket 类型
    // 使用 mock 对象（duck typing: send + readyState）
    bridge = new PermissionBridge(mock.ws as any, 5000);
  });

  it('requestPermission → 发送control_request到ws', async () => {
    const requestId = 'perm_test_1';

    // 启动权限请求
    const requestPromise = bridge.requestPermission(requestId, {
      subtype: 'can_use_tool',
      tool_name: 'bash',
      tool_use_id: 'tool_1'
    });

    // 应发送了 control_request
    expect(mock.messages.length).toBe(1);
    const sentMsg = mock.messages[0] as { type: string; request_id: string };
    expect(sentMsg.type).toBe('control_request');
    expect(sentMsg.request_id).toBe(requestId);

    // 浏览器返回允许响应
    bridge.handleResponse({
      type: 'control_response',
      request_id: requestId,
      success: true,
      response: { behavior: 'allow' }
    });

    const result = await requestPromise;
    expect(result.success).toBe(true);
  });

  it('handleResponse → deny → 权限拒绝', async () => {
    const requestId = 'perm_test_2';
    const requestPromise = bridge.requestPermission(requestId, {
      subtype: 'can_use_tool',
      tool_name: 'bash',
      tool_use_id: 'tool_2'
    });

    // 返回拒绝响应
    bridge.handleResponse({
      type: 'control_response',
      request_id: requestId,
      success: false,
      error: 'User denied permission'
    });

    const result = await requestPromise;
    expect(result.success).toBe(false);
    expect(result.error).toBe('User denied permission');
  });

  it('handleCancel → 取消权限请求', async () => {
    const requestId = 'perm_test_3';
    const requestPromise = bridge.requestPermission(requestId, {
      subtype: 'can_use_tool',
      tool_name: 'bash',
      tool_use_id: 'tool_3'
    });

    bridge.handleCancel(requestId);

    const result = await requestPromise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('cancelled');
  });

  it('rejectAll → reject所有pending请求', async () => {
    const promise1 = bridge.requestPermission('perm_a', { subtype: 'can_use_tool' });
    const promise2 = bridge.requestPermission('perm_b', { subtype: 'can_use_tool' });

    bridge.rejectAll('Connection closed');

    const result1 = await promise1;
    const result2 = await promise2;
    expect(result1.success).toBe(false);
    expect(result1.error).toBe('Connection closed');
    expect(result2.success).toBe(false);
    expect(result2.error).toBe('Connection closed');
  });

  it('超时 → 自动deny', async () => {
    const shortTimeoutBridge = new PermissionBridge(mock.ws as any, 100);

    const requestId = 'perm_timeout';
    const requestPromise = shortTimeoutBridge.requestPermission(requestId, {
      subtype: 'can_use_tool',
      tool_name: 'bash',
      tool_use_id: 'tool_timeout'
    });

    const result = await requestPromise;
    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
  });

  it('未知requestId → handleResponse不resolve', () => {
    // 发送不匹配的requestId → 不影响任何pending
    bridge.handleResponse({
      type: 'control_response',
      request_id: 'unknown_id',
      success: true,
      response: {}
    });

    // 不应抛错 — 只是忽略
    expect(true).toBe(true);
  });

  it('ws.readyState != OPEN → send不调用', async () => {
    mock.ws.readyState = 3; // WebSocket.CLOSED

    const requestId = 'perm_closed';
    const requestPromise = bridge.requestPermission(requestId, {
      subtype: 'can_use_tool',
      tool_name: 'bash',
      tool_use_id: 'tool_closed'
    });

    // send 不应被调用（readyState != OPEN）
    expect(mock.ws.send).not.toHaveBeenCalled();

    // 但请求仍然 pending（超时后 resolve）
    bridge.rejectAll('closed');
    await requestPromise;
  });
});
