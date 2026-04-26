/** Markdown 渲染性能基准测试 测试实时渲染场景下的性能表现 */

import MarkdownIt from 'markdown-it';
import { vueAdapter } from '@suga/markdown-it-render-vnode-vue';
import markdownItRenderVnode from '../index';

// 初始化
const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
md.use(markdownItRenderVnode, { adapter: vueAdapter });

const mdPlain = new MarkdownIt({ html: true, linkify: true, typographer: true });

// ==================== 测试内容 ====================

/** 简单短文本（模拟单行输入） */
const simpleText = 'Hello World';

/** 中等段落（模拟一段回复） */
const mediumParagraph =
  'This is a medium-length paragraph with **bold**, *italic*, `code` and [link](https://example.com). It contains multiple inline styles to test rendering throughput.';

/** 复杂混合内容（模拟富文本编辑器输出） */
const complexContent = `
# Document Title

## Section 1

This section contains **bold text**, *italic text*, ~~strikethrough~~, and \`inline code\`.

- Bullet item 1
- Bullet item 2
  - Nested item
- Bullet item 3

1. Numbered item 1
2. Numbered item 2

> Blockquote with **emphasis**
> Multi-line quote

| Column A | Column B | Column C |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

\`\`\`javascript
function hello() {
  console.log("Hello, World!");
  return { status: 'ok', data: [1, 2, 3] };
}
\`\`\`

[Link](https://example.com) and ![Image](https://example.com/img.png)

---

End of section.
`;

/** 大文档（模拟完整文档渲染） */
const largeDocument = Array(50).fill(complexContent).join('\n\n');

/** 超大文档（压力测试） */
const hugeDocument = Array(200).fill(complexContent).join('\n\n');

/** 增量更新场景（模拟用户逐步输入） */
const incrementalInputs = [
  'H',
  'He',
  'Hel',
  'Hell',
  'Hello',
  'Hello W',
  'Hello Wo',
  'Hello Wor',
  'Hello Worl',
  'Hello World',
  'Hello World\n\n',
  'Hello World\n\n# Title',
  'Hello World\n\n# Title\n\nParagraph',
  'Hello World\n\n# Title\n\nParagraph with **bold**'
];

// ==================== 辅助函数 ====================

function measureRender(label: string, content: string, iterations: number = 1) {
  // VNode 渲染
  const vnodeTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const tokens = md.parse(content, {});
    const start = performance.now();
    md.renderer.render(tokens, md.options, {});
    vnodeTimes.push(performance.now() - start);
  }

  // HTML 渲染（对比基准）
  const htmlTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const tokens = mdPlain.parse(content, {});
    const start = performance.now();
    mdPlain.renderer.render(tokens, mdPlain.options, {});
    htmlTimes.push(performance.now() - start);
  }

  const avgVnode = vnodeTimes.reduce((a, b) => a + b, 0) / iterations;
  const avgHtml = htmlTimes.reduce((a, b) => a + b, 0) / iterations;

  console.log(`\n${label}`);
  console.log(`  内容长度: ${content.length} chars`);
  console.log(`  VNode渲染: ${avgVnode.toFixed(2)}ms (平均${iterations}次)`);
  console.log(`  HTML渲染:  ${avgHtml.toFixed(2)}ms (对比基准)`);
  console.log(`  倍率: ${(avgVnode / avgHtml).toFixed(2)}x`);
  console.log(
    `  16ms帧预算: ${avgVnode < 16 ? '✅ 通过' : avgVnode < 33 ? '⚠️ 接近极限' : '❌ 超出'}`
  );
}

// ==================== 执行基准测试 ====================

console.log('========================================');
console.log('  Markdown 渲染性能基准测试');
console.log('  实时渲染标准: 单帧 ≤ 16ms (60fps)');
console.log('========================================');

// 1. 单次渲染性能
console.log('\n===== 1. 单次渲染性能 =====');
measureRender('简单文本', simpleText, 100);
measureRender('中等段落', mediumParagraph, 50);
measureRender('复杂内容', complexContent, 20);
measureRender('大文档(50x)', largeDocument, 10);
measureRender('超大文档(200x)', hugeDocument, 5);

// 2. 增量渲染性能（模拟实时输入）
console.log('\n===== 2. 增量渲染（模拟实时输入） =====');
let totalIncrementalTime = 0;
for (const input of incrementalInputs) {
  const tokens = md.parse(input, {});
  const start = performance.now();
  md.renderer.render(tokens, md.options, {});
  const duration = performance.now() - start;
  totalIncrementalTime += duration;
  console.log(
    `  "${input.substring(0, 30)}${input.length > 30 ? '...' : ''}" → ${duration.toFixed(2)}ms`
  );
}
console.log(`  总耗时: ${totalIncrementalTime.toFixed(2)}ms (${incrementalInputs.length}次)`);
console.log(`  平均: ${(totalIncrementalTime / incrementalInputs.length).toFixed(2)}ms`);

// 3. Parse vs Render 分解
console.log('\n===== 3. Parse vs Render 分解 =====');
for (const [label, content] of [
  ['简单', simpleText],
  ['中等', mediumParagraph],
  ['复杂', complexContent],
  ['大文档', largeDocument]
] as const) {
  const parseStart = performance.now();
  const tokens = md.parse(content, {});
  const parseTime = performance.now() - parseStart;

  const renderStart = performance.now();
  md.renderer.render(tokens, md.options, {});
  const renderTime = performance.now() - renderStart;

  console.log(
    `  ${label}: parse=${parseTime.toFixed(2)}ms, render=${renderTime.toFixed(2)}ms, total=${(parseTime + renderTime).toFixed(2)}ms`
  );
}

// 4. 长文档滚动渲染模拟（分段渲染）
console.log('\n===== 4. 分段渲染（模拟虚拟滚动） =====');
const sections = largeDocument.split('\n---\n');
let sectionTotal = 0;
for (const section of sections) {
  const tokens = md.parse(section.trim(), {});
  const start = performance.now();
  md.renderer.render(tokens, md.options, {});
  sectionTotal += performance.now() - start;
}
console.log(`  分段数: ${sections.length}`);
console.log(`  每段平均: ${(sectionTotal / sections.length).toFixed(2)}ms`);
console.log(`  总耗时: ${sectionTotal.toFixed(2)}ms`);

// 5. 内存估算
console.log('\n===== 5. VNode 产出数量 =====');
for (const [label, content] of [
  ['简单', simpleText],
  ['中等', mediumParagraph],
  ['复杂', complexContent],
  ['大文档', largeDocument],
  ['超大', hugeDocument]
] as const) {
  const tokens = md.parse(content, {});
  const vnodes = md.renderer.render(tokens, md.options, {}) as unknown as unknown[];
  console.log(`  ${label}: tokens=${tokens.length}, vnodes=${vnodes.length}`);
}

console.log('\n========================================');
console.log('  结论:');
console.log('  实时渲染(60fps)要求单帧≤16ms');
console.log('  适合实时: 简单/中等内容 ✅');
console.log('  需优化:   大文档分段渲染 ⚠️');
console.log('  不适合:   超大文档一次性渲染 ❌');
console.log('========================================');
