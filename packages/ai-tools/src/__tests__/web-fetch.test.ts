/** @suga/ai-tools — WebFetchTool测试 */

import { describe, expect, it } from 'vitest';
import { webFetchTool } from '../tools/web-fetch';
import { DefaultHttpProvider, type HttpProvider } from '../types/http-provider';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

// ─── Mock HttpProvider ───

class MockHttpProvider implements HttpProvider {
  private mockResponses = new Map<
    string,
    { status: number; body: string; headers?: Record<string, string> }
  >();

  setResponse(
    url: string,
    response: { status: number; body: string; headers?: Record<string, string> }
  ): void {
    this.mockResponses.set(url, response);
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    const mock = this.mockResponses.get(url);
    if (!mock) {
      return new Response('Not found', { status: 404 });
    }
    return new Response(mock.body, {
      status: mock.status,
      headers: mock.headers ?? { 'content-type': 'text/html' }
    });
  }

  htmlToMarkdown(html: string, url: string): string {
    return `${html.replace(/<[^>]+>/g, '').trim()}\n\n---\nSource: ${url}`;
  }
}

describe('WebFetchTool', () => {
  it('name → web-fetch', () => {
    expect(webFetchTool.name).toBe('web-fetch');
  });

  it('isReadOnly → true', () => {
    const input = { url: 'https://example.com', raw: false };
    expect(webFetchTool.isReadOnly!(input)).toBe(true);
  });

  it('safetyLabel → network', () => {
    const input = { url: 'https://example.com', raw: false };
    expect(webFetchTool.safetyLabel!(input)).toBe('network');
  });

  it('isConcurrencySafe → false', () => {
    const input = { url: 'https://example.com', raw: false };
    expect(webFetchTool.isConcurrencySafe!(input)).toBe(false);
  });

  it('call → HTML转Markdown', async () => {
    const httpProvider = new MockHttpProvider();
    httpProvider.setResponse('https://example.com', {
      status: 200,
      body: '<html><body><h1>Hello</h1><p>World</p></body></html>'
    });

    const fsProvider = new MockFileSystemProvider();
    const result = await webFetchTool.call({ url: 'https://example.com', raw: false }, {
      fsProvider,
      httpProvider
    } as any);
    expect(result.data.statusCode).toBe(200);
    expect(result.data.content).toContain('Hello');
    expect(result.data.mimeType).toBe('text/html');
  });

  it('call → raw模式返回原始内容', async () => {
    const httpProvider = new MockHttpProvider();
    httpProvider.setResponse('https://api.example.com/data', {
      status: 200,
      body: '{"key": "value"}',
      headers: { 'content-type': 'application/json' }
    });

    const fsProvider = new MockFileSystemProvider();
    const result = await webFetchTool.call({ url: 'https://api.example.com/data', raw: true }, {
      fsProvider,
      httpProvider
    } as any);
    expect(result.data.content).toBe('{"key": "value"}');
    expect(result.data.mimeType).toBe('application/json');
  });

  it('call → 404返回错误信息', async () => {
    const httpProvider = new MockHttpProvider();
    const fsProvider = new MockFileSystemProvider();
    const result = await webFetchTool.call({ url: 'https://unknown.example.com', raw: false }, {
      fsProvider,
      httpProvider
    } as any);
    expect(result.data.statusCode).toBe(404);
  });

  it('inputSchema → 正确定义', () => {
    expect(webFetchTool.inputSchema).toBeDefined();
  });
});

describe('DefaultHttpProvider', () => {
  it('htmlToMarkdown → 简化HTML转换', () => {
    const provider = new DefaultHttpProvider();
    const html = '<h1>Title</h1><p>Paragraph</p><a href="https://link.com">Link</a>';
    const md = provider.htmlToMarkdown(html, 'https://example.com');
    expect(md).toContain('# Title');
    expect(md).toContain('Paragraph');
    expect(md).toContain('[Link](https://link.com)');
    expect(md).toContain('Source: https://example.com');
  });

  it('htmlToMarkdown → 移除script/style', () => {
    const provider = new DefaultHttpProvider();
    const html =
      '<script>alert("xss")</script><p>Safe content</p><style>.hidden{display:none}</style>';
    const md = provider.htmlToMarkdown(html, 'https://example.com');
    expect(md).not.toContain('alert');
    expect(md).not.toContain('.hidden');
    expect(md).toContain('Safe content');
  });

  it('htmlToMarkdown → 空HTML', () => {
    const provider = new DefaultHttpProvider();
    const md = provider.htmlToMarkdown('', 'https://example.com');
    expect(md).toContain('Source: https://example.com');
  });

  it('isPreapprovedUrl → false（默认）', () => {
    const provider = new DefaultHttpProvider();
    expect(provider.isPreapprovedUrl?.('https://example.com')).toBe(false);
  });
});
