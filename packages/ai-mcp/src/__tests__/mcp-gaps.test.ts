import { describe, expect, it } from 'vitest';
import { getClaudeAIProxyDisplayName, isClaudeAIProxyConfig } from '../types/mcp-claudeai-proxy';
import type { McpClaudeAIProxyConfig } from '../types/mcp-claudeai-proxy';
import type {
  CrossAppAccessConfig,
  McpOAuthState,
  OAuthServerMetadata
} from '../types/mcp-oauth-xaa';
import type { McpAuthProvider } from '../types/mcp-auth-tool';
import { McpAuthActionSchema, McpAuthInputSchema } from '../types/mcp-auth-tool';

describe('McpClaudeAIProxyConfig', () => {
  it('isClaudeAIProxyConfig detects valid config', () => {
    const config = { type: 'claudeai-proxy', claudeaiServerId: 'slack' };
    expect(isClaudeAIProxyConfig(config)).toBe(true);
  });

  it('isClaudeAIProxyConfig rejects other types', () => {
    expect(isClaudeAIProxyConfig({ type: 'sse', url: 'http://x' })).toBe(false);
    expect(isClaudeAIProxyConfig(null)).toBe(false);
    expect(isClaudeAIProxyConfig({})).toBe(false);
  });

  it('getClaudeAIProxyDisplayName uses displayName', () => {
    const config: McpClaudeAIProxyConfig = {
      type: 'claudeai-proxy',
      claudeaiServerId: 'slack',
      displayName: 'Slack MCP'
    };
    expect(getClaudeAIProxyDisplayName(config)).toBe('Slack MCP');
  });

  it('getClaudeAIProxyDisplayName default format', () => {
    const config: McpClaudeAIProxyConfig = {
      type: 'claudeai-proxy',
      claudeaiServerId: 'slack'
    };
    expect(getClaudeAIProxyDisplayName(config)).toBe('claudeai-proxy:slack');
  });
});

describe('OAuth types', () => {
  it('OAuthServerMetadata interface is usable', () => {
    const metadata: OAuthServerMetadata = {
      issuer: 'https://auth.example.com',
      authorizationEndpoint: 'https://auth.example.com/auth',
      tokenEndpoint: 'https://auth.example.com/token'
    };
    expect(metadata.issuer).toBe('https://auth.example.com');
  });

  it('CrossAppAccessConfig interface is usable', () => {
    const xaa: CrossAppAccessConfig = {
      authorizedApp: 'claude-ai',
      scope: ['mcp:read'],
      autoExchange: true
    };
    expect(xaa.authorizedApp).toBe('claude-ai');
  });

  it('McpOAuthState interface is usable', () => {
    const state: McpOAuthState = {
      serverName: 'slack',
      phase: 'authenticated'
    };
    expect(state.phase).toBe('authenticated');
  });
});

describe('McpAuth types', () => {
  it('McpAuthInputSchema validates authenticate action', () => {
    const result = McpAuthInputSchema.safeParse({
      action: 'authenticate',
      serverName: 'slack'
    });
    expect(result.success).toBe(true);
  });

  it('McpAuthInputSchema rejects invalid action', () => {
    const result = McpAuthInputSchema.safeParse({
      action: 'invalid',
      serverName: 'slack'
    });
    expect(result.success).toBe(false);
  });

  it('McpAuthInputSchema rejects empty serverName', () => {
    const result = McpAuthInputSchema.safeParse({
      action: 'authenticate',
      serverName: ''
    });
    expect(result.success).toBe(false);
  });

  it('McpAuthActionSchema enum values', () => {
    expect(McpAuthActionSchema.options).toEqual(['authenticate', 'refresh', 'revoke', 'status']);
  });

  it('McpAuthProvider interface is usable', () => {
    // 类型检查 — 确保接口定义正确
    const provider: McpAuthProvider = {
      authenticate: async name => ({ success: true, message: `Authenticated ${name}` }),
      refresh: async name => ({ success: true, message: `Refreshed ${name}` }),
      revoke: async name => ({ success: true, message: `Revoked ${name}` }),
      status: async name => ({
        serverName: name,
        isAuthenticated: true,
        authMethod: 'oauth'
      })
    };
    expect(provider).toBeDefined();
  });
});
