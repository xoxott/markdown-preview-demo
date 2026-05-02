/** @suga/ai-auth — 认证错误类型测试 */

import { describe, expect, it } from 'vitest';
import {
  AuthenticationCancelledError,
  DiscoveryFailedError,
  InvalidGrantError,
  NoCodeVerifierError,
  OAuthError,
  PortUnavailableError,
  ServerError,
  StateMismatchError,
  isRetryableError
} from '../errors/auth-errors';

describe('AuthenticationCancelledError', () => {
  it('默认消息 → Authentication was cancelled', () => {
    const err = new AuthenticationCancelledError();
    expect(err.name).toBe('AuthenticationCancelledError');
    expect(err.message).toBe('Authentication was cancelled');
  });

  it('自定义消息', () => {
    const err = new AuthenticationCancelledError('User pressed Esc');
    expect(err.message).toBe('User pressed Esc');
  });
});

describe('InvalidGrantError', () => {
  it('默认errorCode → invalid_grant', () => {
    const err = new InvalidGrantError('Token revoked');
    expect(err.name).toBe('InvalidGrantError');
    expect(err.errorCode).toBe('invalid_grant');
    expect(err.message).toBe('Token revoked');
  });

  it('自定义errorCode', () => {
    const err = new InvalidGrantError('Expired', 'expired_refresh_token');
    expect(err.errorCode).toBe('expired_refresh_token');
  });
});

describe('OAuthError', () => {
  it('含errorCode+description', () => {
    const err = new OAuthError('access_denied', 'User denied consent');
    expect(err.name).toBe('OAuthError');
    expect(err.errorCode).toBe('access_denied');
    expect(err.errorDescription).toBe('User denied consent');
    expect(err.message).toContain('access_denied');
    expect(err.message).toContain('User denied consent');
  });

  it('仅errorCode → 无description', () => {
    const err = new OAuthError('server_error');
    expect(err.message).toBe('OAuth error: server_error');
  });
});

describe('ServerError', () => {
  it('继承OAuthError', () => {
    const err = new ServerError('Internal error');
    expect(err.name).toBe('ServerError');
    expect(err.errorCode).toBe('server_error');
  });
});

describe('PortUnavailableError', () => {
  it('默认消息含端口', () => {
    const err = new PortUnavailableError(8080);
    expect(err.port).toBe(8080);
    expect(err.message).toContain('8080');
  });

  it('自定义消息', () => {
    const err = new PortUnavailableError(8080, 'Custom message');
    expect(err.message).toBe('Custom message');
  });
});

describe('StateMismatchError', () => {
  it('固定消息', () => {
    const err = new StateMismatchError();
    expect(err.message).toContain('state mismatch');
  });
});

describe('NoCodeVerifierError', () => {
  it('固定消息', () => {
    const err = new NoCodeVerifierError();
    expect(err.message).toBe('No code verifier saved');
  });
});

describe('DiscoveryFailedError', () => {
  it('含URL', () => {
    const err = new DiscoveryFailedError('https://example.com');
    expect(err.url).toBe('https://example.com');
    expect(err.message).toContain('https://example.com');
  });
});

describe('isRetryableError', () => {
  it('ServerError → true', () => {
    expect(isRetryableError(new ServerError())).toBe(true);
  });

  it('InvalidGrantError → false', () => {
    expect(isRetryableError(new InvalidGrantError('test'))).toBe(false);
  });

  it('AuthenticationCancelledError → false', () => {
    expect(isRetryableError(new AuthenticationCancelledError())).toBe(false);
  });

  it('timeout消息 → true', () => {
    expect(isRetryableError(new Error('Request timeout'))).toBe(true);
  });

  it('普通Error → false', () => {
    expect(isRetryableError(new Error('Unknown'))).toBe(false);
  });
});
