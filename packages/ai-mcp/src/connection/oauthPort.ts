/**
 * MCP OAuth Port — OAuth 重定向端口选择
 *
 * 对齐 CC services/mcp/oauthPort.ts，从 RFC 8252 Section 7.3 推荐的端口范围 内随机选择可用端口用于 OAuth
 * 回调，提供安全性（避免可预测端口被劫持）。
 */

import { createServer } from 'node:net';

// Windows 动态端口范围 49152-65535 是保留的
const WINDOWS_RANGE = { min: 39152, max: 49151 } as const;
const POSIX_RANGE = { min: 49152, max: 65535 } as const;

const REDIRECT_PORT_FALLBACK = 3118;

/** OAuth Port 选项 */
export interface OAuthPortOptions {
  /** 平台 — 影响端口范围 */
  readonly platform?: 'windows' | 'posix';
  /** 显式配置的端口（如 MCP_OAUTH_CALLBACK_PORT 环境变量） */
  readonly configuredPort?: number;
  /** 最大尝试次数（默认 100） */
  readonly maxAttempts?: number;
  /** Fallback 端口（默认 3118） */
  readonly fallbackPort?: number;
}

/**
 * 构建本地 OAuth 重定向 URI。
 *
 * RFC 8252 Section 7.3：loopback 重定向 URI 只要 path 匹配，端口可任意。
 *
 * @param port 端口号（默认 3118）
 * @returns 完整的重定向 URI（如 `http://localhost:3118/callback`）
 */
export function buildRedirectUri(port: number = REDIRECT_PORT_FALLBACK): string {
  return `http://localhost:${port}/callback`;
}

/** 检测端口是否可用（通过尝试 listen 然后立即关闭） */
async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * 在配置的范围内查找可用端口用于 OAuth 重定向。 使用随机选择以提高安全性（避免端口预测攻击）。
 *
 * 尝试顺序：
 *
 * 1. 显式配置的端口（如设置）
 * 2. 范围内随机选择，最多尝试 maxAttempts 次
 * 3. fallback 端口
 * 4. 抛出错误
 */
export async function findAvailablePort(options: OAuthPortOptions = {}): Promise<number> {
  if (options.configuredPort && options.configuredPort > 0) {
    return options.configuredPort;
  }

  const range = options.platform === 'windows' ? WINDOWS_RANGE : POSIX_RANGE;
  const span = range.max - range.min + 1;
  const maxAttempts = Math.min(options.maxAttempts ?? 100, span);

  for (let i = 0; i < maxAttempts; i += 1) {
    const port = range.min + Math.floor(Math.random() * span);
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  const fallback = options.fallbackPort ?? REDIRECT_PORT_FALLBACK;
  if (await isPortAvailable(fallback)) {
    return fallback;
  }

  throw new Error('No available ports for OAuth redirect');
}

/** 从环境变量解析配置端口（MCP_OAUTH_CALLBACK_PORT） */
export function parseConfiguredPort(env: Record<string, string | undefined>): number | undefined {
  const port = Number.parseInt(env.MCP_OAUTH_CALLBACK_PORT ?? '', 10);
  return port > 0 && port < 65536 ? port : undefined;
}
