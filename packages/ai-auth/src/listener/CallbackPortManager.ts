/**
 * CallbackPortManager — OAuth redirect端口管理
 *
 * 对齐Claude Code services/mcp/oauthPort.ts：
 *
 * 1. buildRedirectUri — 构造localhost回调URL
 * 2. findAvailablePort — 在指定范围内找可用端口
 *
 * 端口选择策略：随机选取 → fallback到默认端口 → 抛出错误
 */

import { createServer } from 'node:http';

// ─── 常量 ───

/** 默认回调路径 */
const DEFAULT_CALLBACK_PATH = '/callback';

/** 默认fallback端口 */
const FALLBACK_PORT = 3118;

/** 动态端口范围（非Windows） */
const PORT_RANGE = { min: 49152, max: 65535 };

// ─── 构造回调URL ───

/**
 * 构造redirect URI — RFC 8252 §7.3 loopback redirect
 *
 * localhost + port + /callback 路径。 RFC 8252允许loopback URI匹配任何端口。
 */
export function buildRedirectUri(
  port: number = FALLBACK_PORT,
  callbackPath: string = DEFAULT_CALLBACK_PATH
): string {
  return `http://localhost:${port}${callbackPath}`;
}

// ─── 查找可用端口 ───

/**
 * 查找可用端口 — 随机选取+冲突检测
 *
 * 1. 优先使用环境变量MCP_OAUTH_CALLBACK_PORT
 * 2. 随机在49152~65535范围内选取
 * 3. 创建临时HTTP server验证端口可用
 * 4. Fallback到3118
 * 5. 全部失败则抛出错误
 */
export async function findAvailablePort(configuredPort?: number): Promise<number> {
  // 1. 环境变量/配置优先
  const envPort = Number.parseInt(process.env.MCP_OAUTH_CALLBACK_PORT || '', 10);
  const preferredPort = configuredPort ?? (envPort > 0 ? envPort : undefined);
  if (preferredPort) {
    return preferredPort;
  }

  // 2. 随机选取
  const { min, max } = PORT_RANGE;
  const range = max - min + 1;
  const maxAttempts = Math.min(range, 100);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const port = min + Math.floor(Math.random() * range);

    try {
      await testPort(port);
      return port;
    } catch {
      continue;
    }
  }

  // 3. Fallback
  try {
    await testPort(FALLBACK_PORT);
    return FALLBACK_PORT;
  } catch {
    throw new Error('No available ports for OAuth redirect');
  }
}

/** 测试端口可用 — 创建临时HTTP server并立即关闭 */
function testPort(port: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, () => {
      server.close(() => resolve());
    });
  });
}
