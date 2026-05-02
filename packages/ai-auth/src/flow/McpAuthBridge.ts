/**
 * McpAuthBridge — MCP认证桥接
 *
 * 连接ai-mcp包的markNeedsAuth/markAuthComplete到真实OAuth流程。 当MCP服务器返回401 → 自动触发OAuth认证 → 完成后重连。
 *
 * 对齐Claude Code services/mcp/auth.ts中auth状态管理逻辑：
 *
 * - 401 insufficient_scope → step-up认证
 * - 401 unauthorized → 完整OAuth流程
 * - 认证完成 → markAuthComplete + 自动重连
 */

import type { AuthProviderConfig, OAuthClientProvider } from '../types/mcp-auth-types';
import type { CryptoProvider, McpAuthBridgeProvider } from '../provider/AuthProviderInterface';
import { performMcpOAuthFlow } from './McpOAuthFlow';

/** McpAuthBridge — 连接MCP服务器认证状态到真实OAuth */

export class McpAuthBridge implements McpAuthBridgeProvider {
  private readonly provider: OAuthClientProvider;
  private readonly crypto: CryptoProvider;
  /** @internal 认证配置 — performMcpOAuthFlow使用 */
  public readonly _authConfig: AuthProviderConfig;

  /** 认证完成后的回调 — 用于通知宿主重连 */
  private onAuthComplete?: (serverName: string) => Promise<void>;

  constructor(
    provider: OAuthClientProvider,
    crypto: CryptoProvider,
    authConfig: AuthProviderConfig,
    onAuthComplete?: (serverName: string) => Promise<void>
  ) {
    this.provider = provider;
    this.crypto = crypto;
    this._authConfig = authConfig;
    this.onAuthComplete = onAuthComplete;
  }

  // ─── McpAuthBridgeProvider接口实现 ───

  /** 标记服务器需要认证 → 状态变为needs-auth */
  markNeedsAuth(_serverName: string): void {
    // 触发宿主的needs-auth状态更新
    // 实际OAuth流程由handleAuthRequired触发
  }

  /** 标记认证完成 → 尝试重新连接 */
  async markAuthComplete(serverName: string): Promise<void> {
    if (this.onAuthComplete) {
      await this.onAuthComplete(serverName);
    }
  }

  // ─── 公开方法 ───

  /**
   * handleAuthRequired — 当MCP服务器返回401时触发
   *
   * 流程：
   *
   * 1. 标记needs-auth
   * 2. 执行完整OAuth流程
   * 3. 标记auth-complete
   */
  async handleAuthRequired(serverName: string, serverUrl: string): Promise<void> {
    this.markNeedsAuth(serverName);

    await performMcpOAuthFlow(serverName, serverUrl, this.provider, this.crypto, this);

    await this.markAuthComplete(serverName);
  }

  /**
   * handleStepUpRequired — 当需要step-up认证时触发
   *
   * 标记pending scope → 在下次token获取时返回不含refreshToken的token → MCP SDK会检测到token不完整 → 触发re-auth
   */
  handleStepUpRequired(serverName: string, requiredScope: string): void {
    // 使用AuthProvider的markStepUpPending
    if ('markStepUpPending' in this.provider) {
      (this.provider as { markStepUpPending: (scope: string) => void }).markStepUpPending(
        requiredScope
      );
    }

    this.markNeedsAuth(serverName);
  }
}
