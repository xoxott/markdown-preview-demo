/** Markdown 渲染插件单元测试 */

import type { VNode } from 'vue';
import MarkdownIt from 'markdown-it';
import { beforeEach, describe, expect, it } from 'vitest';
import markdownItRenderVnode from '../index';
import { vueAdapter } from '@suga/markdown-it-render-vnode-vue';

describe('markdownItRenderVnode', () => {
  let md: MarkdownIt;

  beforeEach(() => {
    md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });
    md.use(markdownItRenderVnode, { adapter: vueAdapter });
  });

  describe('基础文本渲染', () => {
    it('应该正确渲染纯文本', () => {
      const tokens = md.parse('Hello World', {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      expect(vnodes).toBeDefined();
      expect(Array.isArray(vnodes)).toBe(true);
      expect(vnodes.length).toBeGreaterThan(0);
    });

    it('应该正确渲染段落', () => {
      const tokens = md.parse('This is a paragraph.', {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const paragraph = vnodes.find(node => node.type === 'p');
      expect(paragraph).toBeDefined();
    });

    it('应该正确渲染多个段落', () => {
      const content = 'Paragraph 1\n\nParagraph 2\n\nParagraph 3';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const paragraphs = vnodes.filter(node => node.type === 'p');
      expect(paragraphs.length).toBe(3);
    });
  });

  describe('代码块渲染', () => {
    it('应该正确渲染行内代码', () => {
      const tokens = md.parse('This is `inline code` here', {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      expect(vnodes.length).toBeGreaterThan(0);
      // 检查是否包含 code 元素
      const hasCode = JSON.stringify(vnodes).includes('"code"');
      expect(hasCode).toBe(true);
    });

    it('应该正确渲染代码块', () => {
      const content = '```javascript\nconsole.log("Hello");\n```';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      expect(vnodes.length).toBeGreaterThan(0);
      // 检查是否包含 pre 元素
      const hasPre = vnodes.some(node => node.type === 'pre');
      expect(hasPre).toBe(true);
    });

    it('应该正确识别代码语言', () => {
      const content = '```python\nprint("Hello")\n```';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const preNode = vnodes.find(node => node.type === 'pre');
      expect(preNode).toBeDefined();
      expect(preNode?.props?.['data-lang']).toBe('python');
    });
  });

  describe('HTML 渲染', () => {
    it('应该正确渲染 HTML 块', () => {
      const content = '<div>HTML content</div>';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      expect(vnodes).toBeDefined();
      expect(vnodes.length).toBeGreaterThan(0);
    });

    it('应该正确渲染行内 HTML', () => {
      const content = 'Text with <span>HTML</span> inline';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      expect(vnodes).toBeDefined();
    });
  });

  describe('列表渲染', () => {
    it('应该正确渲染无序列表', () => {
      const content = '- Item 1\n- Item 2\n- Item 3';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const ulNode = vnodes.find(node => node.type === 'ul');
      expect(ulNode).toBeDefined();
    });

    it('应该正确渲染有序列表', () => {
      const content = '1. First\n2. Second\n3. Third';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const olNode = vnodes.find(node => node.type === 'ol');
      expect(olNode).toBeDefined();
    });
  });

  describe('链接和图片渲染', () => {
    it('应该正确渲染链接', () => {
      const content = '[Link text](https://example.com)';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      expect(vnodes).toBeDefined();
      const linkExists = JSON.stringify(vnodes).includes('https://example.com');
      expect(linkExists).toBe(true);
    });

    it('应该正确渲染图片', () => {
      const content = '![Alt text](https://example.com/image.jpg)';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      expect(vnodes).toBeDefined();
      const hasImg = JSON.stringify(vnodes).includes('img');
      expect(hasImg).toBe(true);
    });
  });

  describe('标题渲染', () => {
    it('应该正确渲染 H1 标题', () => {
      const tokens = md.parse('# Heading 1', {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const h1Node = vnodes.find(node => node.type === 'h1');
      expect(h1Node).toBeDefined();
    });

    it('应该正确渲染多级标题', () => {
      const content = '# H1\n## H2\n### H3';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const h1 = vnodes.find(node => node.type === 'h1');
      const h2 = vnodes.find(node => node.type === 'h2');
      const h3 = vnodes.find(node => node.type === 'h3');

      expect(h1).toBeDefined();
      expect(h2).toBeDefined();
      expect(h3).toBeDefined();
    });
  });

  describe('引用渲染', () => {
    it('应该正确渲染引用块', () => {
      const content = '> This is a quote';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      const blockquote = vnodes.find(node => node.type === 'blockquote');
      expect(blockquote).toBeDefined();
    });
  });

  describe('换行渲染', () => {
    it('应该正确处理硬换行', () => {
      const content = 'Line 1  \nLine 2';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];

      expect(vnodes).toBeDefined();
    });

    it('应该正确处理 breaks 选项', () => {
      const mdWithBreaks = new MarkdownIt({ breaks: true });
      mdWithBreaks.use(markdownItRenderVnode, { adapter: vueAdapter });

      const content = 'Line 1\nLine 2';
      const tokens = mdWithBreaks.parse(content, {});
      const vnodes = mdWithBreaks.renderer.render(tokens, mdWithBreaks.options, {}) as unknown as VNode[];

      expect(vnodes).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该能快速渲染大量内容', () => {
      const content = Array(100).fill('# Heading\n\nParagraph content\n\n- List item').join('\n\n');

      const start = performance.now();
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];
      const duration = performance.now() - start;

      expect(vnodes).toBeDefined();
      expect(duration).toBeLessThan(1000); // 应在 1 秒内完成
    });

    it('应该能处理复杂嵌套结构', () => {
      const content = `
# Heading

- List item 1
  - Nested item 1
  - Nested item 2
    - Deep nested
- List item 2

> Quote
> with **bold** and *italic*

\`\`\`javascript
const code = "test";
console.log(code);
\`\`\`
      `.trim();

      const start = performance.now();
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];
      const duration = performance.now() - start;

      expect(vnodes).toBeDefined();
      expect(vnodes.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('安全性测试', () => {
    it('应该处理安全模式', () => {
      const content = '<script>alert("XSS")</script>';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, { safeMode: true }) as unknown as VNode[];

      expect(vnodes).toBeDefined();
    });

    it('应该过滤危险的 URL 协议', () => {
      const content = '[Link](javascript:alert("XSS"))';
      const tokens = md.parse(content, {});
      const vnodes = md.renderer.render(tokens, md.options, { safeMode: true }) as unknown as VNode[];

      expect(vnodes).toBeDefined();
    });
  });

  describe('配置选项测试', () => {
    it('应该要求提供适配器', () => {
      const mdEmpty = new MarkdownIt();
      expect(() => {
        // 测试缺少适配器的情况
        mdEmpty.use(markdownItRenderVnode, {} as any);
      }).toThrow();
    });

    it('应该接受自定义组件配置', () => {
      const mdCustom = new MarkdownIt();
      const customComponent = () => null;

      expect(() => {
        mdCustom.use(markdownItRenderVnode, {
          adapter: vueAdapter,
          components: {
            codeBlock: customComponent
          }
        });
      }).not.toThrow();
    });

    it('应该接受性能配置', () => {
      const mdPerf = new MarkdownIt();
      expect(() => {
        mdPerf.use(markdownItRenderVnode, {
          adapter: vueAdapter,
          performance: {
            enableCache: true,
            cacheSize: 200
          }
        });
      }).not.toThrow();
    });

    it('应该接受错误处理配置', () => {
      const mdError = new MarkdownIt();
      expect(() => {
        mdError.use(markdownItRenderVnode, {
          adapter: vueAdapter,
          errorHandler: {
            mode: 'warn',
            errorPrefix: '[Test]'
          }
        });
      }).not.toThrow();
    });

    it('应该接受自定义渲染规则', () => {
      const mdCustom = new MarkdownIt();
      expect(() => {
        mdCustom.use(markdownItRenderVnode, {
          adapter: vueAdapter,
          customRules: {
            heading_open: () => null
          }
        });
      }).not.toThrow();
    });
  });

  describe('自定义组件测试', () => {
    it('应该支持自定义代码块组件', () => {
      const mdCustom = new MarkdownIt();
      let customComponentCalled = false;

      mdCustom.use(markdownItRenderVnode, {
        adapter: vueAdapter,
        components: {
          codeBlock: () => {
            customComponentCalled = true;
            return null;
          }
        }
      });

      const content = '```javascript\nconsole.log("test");\n```';
      const tokens = mdCustom.parse(content, {});
      mdCustom.renderer.render(tokens, mdCustom.options, {}) as unknown as VNode[];

      expect(customComponentCalled).toBe(true);
    });
  });

  describe('自定义规则测试', () => {
    it('应该支持覆盖默认规则', () => {
      const mdCustom = new MarkdownIt();
      let customRuleCalled = false;

      mdCustom.use(markdownItRenderVnode, {
        adapter: vueAdapter,
        customRules: {
          text: () => {
            customRuleCalled = true;
            return null;
          }
        }
      });

      const tokens = mdCustom.parse('Hello', {});
      mdCustom.renderer.render(tokens, mdCustom.options, {}) as unknown as VNode[];

      expect(customRuleCalled).toBe(true);
    });
  });

  describe('SSR 兼容性测试', () => {
    it('应该在 SSR 环境中正常工作', () => {
      // 模拟 SSR 环境（document 未定义）
      const originalDocument = global.document;
      // @ts-expect-error - 模拟 SSR 环境
      delete global.document;

      try {
        const mdSSR = new MarkdownIt();
        mdSSR.use(markdownItRenderVnode, { adapter: vueAdapter });

        const content = '<div>HTML content</div>';
        const tokens = mdSSR.parse(content, {});
        const vnodes = mdSSR.renderer.render(tokens, mdSSR.options, {}) as unknown as VNode[];

        expect(vnodes).toBeDefined();
        expect(vnodes.length).toBeGreaterThan(0);
      } finally {
        // 恢复 document
        global.document = originalDocument;
      }
    });
  });
});

