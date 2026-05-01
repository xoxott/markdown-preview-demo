/** MCP 连接状态测试 */

import { describe, expect, it } from 'vitest';
import type { McpServerConnection, PendingMcpServer } from '../types/mcp-connection';
import {
  getConnectionName,
  getConnectionStateType,
  hasFailed,
  isDisabled,
  isMcpConnected,
  isReconnecting,
  needsAuthentication
} from '../types/mcp-connection';
import type { ScopedMcpServerConfig } from '../types/mcp-scope';

const baseConfig: ScopedMcpServerConfig = { command: 'node', args: [], scope: 'user' };

describe('getConnectionName', () => {
  it('返回所有状态的名称', () => {
    const states: McpServerConnection[] = [
      { type: 'connected', name: 'server1', config: baseConfig, capabilities: {} },
      { type: 'failed', name: 'server2', config: baseConfig },
      { type: 'needs-auth', name: 'server3', config: baseConfig },
      { type: 'pending', name: 'server4', config: baseConfig },
      { type: 'disabled', name: 'server5', config: baseConfig }
    ];
    for (const conn of states) {
      expect(getConnectionName(conn)).toBe(conn.name);
    }
  });
});

describe('isMcpConnected', () => {
  it('connected → true', () => {
    expect(
      isMcpConnected({ type: 'connected', name: 's', config: baseConfig, capabilities: {} })
    ).toBe(true);
  });
  it('其他状态 → false', () => {
    expect(isMcpConnected({ type: 'failed', name: 's', config: baseConfig })).toBe(false);
    expect(isMcpConnected({ type: 'pending', name: 's', config: baseConfig })).toBe(false);
  });
});

describe('getConnectionStateType', () => {
  it('返回正确状态类型字符串', () => {
    expect(
      getConnectionStateType({ type: 'connected', name: 's', config: baseConfig, capabilities: {} })
    ).toBe('connected');
    expect(getConnectionStateType({ type: 'failed', name: 's', config: baseConfig })).toBe(
      'failed'
    );
  });
});

describe('isReconnecting', () => {
  it('pending + reconnectAttempt>0 → true', () => {
    const conn: PendingMcpServer = {
      type: 'pending',
      name: 's',
      config: baseConfig,
      reconnectAttempt: 2
    };
    expect(isReconnecting(conn)).toBe(true);
  });
  it('pending + reconnectAttempt=0 → false', () => {
    expect(
      isReconnecting({ type: 'pending', name: 's', config: baseConfig, reconnectAttempt: 0 })
    ).toBe(false);
  });
  it('pending + 无 reconnectAttempt → false', () => {
    expect(isReconnecting({ type: 'pending', name: 's', config: baseConfig })).toBe(false);
  });
  it('其他状态 → false', () => {
    expect(
      isReconnecting({ type: 'connected', name: 's', config: baseConfig, capabilities: {} })
    ).toBe(false);
  });
});

describe('needsAuthentication', () => {
  it('needs-auth → true', () => {
    expect(needsAuthentication({ type: 'needs-auth', name: 's', config: baseConfig })).toBe(true);
  });
  it('其他 → false', () => {
    expect(
      needsAuthentication({ type: 'connected', name: 's', config: baseConfig, capabilities: {} })
    ).toBe(false);
  });
});

describe('hasFailed', () => {
  it('failed → true', () => {
    expect(hasFailed({ type: 'failed', name: 's', config: baseConfig })).toBe(true);
  });
  it('其他 → false', () => {
    expect(hasFailed({ type: 'connected', name: 's', config: baseConfig, capabilities: {} })).toBe(
      false
    );
  });
});

describe('isDisabled', () => {
  it('disabled → true', () => {
    expect(isDisabled({ type: 'disabled', name: 's', config: baseConfig })).toBe(true);
  });
  it('其他 → false', () => {
    expect(isDisabled({ type: 'connected', name: 's', config: baseConfig, capabilities: {} })).toBe(
      false
    );
  });
});
