/** @suga/ai-auth — OAuthDiscovery测试 */

import { describe, expect, it } from 'vitest';
import {
  fetchAuthServerMetadata,
  getAuthorizeEndpointFromMetadata,
  getRegistrationEndpointFromMetadata,
  getRevocationEndpointFromMetadata,
  getTokenEndpointFromMetadata
} from '../discovery/OAuthDiscovery';
import type { FetchLike, OAuthDiscoveryState } from '../types/mcp-auth-types';
import { DiscoveryFailedError } from '../errors/auth-errors';

const sampleMetadata = {
  issuer: 'https://auth.example.com',
  authorization_endpoint: 'https://auth.example.com/authorize',
  token_endpoint: 'https://auth.example.com/token',
  revocation_endpoint: 'https://auth.example.com/revoke',
  registration_endpoint: 'https://auth.example.com/register',
  scopes_supported: ['openid', 'profile'],
  code_challenge_methods_supported: ['S256']
};

const sampleResourceMetadata = {
  resource: 'https://mcp.example.com',
  authorization_servers: ['https://auth.example.com']
};

// ─── Mock Fetch ───

function createDiscoveryFetch(
  responses: Record<string, { status: number; body: Record<string, unknown> }>
): FetchLike {
  return async (url: string | URL, _init?: RequestInit) => {
    const urlStr = url.toString();
    const matched = responses[urlStr];
    if (!matched) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
    }
    return new Response(JSON.stringify(matched.body), { status: matched.status });
  };
}

describe('OAuthDiscovery', () => {
  describe('fetchAuthServerMetadata', () => {
    it('configuredMetadataUrl → 直接fetch', async () => {
      const mockFetch = createDiscoveryFetch({
        'https://auth.example.com/.well-known/oauth-authorization-server': {
          status: 200,
          body: sampleMetadata
        }
      });

      const result = await fetchAuthServerMetadata(
        'https://mcp.example.com',
        'https://auth.example.com/.well-known/oauth-authorization-server',
        undefined,
        mockFetch
      );

      expect(result.metadata.issuer).toBe('https://auth.example.com');
      expect(result.metadata.authorization_endpoint).toBe('https://auth.example.com/authorize');
      expect(result.discoveryState.authorizationServerUrl).toBe(
        'https://auth.example.com/.well-known/oauth-authorization-server'
      );
    });

    it('cached discoveryState → 使用缓存URL', async () => {
      const mockFetch = createDiscoveryFetch({
        'https://auth.example.com/.well-known/oauth-authorization-server': {
          status: 200,
          body: sampleMetadata
        }
      });

      const cachedState: OAuthDiscoveryState = {
        authorizationServerUrl: 'https://auth.example.com/.well-known/oauth-authorization-server'
      };

      const result = await fetchAuthServerMetadata(
        'https://mcp.example.com',
        undefined,
        cachedState,
        mockFetch
      );

      expect(result.metadata.issuer).toBe('https://auth.example.com');
    });

    it('无缓存 → RFC 9728 discovery', async () => {
      const mockFetch = createDiscoveryFetch({
        'https://mcp.example.com/.well-known/oauth-protected-resource': {
          status: 200,
          body: sampleResourceMetadata
        },
        'https://auth.example.com/.well-known/oauth-authorization-server': {
          status: 200,
          body: sampleMetadata
        }
      });

      const result = await fetchAuthServerMetadata(
        'https://mcp.example.com',
        undefined,
        undefined,
        mockFetch
      );

      expect(result.metadata.issuer).toBe('https://auth.example.com');
      expect(result.discoveryState.resourceMetadataUrl).toBe(
        'https://mcp.example.com/.well-known/oauth-protected-resource'
      );
      expect(result.discoveryState.authorizationServerUrl).toBe(
        'https://auth.example.com/.well-known/oauth-authorization-server'
      );
    });

    it('resource metadata无authorization_servers → DiscoveryFailedError', async () => {
      const mockFetch = createDiscoveryFetch({
        'https://mcp.example.com/.well-known/oauth-protected-resource': {
          status: 200,
          body: { resource: 'https://mcp.example.com' } // 无authorization_servers
        }
      });

      await expect(
        fetchAuthServerMetadata('https://mcp.example.com', undefined, undefined, mockFetch)
      ).rejects.toThrow(DiscoveryFailedError);
    });

    it('404响应 → DiscoveryFailedError', async () => {
      const mockFetch: FetchLike = async () => new Response('Not found', { status: 404 });

      await expect(
        fetchAuthServerMetadata('https://mcp.example.com', undefined, undefined, mockFetch)
      ).rejects.toThrow(DiscoveryFailedError);
    });

    it('缓存失效 → 重新discovery', async () => {
      let callCount = 0;
      const mockFetch: FetchLike = async url => {
        callCount++;
        const urlStr = url.toString();

        // 缓存URL失败
        if (urlStr.includes('cached-auth') && callCount === 1) {
          return new Response('Error', { status: 500 });
        }

        // RFC 9728 成功
        if (urlStr.includes('oauth-protected-resource')) {
          return new Response(JSON.stringify(sampleResourceMetadata), { status: 200 });
        }

        // Authorization server 成功
        if (urlStr.includes('oauth-authorization-server')) {
          return new Response(JSON.stringify(sampleMetadata), { status: 200 });
        }

        return new Response('Not found', { status: 404 });
      };

      const cachedState: OAuthDiscoveryState = {
        authorizationServerUrl:
          'https://cached-auth.example.com/.well-known/oauth-authorization-server'
      };

      const result = await fetchAuthServerMetadata(
        'https://mcp.example.com',
        undefined,
        cachedState,
        mockFetch
      );

      expect(result.metadata.issuer).toBe('https://auth.example.com');
    });
  });

  describe('endpoint提取辅助函数', () => {
    it('getTokenEndpointFromMetadata', () => {
      expect(getTokenEndpointFromMetadata(sampleMetadata)).toBe('https://auth.example.com/token');
    });

    it('getAuthorizeEndpointFromMetadata', () => {
      expect(getAuthorizeEndpointFromMetadata(sampleMetadata)).toBe(
        'https://auth.example.com/authorize'
      );
    });

    it('getRevocationEndpointFromMetadata', () => {
      expect(getRevocationEndpointFromMetadata(sampleMetadata)).toBe(
        'https://auth.example.com/revoke'
      );
    });

    it('getRevocationEndpointFromMetadata → 无endpoint时undefined', () => {
      const noRevoke = { ...sampleMetadata, revocation_endpoint: undefined };
      expect(getRevocationEndpointFromMetadata(noRevoke)).toBeUndefined();
    });

    it('getRegistrationEndpointFromMetadata', () => {
      expect(getRegistrationEndpointFromMetadata(sampleMetadata)).toBe(
        'https://auth.example.com/register'
      );
    });

    it('getRegistrationEndpointFromMetadata → 无endpoint时undefined', () => {
      const noReg = { ...sampleMetadata, registration_endpoint: undefined };
      expect(getRegistrationEndpointFromMetadata(noReg)).toBeUndefined();
    });
  });
});
