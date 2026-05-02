/**
 * InMemoryAuthProvider — 内存实现（测试/开发环境）
 *
 * 提供InMemoryTokenStorage + MockBrowserLauncher + 简化AuthProvider。 不依赖任何外部存储/keychain，纯内存数据。
 */

import type { AuthProviderConfig } from '../types/mcp-auth-types';
import { NodeCryptoProvider } from '../crypto/random';
import type {
  BrowserLauncher,
  TokenStorageEntry,
  TokenStorageProvider
} from './AuthProviderInterface';
import { AuthProvider } from './AuthProvider';

// ─── InMemoryTokenStorage ───

/** 内存Token存储 — 用于测试环境 */
export class InMemoryTokenStorage implements TokenStorageProvider {
  private data: Record<string, TokenStorageEntry> = {};

  read(): Record<string, TokenStorageEntry> | null {
    return Object.keys(this.data).length > 0 ? { ...this.data } : null;
  }

  readAsync(): Promise<Record<string, TokenStorageEntry> | null> {
    return Promise.resolve(this.read());
  }

  update(data: Record<string, TokenStorageEntry>): void {
    this.data = { ...data };
  }

  /** 清除所有数据 */
  clear(): void {
    this.data = {};
  }

  /** 获取指定serverKey的条目 */
  getEntry(serverKey: string): TokenStorageEntry | undefined {
    return this.data[serverKey];
  }
}

// ─── MockBrowserLauncher ───

/** Mock浏览器启动器 — 记录URL但不实际打开 */
export class MockBrowserLauncher implements BrowserLauncher {
  readonly openedUrls: string[] = [];

  async openBrowser(url: string): Promise<boolean> {
    this.openedUrls.push(url);
    return true;
  }

  /** 清除记录 */
  clear(): void {
    this.openedUrls.length = 0;
  }
}

// ─── 创建内存AuthProvider ───

/** 创建内存AuthProvider — 测试环境便捷工厂 */
export function createInMemoryAuthProvider(
  config: AuthProviderConfig,
  onAuthorizationUrl?: (url: string) => void
): {
  provider: AuthProvider;
  storage: InMemoryTokenStorage;
  browser: MockBrowserLauncher;
  crypto: NodeCryptoProvider;
} {
  const storage = new InMemoryTokenStorage();
  const browser = new MockBrowserLauncher();
  const crypto = new NodeCryptoProvider();

  const provider = new AuthProvider(
    config,
    storage,
    browser,
    crypto,
    undefined, // no MCP bridge
    onAuthorizationUrl
  );

  return { provider, storage, browser, crypto };
}
