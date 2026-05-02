/** @suga/ai-auth — InMemoryAuthProvider测试 */

import { describe, expect, it } from 'vitest';
import {
  InMemoryTokenStorage,
  MockBrowserLauncher,
  createInMemoryAuthProvider
} from '../provider/InMemoryAuthImpl';

describe('InMemoryTokenStorage', () => {
  it('初始状态 → null', () => {
    const storage = new InMemoryTokenStorage();
    expect(storage.read()).toBeNull();
  });

  it('update后可read', () => {
    const storage = new InMemoryTokenStorage();
    storage.update({
      'server1|abc': {
        serverName: 'server1',
        serverUrl: 'https://example.com',
        accessToken: 'atk',
        expiresAt: 0
      }
    });
    const data = storage.read();
    expect(data).not.toBeNull();
    expect(data?.['server1|abc']?.accessToken).toBe('atk');
  });

  it('readAsync → 同read', async () => {
    const storage = new InMemoryTokenStorage();
    storage.update({
      key: {
        serverName: 's',
        serverUrl: 'https://example.com',
        accessToken: 'atk',
        expiresAt: 0
      }
    });
    const data = await storage.readAsync();
    expect(data?.key?.accessToken).toBe('atk');
  });

  it('clear → null', () => {
    const storage = new InMemoryTokenStorage();
    storage.update({
      key: { serverName: 's', serverUrl: 'https://e.com', accessToken: 'a', expiresAt: 0 }
    });
    storage.clear();
    expect(storage.read()).toBeNull();
  });

  it('getEntry → 获取指定条目', () => {
    const storage = new InMemoryTokenStorage();
    storage.update({
      k1: { serverName: 's', serverUrl: 'https://e.com', accessToken: 'a1', expiresAt: 0 }
    });
    expect(storage.getEntry('k1')?.accessToken).toBe('a1');
    expect(storage.getEntry('k2')).toBeUndefined();
  });
});

describe('MockBrowserLauncher', () => {
  it('openBrowser → 记录URL', async () => {
    const launcher = new MockBrowserLauncher();
    const result = await launcher.openBrowser('https://auth.example.com');
    expect(result).toBe(true);
    expect(launcher.openedUrls).toEqual(['https://auth.example.com']);
  });

  it('多次打开 → 多个URL', async () => {
    const launcher = new MockBrowserLauncher();
    await launcher.openBrowser('https://a.com');
    await launcher.openBrowser('https://b.com');
    expect(launcher.openedUrls.length).toBe(2);
  });

  it('clear → 清除记录', async () => {
    const launcher = new MockBrowserLauncher();
    await launcher.openBrowser('https://a.com');
    launcher.clear();
    expect(launcher.openedUrls.length).toBe(0);
  });
});

describe('createInMemoryAuthProvider', () => {
  it('创建完整的AuthProvider实例', () => {
    const { provider, storage, browser, crypto } = createInMemoryAuthProvider({
      serverName: 'test',
      serverUrl: 'https://mcp.example.com',
      redirectUri: 'http://localhost:3118/callback'
    });

    expect(provider).toBeDefined();
    expect(storage).toBeDefined();
    expect(browser).toBeDefined();
    expect(crypto).toBeDefined();
  });

  it('带onAuthorizationUrl callback', () => {
    const urls: string[] = [];
    const { provider } = createInMemoryAuthProvider(
      {
        serverName: 'test',
        serverUrl: 'https://mcp.example.com',
        redirectUri: 'http://localhost:3118/callback'
      },
      url => urls.push(url)
    );

    expect(provider).toBeDefined();
  });
});
