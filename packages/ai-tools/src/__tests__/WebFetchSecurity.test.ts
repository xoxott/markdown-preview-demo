/** P65 测试 — WebFetch安全验证(URL验证+域名黑名单+跨域重定向+内网IP) */

import { describe, expect, it } from 'vitest';
import { isPermittedRedirect, validateWebFetchUrl } from '../tools/web-fetch-security';

// ============================================================
// validateWebFetchUrl — URL验证
// ============================================================

describe('validateWebFetchUrl — URL格式验证', () => {
  it('合法HTTPS URL → safe=true', () => {
    const result = validateWebFetchUrl('https://example.com/page');
    expect(result.safe).toBe(true);
    expect(result.normalizedUrl).toBe('https://example.com/page');
  });

  it('无效URL → safe=false', () => {
    const result = validateWebFetchUrl('not a url');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('Invalid URL');
  });

  it('超长URL → safe=false', () => {
    const longUrl = `https://example.com/${'a'.repeat(2000)}`;
    const result = validateWebFetchUrl(longUrl);
    expect(result.safe).toBe(false);
    expect(result.error).toContain('maximum length');
  });

  it('带凭证URL → safe=false', () => {
    const result = validateWebFetchUrl('https://user:pass@example.com/page');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('credentials');
  });
});

describe('validateWebFetchUrl — 协议升级', () => {
  it('HTTP URL → 自动升级HTTPS + warning', () => {
    const result = validateWebFetchUrl('http://example.com/page');
    expect(result.safe).toBe(true);
    expect(result.normalizedUrl).toBe('https://example.com/page');
    expect(result.warnings.some(w => w.issue === 'http_to_https_upgrade')).toBe(true);
  });

  it('非HTTP协议(ftp) → safe=false', () => {
    const result = validateWebFetchUrl('ftp://example.com/file');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('Unsupported protocol');
  });

  it('HTTPS URL → 无升级', () => {
    const result = validateWebFetchUrl('https://example.com/page');
    expect(result.safe).toBe(true);
    expect(result.warnings.length).toBe(0);
  });
});

// ============================================================
// validateWebFetchUrl — 域名黑名单
// ============================================================

describe('validateWebFetchUrl — 域名黑名单', () => {
  it('api.anthropic.com → safe=false（内部API）', () => {
    const result = validateWebFetchUrl('https://api.anthropic.com/v1/messages');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('Blocked domain');
  });

  it('auth.anthropic.com → safe=false（认证端点）', () => {
    const result = validateWebFetchUrl('https://auth.anthropic.com/login');
    expect(result.safe).toBe(false);
  });

  it('docs.anthropic.com → safe=false（子域名后缀匹配）', () => {
    const result = validateWebFetchUrl('https://docs.anthropic.com/api');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('Blocked domain suffix');
  });

  it('github.com → safe=true（不在黑名单）', () => {
    const result = validateWebFetchUrl('https://github.com/repo');
    expect(result.safe).toBe(true);
  });
});

// ============================================================
// validateWebFetchUrl — 内网IP
// ============================================================

describe('validateWebFetchUrl — 内网IP检测', () => {
  it('localhost → safe=false（域名黑名单优先匹配）', () => {
    const result = validateWebFetchUrl('https://localhost:3000/api');
    expect(result.safe).toBe(false);
    expect(result.error).toContain('Blocked domain');
  });

  it('127.0.0.1 → safe=false', () => {
    const result = validateWebFetchUrl('https://127.0.0.1:3000/api');
    expect(result.safe).toBe(false);
  });

  it('10.0.0.1 → safe=false（A类私网）', () => {
    const result = validateWebFetchUrl('https://10.0.0.1/internal');
    expect(result.safe).toBe(false);
  });

  it('192.168.1.1 → safe=false（C类私网）', () => {
    const result = validateWebFetchUrl('https://192.168.1.1/admin');
    expect(result.safe).toBe(false);
  });

  it('172.16.0.1 → safe=false（B类私网）', () => {
    const result = validateWebFetchUrl('https://172.16.0.1/service');
    expect(result.safe).toBe(false);
  });

  it('172.32.0.1 → safe=true（不在B类私网范围）', () => {
    const result = validateWebFetchUrl('https://172.32.0.1/service');
    expect(result.safe).toBe(true);
  });
});

// ============================================================
// isPermittedRedirect — 跨域重定向
// ============================================================

describe('isPermittedRedirect — 跨域重定向', () => {
  it('同域重定向 → permitted=true', () => {
    const result = isPermittedRedirect('https://example.com/page1', 'https://example.com/page2');
    expect(result.permitted).toBe(true);
  });

  it('跨域安全重定向 → permitted=true', () => {
    const result = isPermittedRedirect('https://example.com/auth', 'https://github.com/login');
    expect(result.permitted).toBe(true);
    expect(result.reason).toContain('Cross-domain');
  });

  it('跨域→黑名单域名 → permitted=false', () => {
    const result = isPermittedRedirect(
      'https://example.com/redirect',
      'https://api.anthropic.com/v1'
    );
    expect(result.permitted).toBe(false);
  });

  it('跨域→内网IP → permitted=false', () => {
    const result = isPermittedRedirect(
      'https://example.com/redirect',
      'https://192.168.1.1/internal'
    );
    expect(result.permitted).toBe(false);
  });

  it('无效重定向URL → permitted=false', () => {
    const result = isPermittedRedirect('https://example.com/page', 'not-a-url');
    expect(result.permitted).toBe(false);
  });
});
