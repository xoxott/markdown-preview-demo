/**
 * AuthProviderInterface — OAuth认证的宿主注入接口
 *
 * 对齐@suga宿主注入模式：所有I/O操作（token存储、浏览器、加密、网络） 通过provider接口注入，核心逻辑不直接依赖任何具体实现。
 *
 * 对齐Claude Code ClaudeAuthProvider对secureStorage + browser + crypto的依赖。
 */

import type { OAuthDiscoveryState } from '../types/mcp-auth-types';

// ─── Token Storage Provider ───

/** Token存储条目 — 存储provider中的数据格式 */
export interface TokenStorageEntry {
  readonly serverName: string;
  readonly serverUrl: string;
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt: number;
  readonly scope?: string;
  readonly clientId?: string;
  readonly clientSecret?: string;
  readonly discoveryState?: OAuthDiscoveryState;
  readonly stepUpScope?: string;
}

/** Token存储provider接口 — 宿主注入真实实现（如keychain、加密文件） */
export interface TokenStorageProvider {
  /** 同步读取所有token数据 */
  read(): Record<string, TokenStorageEntry> | null;

  /** 异步读取所有token数据（某些存储需要异步，如macOS keychain） */
  readAsync(): Promise<Record<string, TokenStorageEntry> | null>;

  /** 更新所有token数据 */
  update(data: Record<string, TokenStorageEntry>): void;
}

// ─── Browser Launcher ───

/** 浏览器打开接口 — 宿主注入UI环境实现 */
export interface BrowserLauncher {
  /** 尝试在浏览器中打开URL */
  openBrowser(url: string): Promise<boolean>;
}

// ─── Crypto Provider ───

/** 加密操作接口 — 宿主注入crypto实现（Node.js或Web Crypto API） */
export interface CryptoProvider {
  /** 生成随机字节 */
  randomBytes(size: number): Buffer;

  /** 创建hash实例（链式调用 update→digest） */
  createHash(algorithm: string): HashInstance;
}

/** Hash实例 — 链式调用 update→digest */
export interface HashInstance {
  update(data: string): HashInstance;
  digest(): Buffer;
}

// ─── MCP Auth Bridge Provider ───

/**
 * MCP认证桥接接口 — 连接ai-mcp包的认证状态管理
 *
 * 对齐McpConnectionManager.markNeedsAuth/markAuthComplete。 当ai-mcp可用时，宿主可直接注入McpConnectionManager实例。
 */
export interface McpAuthBridgeProvider {
  /** 标记服务器需要认证 → 状态变为needs-auth */
  markNeedsAuth(serverName: string): void;

  /** 标记认证完成 → 尝试重新连接 */
  markAuthComplete(serverName: string): Promise<void>;
}

// ─── Auth Provider 完整注入 ───

/** AuthProvider依赖注入配置 — 所有provider的组合 */
export interface AuthProviderDependencies {
  readonly storage: TokenStorageProvider;
  readonly browser: BrowserLauncher;
  readonly crypto: CryptoProvider;
  readonly bridge?: McpAuthBridgeProvider;
  /** OAuth配置（clientId、tokenUrl等），宿主注入 */
  readonly oauthConfig?: OAuthConfig;
}

/** OAuth配置 — 宿主注入的OAuth端点信息 */
export interface OAuthConfig {
  readonly clientId: string;
  readonly authorizeUrl: string;
  readonly tokenUrl: string;
  readonly redirectUrl?: string;
  readonly scope?: string;
}
