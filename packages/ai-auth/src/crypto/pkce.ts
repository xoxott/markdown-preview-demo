/**
 * PKCE 工具 — OAuth 2.0 Authorization Code + PKCE扩展
 *
 * 对齐Claude Code services/oauth/crypto.ts + services/mcp/auth.ts的PKCE逻辑。
 * 所有随机数/hash操作通过宿主注入的CryptoProvider完成（不直接依赖crypto模块）。
 */

import type { CryptoProvider } from '../provider/AuthProviderInterface';

/**
 * base64url编码 — RFC 7636 §Appendix B
 *
 * 将Buffer转为base64，替换+/=为URL安全字符。
 */
export function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/[=]/g, '');
}

/**
 * 生成PKCE code_verifier — RFC 7636 §4.1
 *
 * 使用宿主注入的CryptoProvider生成32字节随机数， 然后base64url编码为43字符（满足43~128字符长度要求）。
 */
export function generateCodeVerifier(crypto: CryptoProvider): string {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * 生成PKCE code_challenge — RFC 7636 §4.2
 *
 * SHA256(code_verifier) → base64url编码。 S256方法（强制性，RFC 7636 §4.2推荐）。
 */
export function generateCodeChallenge(crypto: CryptoProvider, verifier: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(verifier);
  return base64URLEncode(hash.digest());
}

/**
 * 生成OAuth state参数 — CSRF防护
 *
 * 32字节随机数base64url编码。
 */
export function generateState(crypto: CryptoProvider): string {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * 生成唯一server key — 防止凭据跨服务器复用
 *
 * serverName + config hash → SHA256前16字符。 对齐Claude Code getServerKey。
 */
export function getServerKey(
  crypto: CryptoProvider,
  serverName: string,
  configJson: string
): string {
  const hash = crypto.createHash('sha256');
  hash.update(configJson);
  const hex = hash.digest().toString('hex').substring(0, 16);
  return `${serverName}|${hex}`;
}
