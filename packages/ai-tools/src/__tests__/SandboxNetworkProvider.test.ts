/** P53 测试 — SandboxHttpProvider + SandboxSearchProvider + CostCalculator + network 拦截 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SandboxSettings } from '@suga/ai-sdk';
import { CostCalculator } from '@suga/ai-tool-adapter';
import type { LLMUsageSummary } from '@suga/ai-tool-adapter';
import { buildProviderMap } from '@suga/ai-runtime';
import type { RuntimeConfig } from '@suga/ai-runtime';
import type { SearchProvider, SearchResult, SearchResultItem } from '../types/search-provider';
import type { HttpProvider } from '../types/http-provider';
import {
  SandboxHttpProvider,
  SandboxNetworkDenyError,
  SandboxSearchProvider,
  domainMatchesPattern,
  extractDomain,
  isDomainAllowed
} from '../provider/SandboxHttpProvider';

// ============================================================
// extractDomain tests
// ============================================================

describe('extractDomain', () => {
  it('https://api.openai.com/v1/chat → api.openai.com', () => {
    expect(extractDomain('https://api.openai.com/v1/chat')).toBe('api.openai.com');
  });

  it('http://localhost:3000/test → localhost', () => {
    expect(extractDomain('http://localhost:3000/test')).toBe('localhost');
  });

  it('无效 URL → 返回原始字符串', () => {
    expect(extractDomain('not-a-url')).toBe('not-a-url');
  });
});

// ============================================================
// domainMatchesPattern tests
// ============================================================

describe('domainMatchesPattern', () => {
  it('精确匹配 → true', () => {
    expect(domainMatchesPattern('evil.com', 'evil.com')).toBe(true);
  });

  it('*.evil.com → 匹配子域名', () => {
    expect(domainMatchesPattern('sub.evil.com', '*.evil.com')).toBe(true);
    expect(domainMatchesPattern('deep.sub.evil.com', '*.evil.com')).toBe(true);
    expect(domainMatchesPattern('evil.com', '*.evil.com')).toBe(true);
  });

  it('不匹配 → false', () => {
    expect(domainMatchesPattern('good.com', 'evil.com')).toBe(false);
  });
});

// ============================================================
// isDomainAllowed tests
// ============================================================

describe('isDomainAllowed', () => {
  it('无 network 配置 → 允许所有', () => {
    expect(isDomainAllowed('any.com', {}).allowed).toBe(true);
  });

  it('deny 优先 → 匹配 deny 拒绝', () => {
    const config = { deny: ['*.evil.com'] };
    expect(isDomainAllowed('sub.evil.com', config).allowed).toBe(false);
  });

  it('allow 白名单 → 在内允许', () => {
    const config = { allow: ['api.openai.com'] };
    expect(isDomainAllowed('api.openai.com', config).allowed).toBe(true);
  });

  it('allow 白名单 → 不在内拒绝', () => {
    const config = { allow: ['api.openai.com'] };
    expect(isDomainAllowed('evil.com', config).allowed).toBe(false);
  });
});

// ============================================================
// SandboxHttpProvider tests
// ============================================================

describe('SandboxHttpProvider', () => {
  let provider: SandboxHttpProvider;
  let inner: HttpProvider;
  let sandbox: SandboxSettings;

  beforeEach(() => {
    inner = {
      fetch: vi.fn().mockResolvedValue(new Response('ok', { status: 200 })),
      htmlToMarkdown: vi.fn().mockReturnValue('# Test\n\nContent'),
      isPreapprovedUrl: vi.fn().mockReturnValue(false)
    };
    sandbox = {
      network: {
        allow: ['api.openai.com', 'safe.example.com'],
        deny: ['*.evil.com', 'internal.local']
      }
    };
    provider = new SandboxHttpProvider({ inner, sandbox });
  });

  it('fetch — 允许域名 → 正常调用', async () => {
    const response = await provider.fetch('https://api.openai.com/v1/chat');
    expect(response.status).toBe(200);
    expect(inner.fetch).toHaveBeenCalled();
  });

  it('fetch — deny 域名 → 403 Response', async () => {
    const response = await provider.fetch('https://sub.evil.com/api');
    expect(response.status).toBe(403);
    expect(inner.fetch).not.toHaveBeenCalled();
    const text = await response.text();
    expect(text).toContain('blocked');
  });

  it('fetch — allow 白名单外 → 403 Response', async () => {
    const response = await provider.fetch('https://unknown.com/page');
    expect(response.status).toBe(403);
  });

  it('fetch — 无 network 配置 → 允许所有', async () => {
    const noSandboxProvider = new SandboxHttpProvider({ inner, sandbox: {} });
    const response = await noSandboxProvider.fetch('https://any.com/page');
    expect(response.status).toBe(200);
  });

  it('htmlToMarkdown — 不拦截', () => {
    const result = provider.htmlToMarkdown('<h1>Test</h1>', 'https://evil.com');
    expect(result).toBe('# Test\n\nContent');
    expect(inner.htmlToMarkdown).toHaveBeenCalled();
  });

  it('isPreapprovedUrl — allow 列表中 → true', () => {
    expect(provider.isPreapprovedUrl('https://api.openai.com/v1')).toBe(true);
  });

  it('isPreapprovedUrl — allow 列表外 → false', () => {
    expect(provider.isPreapprovedUrl('https://evil.com/page')).toBe(false);
  });

  it('SandboxNetworkDenyError — 包含 url 和 rule 信息', () => {
    const err = new SandboxNetworkDenyError('https://evil.com', '*.evil.com');
    expect(err.name).toBe('SandboxNetworkDenyError');
    expect(err.url).toBe('https://evil.com');
    expect(err.rule).toBe('*.evil.com');
  });
});

// ============================================================
// SandboxSearchProvider tests
// ============================================================

describe('SandboxSearchProvider', () => {
  let provider: SandboxSearchProvider;
  let inner: SearchProvider;
  let sandbox: SandboxSettings;

  beforeEach(() => {
    inner = {
      search: vi.fn().mockResolvedValue({
        results: [
          { title: 'Good', url: 'https://api.openai.com/docs', snippet: 'OpenAI docs' },
          { title: 'Evil', url: 'https://sub.evil.com/page', snippet: 'Evil page' }
        ] as SearchResultItem[],
        durationSeconds: 0.5
      } as SearchResult),
      isEnabled: vi.fn().mockReturnValue(true)
    };
    sandbox = {
      network: {
        allow: ['api.openai.com'],
        deny: ['*.evil.com']
      }
    };
    provider = new SandboxSearchProvider({ inner, sandbox });
  });

  it('search — sandbox 规则合入 options', async () => {
    await provider.search('test query');

    expect(inner.search).toHaveBeenCalledWith(
      'test query',
      expect.objectContaining({
        allowedDomains: expect.arrayContaining(['api.openai.com']),
        blockedDomains: expect.arrayContaining(['*.evil.com'])
      })
    );
  });

  it('search — 结果二次过滤（deny 域名被去除）', async () => {
    const result = await provider.search('test');
    expect(result.results.length).toBe(1);
    expect(result.results[0].title).toBe('Good');
  });

  it('isEnabled — deny 含 "*" → false', () => {
    const denyAllProvider = new SandboxSearchProvider({
      inner,
      sandbox: { network: { deny: ['*'] } }
    });
    expect(denyAllProvider.isEnabled()).toBe(false);
  });

  it('isEnabled — 正常 sandbox → true', () => {
    expect(provider.isEnabled()).toBe(true);
  });

  it('isEnabled — 无 network 配置 → inner.isEnabled()', () => {
    const noSandboxProvider = new SandboxSearchProvider({ inner, sandbox: {} });
    expect(noSandboxProvider.isEnabled()).toBe(true);
  });
});

// ============================================================
// CostCalculator tests
// ============================================================

describe('CostCalculator', () => {
  it('默认价格表 — claude-sonnet-4-6 计算', () => {
    const calculator = new CostCalculator();
    const usage: LLMUsageSummary = {
      totalInputTokens: 1_000_000,
      totalOutputTokens: 500_000,
      totalCacheCreationTokens: 200_000,
      totalCacheReadTokens: 100_000,
      totalCacheCreationEphemeralTokens: 0,
      apiCallCount: 10
    };

    const cost = calculator.calculate(usage, 'claude-sonnet-4-6');

    // input: 1M * $3/MTok = $3
    // output: 500K * $15/MTok = $7.5
    // cache write: 200K * $3.75/MTok = $0.75
    // cache read: 100K * $0.30/MTok = $0.03
    // inputCost = $3 + $0.75 + $0.03 = $3.78
    // totalCost = $3.78 + $7.5 = $11.28
    expect(cost.inputCost).toBeCloseTo(3.78, 2);
    expect(cost.outputCost).toBeCloseTo(7.5, 2);
    expect(cost.totalCost).toBeCloseTo(11.28, 2);
  });

  it('默认模型名 — 未指定模型时使用 defaultModel', () => {
    const calculator = new CostCalculator({ defaultModel: 'claude-haiku-4-5' });
    const usage: LLMUsageSummary = {
      totalInputTokens: 100_000,
      totalOutputTokens: 50_000,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheCreationEphemeralTokens: 0,
      apiCallCount: 1
    };

    const cost = calculator.calculate(usage);

    // input: 100K * $0.80/MTok = $0.08
    // output: 50K * $4/MTok = $0.20
    expect(cost.totalCost).toBeCloseTo(0.28, 2);
  });

  it('extractTokenUsage — 从 UsageSummary 提取', () => {
    const calculator = new CostCalculator();
    const usage: LLMUsageSummary = {
      totalInputTokens: 100,
      totalOutputTokens: 50,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheCreationEphemeralTokens: 0,
      apiCallCount: 1
    };

    const tokenUsage = calculator.extractTokenUsage(usage);
    expect(tokenUsage.inputTokens).toBe(100);
    expect(tokenUsage.outputTokens).toBe(50);
    expect(tokenUsage.totalTokens).toBe(150);
  });

  it('自定义价格表', () => {
    const calculator = new CostCalculator({
      priceTable: {
        'custom-model': {
          inputPricePerMTok: 1,
          outputPricePerMTok: 2
        }
      },
      defaultModel: 'custom-model'
    });

    const usage: LLMUsageSummary = {
      totalInputTokens: 500_000,
      totalOutputTokens: 200_000,
      totalCacheCreationTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheCreationEphemeralTokens: 0,
      apiCallCount: 1
    };

    const cost = calculator.calculate(usage);
    expect(cost.inputCost).toBeCloseTo(0.5, 2);
    expect(cost.outputCost).toBeCloseTo(0.4, 2);
    expect(cost.totalCost).toBeCloseTo(0.9, 2);
  });
});

// ============================================================
// buildProviderMap sandbox network 贯通测试
// ============================================================

describe('buildProviderMap sandbox network 贅通', () => {
  it('sandbox 含 network → httpProvider 被 SandboxHttpProvider 包装', () => {
    const mockFs = {
      stat: vi.fn().mockResolvedValue({ exists: true }),
      readFile: vi.fn().mockResolvedValue({ content: '' }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      editFile: vi.fn().mockResolvedValue({ applied: true }),
      glob: vi.fn().mockResolvedValue([]),
      grep: vi
        .fn()
        .mockResolvedValue({ mode: 'files-with-matches', filePaths: [], totalMatches: 0 }),
      ls: vi.fn().mockResolvedValue([]),
      runCommand: vi
        .fn()
        .mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false })
    };
    const mockHttp = {
      fetch: vi.fn().mockResolvedValue(new Response('ok')),
      htmlToMarkdown: vi.fn().mockReturnValue(''),
      isPreapprovedUrl: vi.fn().mockReturnValue(false)
    };
    const mockSearch = {
      search: vi.fn().mockResolvedValue({ results: [], durationSeconds: 0 }),
      isEnabled: vi.fn().mockReturnValue(true)
    };

    const config: RuntimeConfig = {
      provider: {} as any,
      fsProvider: mockFs,
      httpProvider: mockHttp,
      searchProvider: mockSearch,
      sandbox: {
        filesystem: { allow: ['/tmp/**'] },
        network: { deny: ['*.evil.com'] }
      }
    };

    const providerMap = buildProviderMap(config);

    // 验证被装饰: fetch 方法应该有 sandbox 拦截逻辑
    expect(providerMap.httpProvider!.constructor.name).toBe('SandboxHttpProvider');
    expect(providerMap.searchProvider!.constructor.name).toBe('SandboxSearchProvider');
  });

  it('sandbox 不含 network → httpProvider/searchProvider 不被包装', () => {
    const mockFs = {
      stat: vi.fn().mockResolvedValue({ exists: true }),
      readFile: vi.fn().mockResolvedValue({ content: '' }),
      writeFile: vi.fn().mockResolvedValue(undefined),
      editFile: vi.fn().mockResolvedValue({ applied: true }),
      glob: vi.fn().mockResolvedValue([]),
      grep: vi
        .fn()
        .mockResolvedValue({ mode: 'files-with-matches', filePaths: [], totalMatches: 0 }),
      ls: vi.fn().mockResolvedValue([]),
      runCommand: vi
        .fn()
        .mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', timedOut: false })
    };
    const mockHttp = {
      fetch: vi.fn().mockResolvedValue(new Response('ok')),
      htmlToMarkdown: vi.fn().mockReturnValue(''),
      isPreapprovedUrl: vi.fn().mockReturnValue(false)
    };

    const config: RuntimeConfig = {
      provider: {} as any,
      fsProvider: mockFs,
      httpProvider: mockHttp,
      sandbox: {
        filesystem: { allow: ['/tmp/**'] }
        // 无 network 配置
      }
    };

    const providerMap = buildProviderMap(config);

    // 无 network → httpProvider 不被包装，就是原始 mockHttp
    expect(providerMap.httpProvider).toBe(mockHttp);
  });
});
