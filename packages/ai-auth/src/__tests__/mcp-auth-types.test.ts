/** @suga/ai-auth — MCP OAuth特有类型测试（结构验证） */

import { describe, expect, it } from 'vitest';
import type {
  AuthProviderConfig,
  OAuthClientInformation,
  OAuthClientMetadata,
  OAuthDiscoveryState,
  OAuthFlowResult
} from '../types/mcp-auth-types';
import type { OAuthTokens } from '../types/auth-types';

describe('MCP Auth类型结构验证', () => {
  it('OAuthClientInformation — 类型检查', () => {
    const info: OAuthClientInformation = { client_id: 'cid123' };
    expect(info.client_id).toBe('cid123');
    expect(info.client_secret).toBeUndefined();
  });

  it('OAuthClientInformation — 含client_secret', () => {
    const info: OAuthClientInformation = { client_id: 'cid', client_secret: 'cs' };
    expect(info.client_secret).toBe('cs');
  });

  it('OAuthClientMetadata — 类型检查', () => {
    const meta: OAuthClientMetadata = {
      client_name: 'Test Client',
      redirect_uris: ['http://localhost:3118/callback'],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    };
    expect(meta.client_name).toBe('Test Client');
    expect(meta.scope).toBeUndefined();
  });

  it('OAuthDiscoveryState — 类型检查', () => {
    const state: OAuthDiscoveryState = {
      authorizationServerUrl: 'https://auth.example.com',
      resourceMetadataUrl: 'https://res.example.com/.well-known'
    };
    expect(state.authorizationServerUrl).toBe('https://auth.example.com');
  });

  it('AuthProviderConfig — 类型检查', () => {
    const config: AuthProviderConfig = {
      serverName: 'test-server',
      serverUrl: 'https://mcp.example.com',
      redirectUri: 'http://localhost:3118/callback'
    };
    expect(config.serverName).toBe('test-server');
    expect(config.skipBrowserOpen).toBeUndefined();
  });

  it('OAuthFlowResult — 类型检查', () => {
    const result: OAuthFlowResult = 'AUTHORIZED';
    expect(result).toBe('AUTHORIZED');
  });

  it('OAuthTokens — 与MCP Auth类型交叉引用', () => {
    const tokens: OAuthTokens = {
      accessToken: 'atk',
      refreshToken: 'rtk',
      expiresAt: Date.now() + 3600000,
      scopes: ['openid', 'profile'],
      subscriptionType: 'pro',
      rateLimitTier: null
    };
    expect(tokens.scopes).toEqual(['openid', 'profile']);
  });
});
