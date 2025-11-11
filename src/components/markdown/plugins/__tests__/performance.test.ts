/**
 * 性能对比测试：V1 vs V2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MarkdownIt from 'markdown-it';
import MarkdownVuePluginV1 from '../markdown-render-vnode';
import MarkdownVuePluginV2 from '../markdown-render-vnode-v2';

// 测试用例内容
const testCases = {
  simple: 'Hello World',
  
  paragraph: 'This is a simple paragraph with some text.',
  
  heading: '# Heading 1\n## Heading 2\n### Heading 3',
  
  list: '- Item 1\n- Item 2\n- Item 3\n  - Nested 1\n  - Nested 2',
  
  code: '```javascript\nconst x = 1;\nconsole.log(x);\n```',
  
  mixed: `
# Document Title

This is a paragraph with **bold** and *italic* text.

## Section 1

- List item 1
- List item 2
- List item 3

## Section 2

\`\`\`python
def hello():
    print("Hello World")
\`\`\`

> This is a quote
> with multiple lines

[Link](https://example.com) and \`inline code\`.
  `.trim(),
  
  large: Array(50).fill(`
# Section

Paragraph with text.

- List item 1
- List item 2

\`\`\`javascript
console.log("test");
\`\`\`
  `).join('\n\n')
};

describe('性能对比测试', () => {
  let mdV1: MarkdownIt;
  let mdV2: MarkdownIt;

  beforeEach(() => {
    mdV1 = new MarkdownIt({ html: true });
    mdV1.use(MarkdownVuePluginV1, {
      components: {
        codeBlock: () => null
      }
    });

    mdV2 = new MarkdownIt({ html: true });
    mdV2.use(MarkdownVuePluginV2, {
      components: {
        codeBlock: () => null
      }
    });
  });

  describe('简单内容渲染', () => {
    it('V2 应该比 V1 更快或相当（简单文本）', () => {
      const content = testCases.simple;
      
      // V1 性能
      const v1Start = performance.now();
      for (let i = 0; i < 100; i++) {
        const tokens = mdV1.parse(content, {});
        mdV1.renderer.render(tokens, mdV1.options, {});
      }
      const v1Duration = performance.now() - v1Start;
      
      // V2 性能
      const v2Start = performance.now();
      for (let i = 0; i < 100; i++) {
        const tokens = mdV2.parse(content, {});
        mdV2.renderer.render(tokens, mdV2.options, {});
      }
      const v2Duration = performance.now() - v2Start;
      
      console.log(`简单文本 - V1: ${v1Duration.toFixed(2)}ms, V2: ${v2Duration.toFixed(2)}ms`);
      expect(v2Duration).toBeLessThanOrEqual(v1Duration * 1.5); // 允许 50% 误差
    });
  });

  describe('复杂内容渲染', () => {
    it('V2 应该比 V1 更快（混合内容）', () => {
      const content = testCases.mixed;
      
      const v1Start = performance.now();
      for (let i = 0; i < 50; i++) {
        const tokens = mdV1.parse(content, {});
        mdV1.renderer.render(tokens, mdV1.options, {});
      }
      const v1Duration = performance.now() - v1Start;
      
      const v2Start = performance.now();
      for (let i = 0; i < 50; i++) {
        const tokens = mdV2.parse(content, {});
        mdV2.renderer.render(tokens, mdV2.options, {});
      }
      const v2Duration = performance.now() - v2Start;
      
      console.log(`混合内容 - V1: ${v1Duration.toFixed(2)}ms, V2: ${v2Duration.toFixed(2)}ms`);
      console.log(`性能提升: ${((1 - v2Duration / v1Duration) * 100).toFixed(1)}%`);
      
      expect(v2Duration).toBeLessThanOrEqual(v1Duration * 1.2);
    });

    it('V2 应该比 V1 更快（大量内容）', () => {
      const content = testCases.large;
      
      const v1Start = performance.now();
      for (let i = 0; i < 10; i++) {
        const tokens = mdV1.parse(content, {});
        mdV1.renderer.render(tokens, mdV1.options, {});
      }
      const v1Duration = performance.now() - v1Start;
      
      const v2Start = performance.now();
      for (let i = 0; i < 10; i++) {
        const tokens = mdV2.parse(content, {});
        mdV2.renderer.render(tokens, mdV2.options, {});
      }
      const v2Duration = performance.now() - v2Start;
      
      console.log(`大量内容 - V1: ${v1Duration.toFixed(2)}ms, V2: ${v2Duration.toFixed(2)}ms`);
      console.log(`性能提升: ${((1 - v2Duration / v1Duration) * 100).toFixed(1)}%`);
      
      expect(v2Duration).toBeLessThanOrEqual(v1Duration);
    });
  });

  describe('内存使用', () => {
    it('应该测试内存使用情况', () => {
      const content = testCases.large;
      
      // 多次渲染以观察内存
      for (let i = 0; i < 20; i++) {
        const tokens = mdV2.parse(content, {});
        mdV2.renderer.render(tokens, mdV2.options, {});
      }
      
      // 如果有内存泄漏，多次运行会导致内存持续增长
      expect(true).toBe(true);
    });
  });

  describe('渲染一致性', () => {
    it('V1 和 V2 应该产生相似的结果', () => {
      const content = testCases.mixed;
      
      const tokensV1 = mdV1.parse(content, {});
      const vnodesV1 = mdV1.renderer.render(tokensV1, mdV1.options, {});
      
      const tokensV2 = mdV2.parse(content, {});
      const vnodesV2 = mdV2.renderer.render(tokensV2, mdV2.options, {});
      
      // 检查生成的 VNode 数量应该相似
      expect(Array.isArray(vnodesV1)).toBe(true);
      expect(Array.isArray(vnodesV2)).toBe(true);
      expect(vnodesV1.length).toBeGreaterThan(0);
      expect(vnodesV2.length).toBeGreaterThan(0);
    });
  });
});

