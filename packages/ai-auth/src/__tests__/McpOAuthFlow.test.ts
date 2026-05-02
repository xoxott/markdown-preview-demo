/** @suga/ai-auth — McpOAuthFlow测试 */

import { describe, expect, it } from 'vitest';
import { performMcpOAuthFlow } from '../flow/McpOAuthFlow';
import { createInMemoryAuthProvider } from '../provider/InMemoryAuthImpl';
import type { FetchLike } from '../types/mcp-auth-types';
import { DiscoveryFailedError } from '../errors/auth-errors';

const authServerMetadata = {
  issuer: 'https://auth.example.com',
  authorization_endpoint: 'https://auth.example.com/authorize',
  token_endpoint: 'https://auth.example.com/token',
  revocation_endpoint: 'https://auth.example.com/revoke',
  registration_endpoint: 'https://auth.example.com/register',
  scopes_supported: ['openid', 'profile'],
  code_challenge_methods_supported: ['S256']
};

describe('McpOAuthFlow', () => {
  describe('performMcpOAuthFlow', () => {
    it('discovery失败 → 抛出DiscoveryFailedError', async () => {
      const { provider, crypto } = createInMemoryAuthProvider({
        serverName: 'test-server',
        serverUrl: 'https://mcp.example.com',
        redirectUri: 'http://localhost:3118/callback'
      });

      const mockFetch: FetchLike = async () => new Response('Not found', { status: 404 });

      await expect(
        performMcpOAuthFlow(
          'test-server',
          'https://mcp.example.com',
          provider,
          crypto,
          undefined,
          undefined,
          mockFetch
        )
      ).rejects.toThrow(DiscoveryFailedError);
    });

    it('bridge.markNeedsAuth → 在流程开始时调用', async () => {
      const { provider, crypto } = createInMemoryAuthProvider({
        serverName: 'test-server',
        serverUrl: 'https://mcp.example.com',
        redirectUri: 'http://localhost:3118/callback'
      });

      const markCalls: string[] = [];
      const mockBridge = {
        markNeedsAuth: (name: string) => {
          markCalls.push(name);
        },
        markAuthComplete: async (_name: string) => {}
      };

      const mockFetch: FetchLike = async () => new Response('Not found', { status: 404 });

      try {
        await performMcpOAuthFlow(
          'test-server',
          'https://mcp.example.com',
          provider,
          crypto,
          mockBridge,
          undefined,
          mockFetch
        );
      } catch {
        // 预期失败 — 但markNeedsAuth应已调用
      }

      expect(markCalls).toContain('test-server');
    });
  });

  describe('discovery + DCR逻辑验证', () => {
    it('无clientInfo + 有registration_endpoint → DCR需要', async () => {
      const { provider } = createInMemoryAuthProvider({
        serverName: 'test-server',
        serverUrl: 'https://mcp.example.com',
        redirectUri: 'http://localhost:3118/callback'
      });

      const clientInfo = await provider.clientInformation();
      expect(clientInfo).toBeUndefined();
      expect(authServerMetadata.registration_endpoint).toBeDefined();
    });

    it('有clientInfo → 不需要DCR', async () => {
      const { provider, storage } = createInMemoryAuthProvider({
        serverName: 'test-server',
        serverUrl: 'https://mcp.example.com',
        redirectUri: 'http://localhost:3118/callback'
      });

      const serverKey = provider.getServerKey();
      storage.update({
        [serverKey]: {
          serverName: 'test-server',
          serverUrl: 'https://mcp.example.com',
          accessToken: '',
          expiresAt: 0,
          clientId: 'existing-client'
        }
      });

      const clientInfo = await provider.clientInformation();
      expect(clientInfo?.client_id).toBe('existing-client');
    });
  });
});
