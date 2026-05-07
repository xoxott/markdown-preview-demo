import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_VSCODE_SDK_BRIDGE_CONFIG,
  createVSCodeSdkBridge
} from '../connection/vscodeSdkBridge';
import type {
  VSCodeSdkBridgeConfig,
  VSCodeSdkNotificationHandler
} from '../connection/vscodeSdkBridge';

describe('DEFAULT_VSCODE_SDK_BRIDGE_CONFIG', () => {
  it('disabled by default', () => {
    expect(DEFAULT_VSCODE_SDK_BRIDGE_CONFIG.enabled).toBe(false);
  });
});

describe('createVSCodeSdkBridge', () => {
  const handler: VSCodeSdkNotificationHandler = {
    onFileUpdated: vi.fn(),
    onLogEvent: vi.fn()
  };

  it('creates bridge with default config (disabled)', () => {
    const bridge = createVSCodeSdkBridge(handler);
    expect(bridge.enabled).toBe(false);
  });

  it('creates bridge with enabled config', () => {
    const config: VSCodeSdkBridgeConfig = { enabled: true };
    const bridge = createVSCodeSdkBridge(handler, config);
    expect(bridge.enabled).toBe(true);
  });

  it('disabled bridge does not send notifications', () => {
    const bridge = createVSCodeSdkBridge(handler);
    bridge.notifyFileUpdated('/test.ts');
    bridge.notifyLogEvent('info', 'test message');
    expect(handler.onFileUpdated).not.toHaveBeenCalled();
    expect(handler.onLogEvent).not.toHaveBeenCalled();
  });

  it('enabled bridge sends file_updated notification', () => {
    vi.clearAllMocks();
    const config: VSCodeSdkBridgeConfig = { enabled: true };
    const bridge = createVSCodeSdkBridge(handler, config);
    bridge.notifyFileUpdated('/src/app.ts', 'content');
    expect(handler.onFileUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'file_updated', filePath: '/src/app.ts' })
    );
  });

  it('enabled bridge sends log_event notification', () => {
    vi.clearAllMocks();
    const config: VSCodeSdkBridgeConfig = { enabled: true };
    const bridge = createVSCodeSdkBridge(handler, config);
    bridge.notifyLogEvent('warn', 'deprecation warning', 'ts-server');
    expect(handler.onLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'log_event', level: 'warn', message: 'deprecation warning' })
    );
  });
});
