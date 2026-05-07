import { describe, expect, it } from 'vitest';
import { McpOAuthFlow } from '../connection/McpOAuthFlow';
import type { OAuthProvider } from '../types/mcp-oauth-xaa';

function createMockProvider(): OAuthProvider {
  let callCount = 0;
  return {
    discover: async () => ({
      issuer: 'https://auth.example.com',
      authorizationEndpoint: 'https://auth.example.com/auth',
      tokenEndpoint: 'https://auth.example.com/token'
    }),
    registerClient: async () => ({
      clientId: `client_${++callCount}`,
      clientSecret: 'secret'
    }),
    startPkceFlow: async (_metadata, _registration, scope) => ({
      authorizationUrl: `https://auth.example.com/auth?scope=${scope ?? 'default'}`,
      codeVerifier: 'verifier_123',
      state: 'state_abc'
    }),
    completePkceFlow: async () => ({
      accessToken: 'access_token_xyz',
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: 'refresh_token_xyz',
      scope: 'default'
    }),
    refreshToken: async () => ({
      accessToken: 'new_access_token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      refreshToken: 'new_refresh_token'
    })
  };
}

describe('McpOAuthFlow', () => {
  it('full flow succeeds', async () => {
    const flow = new McpOAuthFlow(createMockProvider());

    // Step 1: Discover
    const discovered = await flow.discover('https://mcp.example.com');
    expect(discovered).toBe(true);
    expect(flow.state.phase).toBe('discovery');
    expect(flow.state.metadata?.issuer).toBe('https://auth.example.com');

    // Step 2: Register
    const registered = await flow.registerClient(['http://localhost:3000/callback']);
    expect(registered).toBe(true);
    expect(flow.state.registration?.clientId).toBeDefined();

    // Step 3: Start authorization
    const authUrl = await flow.startAuthorization('mcp:read');
    expect(authUrl).toContain('auth.example.com');

    // Step 4: Complete authorization
    const completed = await flow.completeAuthorization(
      'auth_code_abc',
      'http://localhost:3000/callback'
    );
    expect(completed).toBe(true);
    expect(flow.state.phase).toBe('authenticated');
    expect(flow.accessToken).toBe('access_token_xyz');
  });

  it('refresh token works', async () => {
    const flow = new McpOAuthFlow(createMockProvider());
    await flow.discover('https://mcp.example.com');
    await flow.registerClient(['http://localhost:3000/callback']);
    await flow.startAuthorization();
    await flow.completeAuthorization('code', 'http://localhost:3000/callback');

    const refreshed = await flow.refreshToken();
    expect(refreshed).toBe(true);
    expect(flow.accessToken).toBe('new_access_token');
    expect(flow.state.phase).toBe('authenticated');
  });

  it('discover fails when provider returns null', async () => {
    const failProvider: OAuthProvider = {
      discover: async () => null,
      registerClient: async () => ({ clientId: 'x' }),
      startPkceFlow: async () => ({ authorizationUrl: '', codeVerifier: '', state: '' }),
      completePkceFlow: async () => ({ accessToken: '', tokenType: '', expiresIn: 0 }),
      refreshToken: async () => ({ accessToken: '', tokenType: '', expiresIn: 0 })
    };
    const flow = new McpOAuthFlow(failProvider);
    const result = await flow.discover('https://fail.example.com');
    expect(result).toBe(false);
    expect(flow.state.phase).toBe('failed');
    expect(flow.state.error).toContain('No OAuth metadata');
  });

  it('registerClient fails without metadata', async () => {
    const flow = new McpOAuthFlow(createMockProvider());
    const result = await flow.registerClient(['http://localhost:3000/callback']);
    expect(result).toBe(false);
    expect(flow.state.phase).toBe('failed');
  });

  it('refreshToken fails without prerequisites', async () => {
    const flow = new McpOAuthFlow(createMockProvider());
    const result = await flow.refreshToken();
    expect(result).toBe(false);
  });
});
