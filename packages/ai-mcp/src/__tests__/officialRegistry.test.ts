import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OFFICIAL_REGISTRY_CONFIG,
  isOfficialMcpServer
} from '../connection/officialRegistry';
import type { OfficialMcpEntry } from '../connection/officialRegistry';

describe('DEFAULT_OFFICIAL_REGISTRY_CONFIG', () => {
  it('has expected defaults', () => {
    expect(DEFAULT_OFFICIAL_REGISTRY_CONFIG.enabled).toBe(false);
    expect(DEFAULT_OFFICIAL_REGISTRY_CONFIG.registryUrl).toBe('https://registry.mcp.anthropic.com');
    expect(DEFAULT_OFFICIAL_REGISTRY_CONFIG.cacheTtlMs).toBe(86400000);
  });
});

describe('isOfficialMcpServer', () => {
  const entries: OfficialMcpEntry[] = [
    { name: 'github', url: 'https://mcp.github.com', verified: true, category: 'devtools' },
    { name: 'slack', url: 'https://mcp.slack.com', verified: true },
    { name: 'unverified', url: 'https://mcp.example.com', verified: false }
  ];

  it('returns true for verified official URL', () => {
    expect(isOfficialMcpServer('https://mcp.github.com', entries)).toBe(true);
  });

  it('returns false for URL not in registry', () => {
    expect(isOfficialMcpServer('https://mcp.unknown.com', entries)).toBe(false);
  });

  it('returns false for unverified entry', () => {
    expect(isOfficialMcpServer('https://mcp.example.com', entries)).toBe(false);
  });

  it('returns false for empty entries', () => {
    expect(isOfficialMcpServer('https://mcp.github.com', [])).toBe(false);
  });
});
