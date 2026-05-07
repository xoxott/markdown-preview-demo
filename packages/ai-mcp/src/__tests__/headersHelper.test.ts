import { describe, expect, it } from 'vitest';
import { DEFAULT_HEADERS_HELPER_CONFIG, executeHeadersHelper } from '../connection/headersHelper';
import type { HeadersHelperConfig, HeadersHelperFn } from '../connection/headersHelper';

describe('DEFAULT_HEADERS_HELPER_CONFIG', () => {
  it('disabled by default', () => {
    expect(DEFAULT_HEADERS_HELPER_CONFIG.enabled).toBe(false);
    expect(DEFAULT_HEADERS_HELPER_CONFIG.scriptTimeoutMs).toBe(5000);
  });
});

describe('executeHeadersHelper', () => {
  const mockExecuteFn: HeadersHelperFn = async (scriptPath: string, _timeoutMs: number) => {
    if (scriptPath === '/bin/generate-headers.sh') {
      return { Authorization: 'Bearer temp-token-123' };
    }
    throw new Error('Script not found');
  };

  it('returns empty object when disabled', async () => {
    const config: HeadersHelperConfig = { enabled: false, scriptTimeoutMs: 5000 };
    const result = await executeHeadersHelper(config, mockExecuteFn);
    expect(result).toEqual({});
  });

  it('returns empty object when no scriptPath', async () => {
    const config: HeadersHelperConfig = { enabled: true, scriptTimeoutMs: 5000 };
    const result = await executeHeadersHelper(config, mockExecuteFn);
    expect(result).toEqual({});
  });

  it('executes script and returns headers when enabled', async () => {
    const config: HeadersHelperConfig = {
      enabled: true,
      scriptPath: '/bin/generate-headers.sh',
      scriptTimeoutMs: 5000
    };
    const result = await executeHeadersHelper(config, mockExecuteFn);
    expect(result).toEqual({ Authorization: 'Bearer temp-token-123' });
  });

  it('returns empty on script error', async () => {
    const config: HeadersHelperConfig = {
      enabled: true,
      scriptPath: '/nonexistent.sh',
      scriptTimeoutMs: 5000
    };
    const result = await executeHeadersHelper(config, mockExecuteFn);
    expect(result).toEqual({});
  });
});
