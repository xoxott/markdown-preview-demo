/**
 * VSCode SDK MCP 桥接 — file_updated/log_event 通知桥接
 *
 * N38: 对齐 CC vscodeSdkMcp.ts 将 VSCode 扩展的文件变更和日志事件转发为 MCP 通知。
 */

export interface VSCodeSdkBridgeConfig {
  readonly enabled: boolean;
  readonly bridgePath?: string;
}

export const DEFAULT_VSCODE_SDK_BRIDGE_CONFIG: VSCodeSdkBridgeConfig = {
  enabled: false
};

/** VSCode 文件变更通知 */
export interface VSCodeFileUpdatedNotification {
  readonly type: 'file_updated';
  readonly filePath: string;
  readonly content?: string;
  readonly timestamp: number;
}

/** VSCode 日志事件通知 */
export interface VSCodeLogEventNotification {
  readonly type: 'log_event';
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly source?: string;
  readonly timestamp: number;
}

/** VSCodeSdkNotificationHandler — 宿主注入 */
export interface VSCodeSdkNotificationHandler {
  readonly onFileUpdated: (notification: VSCodeFileUpdatedNotification) => void;
  readonly onLogEvent: (notification: VSCodeLogEventNotification) => void;
}

export interface VSCodeSdkBridge {
  readonly notifyFileUpdated: (filePath: string, content?: string) => void;
  readonly notifyLogEvent: (
    level: VSCodeLogEventNotification['level'],
    message: string,
    source?: string
  ) => void;
  readonly enabled: boolean;
}

class VSCodeSdkBridgeImpl implements VSCodeSdkBridge {
  constructor(
    private readonly handler: VSCodeSdkNotificationHandler,
    private readonly config: VSCodeSdkBridgeConfig
  ) {}

  get enabled(): boolean {
    return this.config.enabled;
  }

  notifyFileUpdated(filePath: string, content?: string): void {
    if (!this.config.enabled) return;
    this.handler.onFileUpdated({ type: 'file_updated', filePath, content, timestamp: Date.now() });
  }

  notifyLogEvent(
    level: VSCodeLogEventNotification['level'],
    message: string,
    source?: string
  ): void {
    if (!this.config.enabled) return;
    this.handler.onLogEvent({ type: 'log_event', level, message, source, timestamp: Date.now() });
  }
}

/** createVSCodeSdkBridge — 创建桥接实例 */
export function createVSCodeSdkBridge(
  handler: VSCodeSdkNotificationHandler,
  config?: VSCodeSdkBridgeConfig
): VSCodeSdkBridge {
  const effectiveConfig = config ?? DEFAULT_VSCODE_SDK_BRIDGE_CONFIG;
  return new VSCodeSdkBridgeImpl(handler, effectiveConfig);
}
