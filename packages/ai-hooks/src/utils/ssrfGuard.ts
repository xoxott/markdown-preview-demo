/** SSRF 防护 — 私有 IP 地址检测 */

/**
 * isPrivateIp — 检查 hostname 是否为私有/保留 IP 地址
 *
 * 阻断范围（RFC 1918 + RFC 4193 + 其他保留地址）：
 *
 * - 10.0.0.0/8 (A类私有)
 * - 172.16.0.0/12 (B类私有)
 * - 192.168.0.0/16 (C类私有)
 * - 169.254.0.0/16 (链路本地)
 * - 100.64.0.0/10 (CGN 共享地址)
 * - ::ffff:0:0/96 (IPv4-mapped IPv6 — 上述 IPv4 规则同样适用于 mapped 地址)
 *
 * 允许范围：
 *
 * - 127.0.0.0/8 (loopback)
 * - ::1 (IPv6 loopback)
 * - 公网 IP
 */
export function isPrivateIp(hostname: string): boolean {
  // IPv6 loopback
  if (hostname === '::1' || hostname === '0:0:0:0:0:0:0:1') {
    return false; // 允许 IPv6 loopback
  }

  // IPv4-mapped IPv6: ::ffff:x.x.x.x
  const ipv4MappedMatch = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (ipv4MappedMatch) {
    return isPrivateIPv4(ipv4MappedMatch[1]);
  }

  // 纯 IPv4
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return isPrivateIPv4(hostname);
  }

  // IPv6 私有地址 (fc00::/7 — RFC 4193 unique local)
  if (/^fc[0-9a-f]{2}:/i.test(hostname) || /^fd[0-9a-f]{2}:/i.test(hostname)) {
    return true;
  }

  // 其他格式（域名等）不做阻断 — DNS 解析由宿主环境处理
  return false;
}

/** IPv4 私有地址检测 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);

  if (parts.length !== 4 || parts.some(p => p < 0 || p > 255)) {
    return false;
  }

  const [a, b] = parts;

  // 127.0.0.0/8 — loopback，允许
  if (a === 127) return false;

  // 10.0.0.0/8 — A类私有
  if (a === 10) return true;

  // 172.16.0.0/12 — B类私有 (172.16.x.x ~ 172.31.x.x)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 — C类私有
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 — 链路本地
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 — CGN 共享地址
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 0.0.0.0/8 — 保留
  if (a === 0) return true;

  return false;
}
