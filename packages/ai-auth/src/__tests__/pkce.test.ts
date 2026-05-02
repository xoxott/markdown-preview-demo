/** @suga/ai-auth — PKCE工具测试 */

import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import {
  base64URLEncode,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  getServerKey
} from '../crypto/pkce';
import { NodeCryptoProvider } from '../crypto/random';

const crypto = new NodeCryptoProvider();

describe('base64URLEncode', () => {
  it('标准base64 → URL安全base64', () => {
    const buffer = Buffer.from([0xfb, 0x7f, 0xbf]); // 含+/=字符的base64
    const encoded = base64URLEncode(buffer);
    // 确保不含 + / =
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
  });

  it('空buffer → 空字符串', () => {
    expect(base64URLEncode(Buffer.alloc(0))).toBe('');
  });
});

describe('generateCodeVerifier', () => {
  it('生成43字符长度的字符串（32字节→base64url）', () => {
    const verifier = generateCodeVerifier(crypto);
    expect(verifier.length).toBe(43); // 32*8/6 ≈ 42.67 → 43字符
  });

  it('每次生成不同的值', () => {
    const v1 = generateCodeVerifier(crypto);
    const v2 = generateCodeVerifier(crypto);
    expect(v1).not.toBe(v2);
  });

  it('不含URL不安全字符', () => {
    const verifier = generateCodeVerifier(crypto);
    expect(verifier).not.toContain('+');
    expect(verifier).not.toContain('/');
    expect(verifier).not.toContain('=');
  });
});

describe('generateCodeChallenge', () => {
  it('SHA256(S256) → 不同于verifier', () => {
    const verifier = generateCodeVerifier(crypto);
    const challenge = generateCodeChallenge(crypto, verifier);
    expect(challenge).not.toBe(verifier);
    expect(challenge.length).toBe(43);
  });

  it('同一verifier → 同一challenge（确定性）', () => {
    const verifier = 'test-verifier-value-12345678901234567890';
    const c1 = generateCodeChallenge(crypto, verifier);
    const c2 = generateCodeChallenge(crypto, verifier);
    expect(c1).toBe(c2);
  });

  it('不同verifier → 不同challenge', () => {
    const v1 = generateCodeVerifier(crypto);
    const v2 = generateCodeVerifier(crypto);
    const c1 = generateCodeChallenge(crypto, v1);
    const c2 = generateCodeChallenge(crypto, v2);
    expect(c1).not.toBe(c2);
  });
});

describe('generateState', () => {
  it('生成43字符长度的字符串', () => {
    const state = generateState(crypto);
    expect(state.length).toBe(43);
  });

  it('每次生成不同的值', () => {
    const s1 = generateState(crypto);
    const s2 = generateState(crypto);
    expect(s1).not.toBe(s2);
  });
});

describe('getServerKey', () => {
  it('serverName + config → 唯一key', () => {
    const key = getServerKey(crypto, 'my-server', '{"type":"sse","url":"https://example.com"}');
    expect(key).toContain('my-server|');
    expect(key.length).toBeGreaterThan(16);
  });

  it('不同config → 不同key', () => {
    const k1 = getServerKey(crypto, 'server', '{"type":"sse","url":"https://a.com"}');
    const k2 = getServerKey(crypto, 'server', '{"type":"sse","url":"https://b.com"}');
    expect(k1).not.toBe(k2);
  });

  it('不同name → 不同key', () => {
    const k1 = getServerKey(crypto, 'server-a', '{"type":"sse","url":"https://a.com"}');
    const k2 = getServerKey(crypto, 'server-b', '{"type":"sse","url":"https://a.com"}');
    expect(k1).not.toBe(k2);
  });
});
