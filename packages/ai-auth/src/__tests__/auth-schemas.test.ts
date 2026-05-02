/** @suga/ai-auth — Zod Schema测试 */

import { describe, expect, it } from 'vitest';
import {
  AuthProviderConfigSchema,
  OAuthConfigSchema,
  OAuthDiscoveryStateSchema,
  OAuthErrorResponseSchema,
  OAuthTokenExchangeResponseSchema,
  SubscriptionTypeSchema,
  TokenStorageEntrySchema
} from '../schemas/auth-schemas';

describe('SubscriptionTypeSchema', () => {
  it('合法值', () => {
    expect(SubscriptionTypeSchema.parse('max')).toBe('max');
    expect(SubscriptionTypeSchema.parse('pro')).toBe('pro');
    expect(SubscriptionTypeSchema.parse('enterprise')).toBe('enterprise');
    expect(SubscriptionTypeSchema.parse('team')).toBe('team');
  });

  it('null → 允许（nullable）', () => {
    expect(SubscriptionTypeSchema.nullable().parse(null)).toBeNull();
  });

  it('非法值 → 错误', () => {
    expect(() => SubscriptionTypeSchema.parse('free')).toThrow();
  });
});

describe('OAuthTokenExchangeResponseSchema', () => {
  it('完整数据 → 校验成功', () => {
    const data = {
      access_token: 'atk123',
      refresh_token: 'rtk456',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'openid profile',
      account: { uuid: 'u1', email_address: 'test@test.com' },
      organization: { uuid: 'o1' }
    };
    expect(OAuthTokenExchangeResponseSchema.parse(data)).toEqual(data);
  });

  it('最简数据 → 校验成功', () => {
    const data = {
      access_token: 'atk',
      refresh_token: 'rtk',
      expires_in: 3600,
      token_type: 'Bearer'
    };
    expect(OAuthTokenExchangeResponseSchema.parse(data)).toEqual(data);
  });

  it('缺少access_token → 错误', () => {
    expect(() =>
      OAuthTokenExchangeResponseSchema.parse({
        refresh_token: 'rtk',
        expires_in: 3600,
        token_type: 'Bearer'
      })
    ).toThrow();
  });
});

describe('OAuthErrorResponseSchema', () => {
  it('标准错误响应', () => {
    const data = { error: 'access_denied', error_description: 'User denied' };
    expect(OAuthErrorResponseSchema.parse(data)).toEqual(data);
  });

  it('仅error字段', () => {
    const data = { error: 'server_error' };
    const parsed = OAuthErrorResponseSchema.parse(data);
    expect(parsed.error).toBe('server_error');
  });
});

describe('OAuthDiscoveryStateSchema', () => {
  it('完整数据', () => {
    const data = {
      authorizationServerUrl: 'https://auth.example.com',
      resourceMetadataUrl: 'https://resource.example.com/.well-known'
    };
    expect(OAuthDiscoveryStateSchema.parse(data)).toEqual(data);
  });

  it('空数据 → 成功（都是optional）', () => {
    expect(OAuthDiscoveryStateSchema.parse({})).toEqual({});
  });
});

describe('TokenStorageEntrySchema', () => {
  it('完整条目', () => {
    const entry = {
      serverName: 'my-server',
      serverUrl: 'https://mcp.example.com',
      accessToken: 'atk',
      refreshToken: 'rtk',
      expiresAt: Date.now() + 3600000,
      scope: 'openid',
      clientId: 'cid',
      clientSecret: 'cs',
      discoveryState: { authorizationServerUrl: 'https://auth.example.com' },
      stepUpScope: 'admin'
    };
    expect(TokenStorageEntrySchema.parse(entry)).toEqual(entry);
  });

  it('最简条目', () => {
    const entry = {
      serverName: 'my-server',
      serverUrl: 'https://mcp.example.com',
      accessToken: 'atk',
      expiresAt: 0
    };
    const parsed = TokenStorageEntrySchema.parse(entry);
    expect(parsed.serverName).toBe('my-server');
    expect(parsed.refreshToken).toBeUndefined();
  });
});

describe('AuthProviderConfigSchema', () => {
  it('完整配置', () => {
    const config = {
      serverName: 'test-server',
      serverUrl: 'https://example.com',
      redirectUri: 'http://localhost:3118/callback',
      skipBrowserOpen: true,
      clientId: 'my-client'
    };
    expect(AuthProviderConfigSchema.parse(config)).toEqual(config);
  });

  it('最简配置', () => {
    const config = {
      serverName: 'test-server',
      serverUrl: 'https://example.com',
      redirectUri: 'http://localhost:3118/callback'
    };
    expect(AuthProviderConfigSchema.parse(config).skipBrowserOpen).toBeUndefined();
  });
});

describe('OAuthConfigSchema', () => {
  it('完整配置', () => {
    const config = {
      clientId: 'client-123',
      authorizeUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      redirectUrl: 'http://localhost:3118/callback',
      scope: 'openid profile'
    };
    expect(OAuthConfigSchema.parse(config)).toEqual(config);
  });

  it('最简配置', () => {
    const config = {
      clientId: 'client-123',
      authorizeUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token'
    };
    const parsed = OAuthConfigSchema.parse(config);
    expect(parsed.clientId).toBe('client-123');
    expect(parsed.scope).toBeUndefined();
  });
});
