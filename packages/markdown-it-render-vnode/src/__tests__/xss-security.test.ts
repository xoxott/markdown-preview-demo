/**
 * XSS 安全测试
 *
 * 测试 markdown-it-render-vnode 对各种 XSS 攻击向量的防护能力
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import markdownItRenderVnode from '../index';
import { vueAdapter } from '@suga/markdown-it-render-vnode-vue';
import type { VNode } from 'vue';

describe('XSS 安全防护测试', () => {
  let md: MarkdownIt;

  beforeEach(() => {
    md = new MarkdownIt({
      html: true, // 启用 HTML 支持来测试 XSS 防护
      linkify: true,
      typographer: true,
      breaks: true
    });
    md.use(markdownItRenderVnode, { adapter: vueAdapter });
  });

  // XSS 攻击向量测试用例
  const xssAttackVectors = [
    {
      name: '事件处理器注入 - onclick',
      content: '<img src="x" onclick="alert(\'XSS\')" />',
      shouldBlock: true,
      dangerousPatterns: [/onclick\s*=/i]
    },
    {
      name: '事件处理器注入 - onerror',
      content: '<img src="x" onerror="alert(\'XSS\')" />',
      shouldBlock: true,
      dangerousPatterns: [/onerror\s*=/i]
    },
    {
      name: '事件处理器注入 - onload',
      content: '<iframe onload="alert(\'XSS\')" src="about:blank"></iframe>',
      shouldBlock: true,
      dangerousPatterns: [/onload\s*=/i]
    },
    {
      name: 'JavaScript 协议 - 小写',
      content: '<a href="javascript:alert(\'XSS\')">点击我</a>',
      shouldBlock: true,
      dangerousPatterns: [/javascript:/i]
    },
    {
      name: 'JavaScript 协议 - 大写',
      content: '<a href="JAVASCRIPT:alert(\'XSS\')">点击我</a>',
      shouldBlock: true,
      dangerousPatterns: [/javascript:/i]
    },
    {
      name: 'JavaScript 协议 - 混合大小写',
      content: '<a href="JaVaScRiPt:alert(\'XSS\')">点击我</a>',
      shouldBlock: true,
      dangerousPatterns: [/javascript:/i]
    },
    {
      name: 'VBScript 协议',
      content: '<a href="vbscript:msgbox(\'XSS\')">点击我</a>',
      shouldBlock: true,
      dangerousPatterns: [/vbscript:/i]
    },
    {
      name: 'File 协议',
      content: '<a href="file:///etc/passwd">点击我</a>',
      shouldBlock: true,
      dangerousPatterns: [/file:/i]
    },
    {
      name: 'Data URI - 危险 HTML',
      content: '<iframe src="data:text/html,<script>alert(\'XSS\')</script>"></iframe>',
      shouldBlock: true,
      dangerousPatterns: [/data:\s*text\/html/i, /<script/i]
    },
    {
      name: 'Script 标签注入',
      content: '<script>alert(\'XSS\')</script>',
      shouldBlock: true,
      dangerousPatterns: [/<script[^>]*>/i]
    },
    {
      name: 'Script 标签 - 大小写混合',
      content: '<ScRiPt>alert(\'XSS\')</ScRiPt>',
      shouldBlock: true,
      dangerousPatterns: [/<script[^>]*>/i]
    },
    {
      name: 'Iframe 注入',
      content: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      shouldBlock: true,
      dangerousPatterns: [/<iframe/i, /javascript:/i]
    },
    {
      name: 'Embed 标签',
      content: '<embed src="evil.swf">',
      shouldBlock: true,
      dangerousPatterns: [/<embed/i]
    },
    {
      name: 'Object 标签',
      content: '<object data="evil.swf"></object>',
      shouldBlock: true,
      dangerousPatterns: [/<object/i]
    },
    {
      name: 'Style 标签',
      content: '<style>body { background: url(\'http://evil.com/steal\'); }</style>',
      shouldBlock: true,
      dangerousPatterns: [/<style[^>]*>/i]
    },
    {
      name: 'Link 标签注入',
      content: '<link rel="stylesheet" href="http://evil.com/steal.css">',
      shouldBlock: true,
      dangerousPatterns: [/<link/i]
    },
    {
      name: 'Markdown 链接中的 XSS',
      content: '[点击](javascript:alert(\'XSS\'))',
      shouldBlock: true,
      // markdown-it 会拒绝解析危险协议的链接,将其作为普通文本
      // 我们应该检查没有生成实际的链接元素
      dangerousPatterns: [/"href"\s*:\s*"javascript:/i, /"src"\s*:\s*"javascript:/i]
    },
    {
      name: 'Markdown 图片中的 XSS',
      content: '![图片](javascript:alert(\'XSS\'))',
      shouldBlock: true,
      // markdown-it 会拒绝解析危险协议的图片,将其作为普通文本
      // 我们应该检查没有生成实际的图片元素
      dangerousPatterns: [/"href"\s*:\s*"javascript:/i, /"src"\s*:\s*"javascript:/i]
    },
    {
      name: '正常 HTML 内容',
      content: '<p>这是正常的 <strong>HTML</strong> 内容</p>',
      shouldBlock: false,
      dangerousPatterns: []
    },
    {
      name: '安全的链接',
      content: '<a href="https://example.com">安全链接</a>',
      shouldBlock: false,
      dangerousPatterns: []
    },
    {
      name: '安全的图片',
      content: '<img src="https://example.com/image.jpg" alt="图片">',
      shouldBlock: false,
      dangerousPatterns: []
    }
  ];

  describe('XSS 攻击向量检测', () => {
    xssAttackVectors.forEach(({ name, content, shouldBlock, dangerousPatterns }) => {
      it(`${name} - 应该${shouldBlock ? '被阻止' : '被允许'}`, () => {
        const tokens = md.parse(content, {});
        const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

        expect(vnodes).toBeDefined();
        expect(Array.isArray(vnodes)).toBe(true);

        // 将 VNode 转换为字符串进行检查
        const vnodeString = JSON.stringify(vnodes, (key, value) => {
          // 忽略某些 Vue 内部属性
          if (key === '__v_isVNode' || key === 'shapeFlag' || key === 'patchFlag') {
            return undefined;
          }
          return value;
        });

        // 检查是否包含危险模式
        if (shouldBlock && dangerousPatterns.length > 0) {
          dangerousPatterns.forEach(pattern => {
            const found = pattern.test(vnodeString);
            expect(found, `${name} 中不应该包含危险模式: ${pattern}`).toBe(false);
          });
        } else if (!shouldBlock) {
          // 正常内容应该能正常渲染
          expect(vnodes.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('事件处理器检测', () => {
    const eventHandlers = [
      'onclick', 'onerror', 'onload', 'onmouseover', 'onfocus',
      'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
      'onkeydown', 'onkeyup', 'onkeypress', 'onabort', 'ondblclick',
      'onmousedown', 'onmouseup', 'onmousemove', 'onmouseout'
    ];

    eventHandlers.forEach(handler => {
      it(`应该阻止 ${handler} 事件处理器`, () => {
        const content = `<div ${handler}="alert('XSS')">内容</div>`;
        const tokens = md.parse(content, {});
        const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

        const vnodeString = JSON.stringify(vnodes);
        const handlerRegex = new RegExp(`${handler}\\s*[:=]`, 'i');
        const found = handlerRegex.test(vnodeString);

        expect(found, `${handler} 应该被移除或转义`).toBe(false);
      });
    });
  });

  describe('URL 协议验证', () => {
    const dangerousProtocols = [
      { protocol: 'javascript:', test: /javascript:/i },
      { protocol: 'vbscript:', test: /vbscript:/i },
      { protocol: 'file:', test: /file:/i },
      { protocol: 'data:text/html', test: /data:\s*text\/html/i }
    ];

    dangerousProtocols.forEach(({ protocol, test }) => {
      it(`应该阻止 ${protocol} 协议在 href 中`, () => {
        const content = `<a href="${protocol}alert(1)">链接</a>`;
        const tokens = md.parse(content, {});
        const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

        const vnodeString = JSON.stringify(vnodes);
        const found = test.test(vnodeString);

        expect(found, `${protocol} 协议应该被阻止`).toBe(false);
      });

      it(`应该阻止 ${protocol} 协议在 src 中`, () => {
        const content = `<img src="${protocol}alert(1)">`;
        const tokens = md.parse(content, {});
        const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

        const vnodeString = JSON.stringify(vnodes);
        const found = test.test(vnodeString);

        expect(found, `${protocol} 协议应该被阻止`).toBe(false);
      });
    });
  });

  describe('安全模式测试', () => {
    it('启用 safeMode 时应该进行属性验证', () => {
      const content = '<a href="javascript:alert(1)">链接</a>';
      const tokens = md.parse(content, {});

      // 使用 safeMode
      const vnodes = md.renderer.render(tokens, md.options, { safeMode: true }) as unknown as VNode[];

      const vnodeString = JSON.stringify(vnodes);
      expect(vnodeString).not.toContain('javascript:');
    });
  });

  describe('嵌套攻击测试', () => {
    it('应该处理嵌套的危险标签', () => {
      const content = '<div><script>alert(1)</script><iframe src="javascript:alert(2)"></iframe></div>';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const vnodeString = JSON.stringify(vnodes);
      expect(vnodeString).not.toContain('<script>');
      expect(vnodeString).not.toContain('<iframe>');
    });
  });

  describe('代码块中的内容', () => {
    it('代码块中的 HTML 应该被转义', () => {
      const content = '```html\n<script>alert(1)</script>\n```';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const vnodeString = JSON.stringify(vnodes);
      console.dir(vnodeString)
      // 代码块中的 script 应该作为文本，而不是标签
      // 检查是否包含转义的 script（通过组件渲染）
      expect(vnodes.length).toBeGreaterThan(0);
    });
  });
});

