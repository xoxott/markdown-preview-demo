/** @suga/ai-auth — AuthProvider核心测试 */

import { describe, expect, it } from 'vitest';
import { createInMemoryAuthProvider } from '../provider/InMemoryAuthImpl';
import type { OAuthClientInformationFull } from '../types/mcp-auth-types';

const defaultConfig = {
  serverName: 'test-server',
  serverUrl: 'https://mcp.example.com',
  redirectUri: 'http://localhost:3118/callback'
};

describe('AuthProvider', () => {
  describe('clientInformation', () => {
    it('无存储 → undefined', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      const info = await provider.clientInformation();
      expect(info).toBeUndefined();
    });

    it('存储有clientId → 返回客户端信息', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://mcp.example.com',
          accessToken: 'atk',
          expiresAt: Date.now() + 3600000,
          clientId: 'my-client',
          clientSecret: 'my-secret'
        }
      });
      const info = await provider.clientInformation();
      expect(info?.client_id).toBe('my-client');
      expect(info?.client_secret).toBe('my-secret');
    });

    it('配置有clientId → 返回配置的clientId', async () => {
      const { provider } = createInMemoryAuthProvider({
        ...defaultConfig,
        clientId: 'config-client'
      });
      const info = await provider.clientInformation();
      expect(info?.client_id).toBe('config-client');
      expect(info?.client_secret).toBeUndefined();
    });
  });

  describe('saveClientInformation', () => {
    it('保存后可读取', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const info: OAuthClientInformationFull = {
        client_id: 'dcr-client',
        client_secret: 'dcr-secret',
        client_name: 'Test DCR Client'
      };
      await provider.saveClientInformation(info);

      const serverKey = provider.getServerKey();
      const entry = storage.getEntry(serverKey);
      expect(entry?.clientId).toBe('dcr-client');
      expect(entry?.clientSecret).toBe('dcr-secret');
    });
  });

  describe('tokens', () => {
    it('无存储 → undefined', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      const tokens = await provider.tokens();
      expect(tokens).toBeUndefined();
    });

    it('有效token → 返回token数据', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://mcp.example.com',
          accessToken: 'atk123',
          refreshToken: 'rtk456',
          expiresAt: Date.now() + 3600000,
          scope: 'openid profile'
        }
      });

      const tokens = await provider.tokens();
      expect(tokens?.accessToken).toBe('atk123');
      expect(tokens?.refreshToken).toBe('rtk456');
      expect(tokens?.scopes).toEqual(['openid', 'profile']);
    });

    it('过期且无refresh_token → undefined', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://mcp.example.com',
          accessToken: 'expired-atk',
          expiresAt: Date.now() - 10000 // 已过期
        }
      });

      const tokens = await provider.tokens();
      expect(tokens).toBeUndefined();
    });
  });

  describe('saveTokens', () => {
    it('保存后可读取', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      await provider.saveTokens({
        accessToken: 'new-atk',
        refreshToken: 'new-rtk',
        expiresAt: Date.now() + 3600000,
        scopes: ['openid', 'profile', 'email'],
        subscriptionType: 'pro',
        rateLimitTier: null
      });

      const serverKey = provider.getServerKey();
      const entry = storage.getEntry(serverKey);
      expect(entry?.accessToken).toBe('new-atk');
      expect(entry?.refreshToken).toBe('new-rtk');
      expect(entry?.scope).toBe('openid profile email');
    });
  });

  describe('codeVerifier', () => {
    it('未保存 → 抛出NoCodeVerifierError', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      await expect(provider.codeVerifier()).rejects.toThrow('No code verifier saved');
    });

    it('保存后可读取', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      await provider.saveCodeVerifier('my-verifier');
      const verifier = await provider.codeVerifier();
      expect(verifier).toBe('my-verifier');
    });
  });

  describe('invalidateCredentials', () => {
    it('scope=all → 删除所有数据', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://mcp.example.com',
          accessToken: 'atk',
          expiresAt: Date.now() + 3600000,
          clientId: 'cid',
          clientSecret: 'cs'
        }
      });

      await provider.invalidateCredentials('all');
      const data = storage.read();
      expect(data?.[serverKey]).toBeUndefined();
    });

    it('scope=tokens → 清除token', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://mcp.example.com',
          accessToken: 'atk',
          refreshToken: 'rtk',
          expiresAt: Date.now() + 3600000,
          clientId: 'cid'
        }
      });

      await provider.invalidateCredentials('tokens');
      const entry = storage.getEntry(serverKey);
      expect(entry?.accessToken).toBe('');
      expect(entry?.refreshToken).toBeUndefined();
      expect(entry?.expiresAt).toBe(0);
      expect(entry?.clientId).toBe('cid'); // clientId保留
    });

    it('scope=verifier → 清除codeVerifier', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      await provider.saveCodeVerifier('verifier-123');
      // 验证save成功
      const saved = await provider.codeVerifier();
      expect(saved).toBe('verifier-123');
      // invalidate
      await provider.invalidateCredentials('verifier');
      // 验证清除成功
      await expect(provider.codeVerifier()).rejects.toThrow('No code verifier saved');
    });
  });

  describe('discoveryState', () => {
    it('保存后可读取', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      await provider.saveDiscoveryState({
        authorizationServerUrl: 'https://auth.example.com',
        resourceMetadataUrl: 'https://res.example.com/.well-known'
      });

      const state = await provider.discoveryState();
      expect(state?.authorizationServerUrl).toBe('https://auth.example.com');
      expect(state?.resourceMetadataUrl).toBe('https://res.example.com/.well-known');
    });

    it('无数据 → undefined', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      const state = await provider.discoveryState();
      expect(state).toBeUndefined();
    });
  });

  describe('markStepUpPending', () => {
    it('标记后tokens()返回不含refreshToken', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://mcp.example.com',
          accessToken: 'atk',
          refreshToken: 'rtk',
          expiresAt: Date.now() + 3600000,
          scope: 'openid'
        }
      });

      provider.markStepUpPending('admin');
      const tokens = await provider.tokens();
      // step-up pending时refreshToken应为空字符串（不是undefined）
      expect(tokens?.refreshToken).toBe('');
    });
  });

  describe('redirectToAuthorization', () => {
    it('调用browserLauncher', async () => {
      const { provider, browser } = createInMemoryAuthProvider(defaultConfig);
      const url = new URL('https://auth.example.com/authorize?code=true&client_id=test');
      await provider.redirectToAuthorization(url);
      expect(browser.openedUrls.length).toBeGreaterThan(0);
    });

    it('skipBrowserOpen → 不打开浏览器', async () => {
      const { provider, browser } = createInMemoryAuthProvider({
        ...defaultConfig,
        skipBrowserOpen: true
      });
      const url = new URL('https://auth.example.com/authorize');
      await provider.redirectToAuthorization(url);
      expect(browser.openedUrls.length).toBe(0);
    });

    it('onAuthorizationUrl callback → 通知URL', async () => {
      const urls: string[] = [];
      const { provider } = createInMemoryAuthProvider(defaultConfig, url => urls.push(url));
      const url = new URL('https://auth.example.com/authorize?scope=openid');
      await provider.redirectToAuthorization(url);
      expect(urls.length).toBeGreaterThan(0);
      expect(urls[0]).toContain('auth.example.com');
    });
  });

  describe('state', () => {
    it('生成后保持稳定', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      const s1 = await provider.state();
      const s2 = await provider.state();
      expect(s1).toBe(s2);
    });
  });

  describe('getServerKey', () => {
    it('生成唯一key', () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      const key = provider.getServerKey();
      expect(key).toContain('test-server|');
    });
  });
});
