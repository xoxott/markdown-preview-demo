/** @suga/ai-auth — OAuthFlow测试 */

import { describe, expect, it, vi } from 'vitest';
import { performTokenRefresh, revokeTokens } from '../flow/OAuthFlow';
import { createInMemoryAuthProvider } from '../provider/InMemoryAuthImpl';
import type { AuthProviderConfig, FetchLike } from '../types/mcp-auth-types';
import { InvalidGrantError, OAuthError } from '../errors/auth-errors';
import { generateCodeChallenge, generateCodeVerifier, generateState } from '../crypto/pkce';

const defaultConfig: AuthProviderConfig = {
  serverName: 'test-server',
  serverUrl: 'https://auth.example.com',
  redirectUri: 'http://localhost:3118/callback'
};

// ─── Mock Fetch ───

function createMockFetch(
  responses: Map<string, { status: number; body: Record<string, unknown> }>
): FetchLike {
  return async (url: string | URL, init?: RequestInit) => {
    const urlStr = url.toString();
    const matched =
      responses.get(urlStr) ?? responses.get(new URL(urlStr).origin + new URL(urlStr).pathname);

    if (!matched) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    }

    return new Response(JSON.stringify(matched.body), { status: matched.status });
  };
}

function tokenSuccessBody(
  accessToken = 'new-atk',
  refreshToken = 'new-rtk',
  expiresIn = 3600
): Record<string, unknown> {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    token_type: 'Bearer',
    scope: 'openid profile'
  };
}

describe('OAuthFlow', () => {
  describe('performTokenRefresh', () => {
    it('成功刷新 → 返回新token', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();

      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://auth.example.com',
          accessToken: 'old-atk',
          refreshToken: 'old-rtk',
          expiresAt: Date.now() + 60000,
          scope: 'openid',
          clientId: 'my-client'
        }
      });

      const mockFetch = createMockFetch(
        new Map([['https://auth.example.com/token', { status: 200, body: tokenSuccessBody() }]])
      );

      const tokens = await performTokenRefresh(provider, 'old-rtk', defaultConfig, 1, mockFetch);
      expect(tokens?.accessToken).toBe('new-atk');
      expect(tokens?.refreshToken).toBe('new-rtk');
      expect(tokens?.scopes).toEqual(['openid', 'profile']);
    });

    it('invalid_grant → 抛出InvalidGrantError', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://auth.example.com',
          accessToken: 'atk',
          refreshToken: 'rtk',
          expiresAt: Date.now() + 60000,
          scope: 'openid',
          clientId: 'cid'
        }
      });

      const mockFetch = createMockFetch(
        new Map([
          [
            'https://auth.example.com/token',
            {
              status: 400,
              body: { error: 'invalid_grant', error_description: 'Token expired' }
            }
          ]
        ])
      );

      await expect(
        performTokenRefresh(provider, 'rtk', defaultConfig, 1, mockFetch)
      ).rejects.toThrow(InvalidGrantError);
    });

    it('5xx → ServerError可重试', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://auth.example.com',
          accessToken: 'atk',
          refreshToken: 'rtk',
          expiresAt: Date.now() + 60000,
          clientId: 'cid'
        }
      });

      let callCount = 0;
      const mockFetch: FetchLike = async () => {
        callCount++;
        if (callCount === 1) {
          return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 });
        }
        return new Response(JSON.stringify(tokenSuccessBody()), { status: 200 });
      };

      const tokens = await performTokenRefresh(provider, 'rtk', defaultConfig, 3, mockFetch);
      expect(tokens?.accessToken).toBe('new-atk');
      expect(callCount).toBe(2);
    });

    it('4xx OAuth error → 不重试', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://auth.example.com',
          accessToken: 'atk',
          expiresAt: Date.now() + 60000,
          clientId: 'cid'
        }
      });

      const mockFetch = createMockFetch(
        new Map([
          [
            'https://auth.example.com/token',
            {
              status: 401,
              body: { error: 'unauthorized_client', error_description: 'Bad client' }
            }
          ]
        ])
      );

      await expect(
        performTokenRefresh(provider, 'rtk', defaultConfig, 3, mockFetch)
      ).rejects.toThrow(OAuthError);
    });
  });

  describe('revokeTokens', () => {
    it('撤销token → 清除本地凭据(all)', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();

      await provider.saveTokens({
        accessToken: 'atk-to-revoke',
        refreshToken: 'rtk-to-revoke',
        expiresAt: Date.now() + 3600000,
        scopes: ['openid'],
        subscriptionType: null,
        rateLimitTier: null
      });

      const mockFetch = createMockFetch(
        new Map([['https://auth.example.com/revoke', { status: 200, body: {} }]])
      );

      await revokeTokens(provider, defaultConfig, undefined, mockFetch);

      const data = storage.read();
      expect(data?.[serverKey]).toBeUndefined();
    });

    it('preserveStepUpState → 只清除tokens', async () => {
      const { provider, storage } = createInMemoryAuthProvider(defaultConfig);
      const serverKey = provider.getServerKey();

      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://auth.example.com',
          accessToken: 'atk',
          refreshToken: 'rtk',
          expiresAt: Date.now() + 3600000,
          clientId: 'cid'
        }
      });

      const mockFetch = createMockFetch(
        new Map([['https://auth.example.com/revoke', { status: 200, body: {} }]])
      );

      await revokeTokens(provider, defaultConfig, { preserveStepUpState: true }, mockFetch);

      const entry = storage.getEntry(serverKey);
      expect(entry?.accessToken).toBe('');
      expect(entry?.clientId).toBe('cid');
    });

    it('无token → 直接返回', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      const mockFetch = vi.fn() as FetchLike;
      await revokeTokens(provider, defaultConfig, undefined, mockFetch);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('revoke网络失败 → graceful忽略', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      await provider.saveTokens({
        accessToken: 'atk',
        refreshToken: 'rtk',
        expiresAt: Date.now() + 3600000,
        scopes: ['openid'],
        subscriptionType: null,
        rateLimitTier: null
      });

      const mockFetch: FetchLike = async () => {
        throw new Error('Network error');
      };
      await revokeTokens(provider, defaultConfig, undefined, mockFetch);
    });

    it('503响应 → graceful忽略', async () => {
      const { provider } = createInMemoryAuthProvider(defaultConfig);
      await provider.saveTokens({
        accessToken: 'atk',
        refreshToken: 'rtk',
        expiresAt: Date.now() + 3600000,
        scopes: ['openid'],
        subscriptionType: null,
        rateLimitTier: null
      });

      const mockFetch = createMockFetch(
        new Map([['https://auth.example.com/revoke', { status: 503, body: {} }]])
      );

      await revokeTokens(provider, defaultConfig, undefined, mockFetch);
    });
  });

  describe('PKCE参数生成（performOAuthFlow前置）', () => {
    it('codeVerifier/codeChallenge/state → 正确生成', async () => {
      const { crypto } = createInMemoryAuthProvider(defaultConfig);
      const codeVerifier = generateCodeVerifier(crypto);
      expect(codeVerifier.length).toBeGreaterThan(0);

      const codeChallenge = generateCodeChallenge(crypto, codeVerifier);
      expect(codeChallenge.length).toBeGreaterThan(0);
      expect(codeChallenge).not.toBe(codeVerifier); // S256变换

      const state = generateState(crypto);
      expect(state.length).toBeGreaterThan(0);
    });
  });
});
