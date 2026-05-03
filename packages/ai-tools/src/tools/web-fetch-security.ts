/**
 * WebFetch 安全验证 — URL安全检查 + 域名黑名单 + 跨域重定向
 *
 * 对齐 Claude Code WebFetchTool 安全验证层:
 *
 * 1. URL验证 — 格式检查、长度限制、协议强制、凭证拒绝
 * 2. 域名黑名单 — 阻止内部API/认证端点
 * 3. 跨域重定向安全 — 检查重定向目标域名一致性
 * 4. URL规范化 — HTTP→HTTPS自动升级
 *
 * 参考 Claude Code src/utils/web/fetch.ts + checkDomainBlocklist.ts
 */

// ============================================================
// 1. 域名黑名单
// ============================================================

/**
 * 被阻止的域名列表 — 不允许 WebFetch 访问这些域名
 *
 * 参考 Claude Code checkDomainBlocklist:
 * - api.anthropic.com — 内部API端点，可能泄露认证信息
 * - 其他认证/内部服务端点
 */
const DOMAIN_BLOCKLIST: readonly string[] = [
  'api.anthropic.com',
  'auth.anthropic.com',
  'console.anthropic.com',
  'internal.anthropic.com',
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  // 内网IP段（部分常见）
  '10.0.0.0',
  '192.168.0.0',
  '172.16.0.0'
];

/**
 * 被阻止的域名后缀 — 匹配这些后缀的域名也被阻止
 *
 * 如 api.anthropic.com → 任何 *.anthropic.com 子域
 * 实际实现中精确匹配优先，后缀匹配是补充
 */
const DOMAIN_BLOCKLIST_SUFFIXES: readonly string[] = [
  '.anthropic.com',
  '.internal',
  '.local',
  '.localhost'
];

/** 最大URL长度限制 */
const MAX_URL_LENGTH = 2000;

/** 安全验证结果 */
export interface WebFetchSecurityResult {
  /** 是否安全（通过所有检查） */
  readonly safe: boolean;
  /** 规范化后的URL（HTTP→HTTPS升级等） */
  readonly normalizedUrl: string;
  /** 安全警告列表 */
  readonly warnings: readonly { issue: string; description: string; severity: 'critical' | 'high' | 'medium' }[];
  /** 错误信息（阻止访问时） */
  readonly error?: string;
}

/**
 * validateWebFetchUrl — 验证URL安全性
 *
 * 检查:
 * 1. URL格式有效性
 * 2. URL长度限制
 * 3. 协议检查（HTTP→HTTPS自动升级）
 * 4. 凭证拒绝（username/password in URL）
 * 5. 域名黑名单
 * 6. 域名后缀黑名单
 *
 * @returns 安全验证结果
 */
export function validateWebFetchUrl(url: string): WebFetchSecurityResult {
  const warnings: { issue: string; description: string; severity: 'critical' | 'high' | 'medium' }[] = [];
  let normalizedUrl = url;

  // === Step 1: URL长度检查 ===
  if (url.length > MAX_URL_LENGTH) {
    return {
      safe: false,
      normalizedUrl: url,
      warnings: [],
      error: `URL exceeds maximum length (${url.length} > ${MAX_URL_LENGTH})`
    };
  }

  // === Step 2: URL格式检查 ===
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      safe: false,
      normalizedUrl: url,
      warnings: [],
      error: 'Invalid URL format'
    };
  }

  // === Step 3: 凭证检查 — 拒绝 username/password in URL ===
  if (parsed.username || parsed.password) {
    return {
      safe: false,
      normalizedUrl: url,
      warnings: [],
      error: 'URL contains credentials (username/password) — not allowed'
    };
  }

  // === Step 4: 协议检查 ===
  if (parsed.protocol === 'http:') {
    // HTTP → 自动升级为 HTTPS
    parsed.protocol = 'https:';
    normalizedUrl = parsed.toString();
    warnings.push({
      issue: 'http_to_https_upgrade',
      description: 'HTTP URL automatically upgraded to HTTPS',
      severity: 'medium'
    });
  } else if (parsed.protocol !== 'https:') {
    // 非HTTP/HTTPS协议 → 拒绝
    return {
      safe: false,
      normalizedUrl: url,
      warnings: [],
      error: `Unsupported protocol: ${parsed.protocol} (only https is allowed)`
    };
  }

  // === Step 5: 域名黑名单检查 ===
  const hostname = parsed.hostname.toLowerCase();

  for (const blocked of DOMAIN_BLOCKLIST) {
    if (hostname === blocked) {
      return {
        safe: false,
        normalizedUrl: normalizedUrl,
        warnings: [],
        error: `Blocked domain: ${hostname} (internal/auth endpoint)`
      };
    }
  }

  // === Step 6: 域名后缀黑名单 ===
  for (const suffix of DOMAIN_BLOCKLIST_SUFFIXES) {
    if (hostname.endsWith(suffix) && hostname !== suffix.slice(1)) {
      return {
        safe: false,
        normalizedUrl: normalizedUrl,
        warnings: [],
        error: `Blocked domain suffix: ${hostname} matches ${suffix}`
      };
    }
  }

  // === Step 7: 内网IP检查 ===
  if (isPrivateIp(hostname)) {
    return {
      safe: false,
      normalizedUrl: normalizedUrl,
      warnings: [],
      error: `Blocked: private/internal IP address ${hostname}`
    };
  }

  // 全部通过 → 安全
  return {
    safe: true,
    normalizedUrl: normalizedUrl,
    warnings
  };
}

/**
 * isPermittedRedirect — 检查跨域重定向是否被允许
 *
 * 参考 Claude Code isPermittedRedirect:
 * - 同域重定向 → 允许（如 example.com/page1 → example.com/page2）
 * - 跨域重定向 → 需检查目标域名是否在黑名单
 * - 认证端点重定向 → 拒绝
 *
 * @param originalUrl 原始请求URL
 * @param redirectUrl 重定向目标URL
 * @returns 是否允许重定向
 */
export function isPermittedRedirect(
  originalUrl: string,
  redirectUrl: string
): { permitted: boolean; reason?: string } {
  let originalParsed: URL;
  let redirectParsed: URL;

  try {
    originalParsed = new URL(originalUrl);
    redirectParsed = new URL(redirectUrl);
  } catch {
    return { permitted: false, reason: 'Invalid URL in redirect' };
  }

  const originalHost = originalParsed.hostname.toLowerCase();
  const redirectHost = redirectParsed.hostname.toLowerCase();

  // 同域重定向 → 允许
  if (originalHost === redirectHost) {
    return { permitted: true };
  }

  // 跨域 → 检查目标域名是否安全
  const targetValidation = validateWebFetchUrl(redirectUrl);
  if (!targetValidation.safe) {
    return { permitted: false, reason: targetValidation.error ?? 'Redirect target is blocked' };
  }

  // 跨域但目标域名安全 → 允许（Claude Code的行为）
  return { permitted: true, reason: `Cross-domain redirect: ${originalHost} → ${redirectHost}` };
}

// ============================================================
// 辅助函数
// ============================================================

/** 检查是否为内网IP */
function isPrivateIp(hostname: string): boolean {
  // localhost 和 127.x.x.x
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('127.')) {
    return true;
  }

  // 10.x.x.x (A类私网)
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) {
    return true;
  }

  // 172.16-31.x.x (B类私网)
  const bClassMatch = /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.exec(hostname);
  if (bClassMatch) {
    return true;
  }

  // 192.168.x.x (C类私网)
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) {
    return true;
  }

  // 0.0.0.0
  if (hostname === '0.0.0.0') {
    return true;
  }

  return false;
}