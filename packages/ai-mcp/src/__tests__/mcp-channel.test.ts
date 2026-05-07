import { describe, expect, it } from 'vitest';
import { isChannelAllowed } from '../types/mcp-channel';
import type {
  ChannelAllowlistConfig,
  ChannelNotification,
  ChannelPermissionRelay
} from '../types/mcp-channel';

describe('isChannelAllowed', () => {
  it('allows server in allowlist', () => {
    const config: ChannelAllowlistConfig = {
      enabled: true,
      allowedServers: ['slack', 'github']
    };
    expect(isChannelAllowed('slack', config)).toBe(true);
  });

  it('blocks server not in allowlist', () => {
    const config: ChannelAllowlistConfig = {
      enabled: true,
      allowedServers: ['slack']
    };
    expect(isChannelAllowed('discord', config)).toBe(false);
  });

  it('wildcard allows any server', () => {
    const config: ChannelAllowlistConfig = {
      enabled: true,
      allowedServers: ['*']
    };
    expect(isChannelAllowed('anything', config)).toBe(true);
  });

  it('disabled → always false', () => {
    const config: ChannelAllowlistConfig = {
      enabled: false,
      allowedServers: ['slack']
    };
    expect(isChannelAllowed('slack', config)).toBe(false);
  });
});

describe('ChannelNotification type', () => {
  it('is usable', () => {
    const notification: ChannelNotification = {
      type: 'channel_notification',
      serverName: 'slack',
      messageType: 'message',
      content: 'New PR comment',
      sender: 'user1',
      timestamp: Date.now()
    };
    expect(notification.serverName).toBe('slack');
    expect(notification.messageType).toBe('message');
  });
});

describe('ChannelPermissionRelay type', () => {
  it('is usable', () => {
    const relay: ChannelPermissionRelay = {
      type: 'permission_relay',
      serverName: 'slack',
      toolName: 'bash',
      inputHash: 'abc123',
      decision: 'allow'
    };
    expect(relay.decision).toBe('allow');
  });
});
