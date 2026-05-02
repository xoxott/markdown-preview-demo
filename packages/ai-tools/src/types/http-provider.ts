/**
 * HttpProvider — 宿主注入的HTTP能力接口
 *
 * WebFetchTool委托所有HTTP I/O到此接口。 宿主环境提供具体实现：
 *
 * - Node.js: 使用原生fetch + HTML→Markdown转换
 * - Browser: 使用window.fetch + DOM解析
 * - Test: 使用mock实现
 */

// FileLsEntry 定义在 fs-provider.ts 中

// ─── HttpProvider ───

/** HTTP能力提供者 — 宿主注入 */
export interface HttpProvider {
  /** fetch URL → 返回Response */
  fetch(url: string, init?: RequestInit): Promise<Response>;

  /** HTML→Markdown转换（宿主注入具体实现） */
  htmlToMarkdown(html: string, url: string): string;

  /** 判断URL是否为预批准的安全域名 */
  isPreapprovedUrl?(url: string): boolean;
}

// ─── DefaultHttpProvider ───

/** 默认HTTP实现 — Node.js fetch + 简化HTML→Markdown */
export class DefaultHttpProvider implements HttpProvider {
  async fetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, init);
  }

  htmlToMarkdown(html: string, url: string): string {
    return htmlToMarkdownSimple(html, url);
  }

  isPreapprovedUrl(_url: string): boolean {
    return false;
  }
}

// ─── 简化HTML→Markdown转换 ───

/** 简化HTML→Markdown — 不依赖第三方库，正则转换 */
function htmlToMarkdownSimple(html: string, url: string): string {
  // 移除script和style标签及其内容
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // 转换常见HTML元素到Markdown
  // Headers
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  text = text.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  text = text.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // Links
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Images
  text = text.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  text = text.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // Bold/Italic
  text = text.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
  text = text.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');

  // Lists
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '');

  // Paragraphs
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

  // Blockquotes
  text = text.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n');

  // Code blocks
  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n');
  text = text.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  // Add source URL reference
  if (url) {
    text += `\n\n---\nSource: ${url}`;
  }

  return text;
}
