# Markdown 组件库

功能强大的 Markdown 渲染组件库，支持代码高亮、图表渲染、SVG 展示等功能。

## ✨ 特性

- 🎨 **TSX 语法** - 使用 TSX 编写，类型安全
- 🎭 **主题支持** - 自动适配暗色/亮色主题
- 📊 **图表渲染** - 支持 Mermaid、Markmap、ECharts
- 🔢 **数学公式** - 支持 LaTeX 数学公式渲染（KaTeX）
- 🔒 **安全可靠** - XSS 防护，内容清理
- 🧩 **独立使用** - 每个组件都可以独立使用
- 🔗 **集成使用** - 也可以通过 Markdown 自动渲染

## 📦 安装

组件已集成在项目中，直接导入使用即可。

## 🚀 使用方式

### 方式一：集成使用（Markdown 渲染）

```tsx
import { MarkdownPreview } from '@/components/markdown';

function App() {
  const markdown = `
# 标题

\`\`\`mermaid
graph TD
  A-->B
\`\`\`

\`\`\`javascript
console.log('Hello World');
\`\`\`
  `;

  return <MarkdownPreview content={markdown} />;
}
```

### 方式二：独立使用单个组件

#### 1. Mermaid 图表

```tsx
import { MermaidRenderer } from '@/components/markdown';

function MyComponent() {
  const mermaidCode = `
graph TD
  A[开始] --> B{是否通过}
  B -->|是| C[继续]
  B -->|否| D[结束]
  `;

  return <MermaidRenderer code={mermaidCode} langName="mermaid" showToolbar={true} />;
}
```

#### 2. 思维导图

```tsx
import { MindmapRenderer } from '@/components/markdown';

function MyComponent() {
  const markmapCode = `
# 根节点
## 子节点 1
### 子节点 1.1
### 子节点 1.2
## 子节点 2
  `;

  return <MindmapRenderer code={markmapCode} langName="markmap" />;
}
```

#### 3. ECharts 图表

```tsx
import { EchartsRenderer } from '@/components/markdown';

function MyComponent() {
  const chartOption = {
    title: { text: '示例图表' },
    xAxis: { data: ['A', 'B', 'C'] },
    yAxis: {},
    series: [
      {
        type: 'bar',
        data: [10, 20, 30]
      }
    ]
  };

  return <EchartsRenderer option={chartOption} height={400} />;
}
```

#### 4. 代码块

```tsx
import { CodeBlock } from '@/components/markdown';

function MyComponent() {
  const meta = {
    langName: 'javascript',
    content: 'console.log("Hello World");',
    attrs: {},
    info: 'javascript',
    token: {}
  };

  return <CodeBlock meta={meta} />;
}
```

#### 5. SVG 渲染

```tsx
import { SvgRenderer } from '@/components/markdown';

function MyComponent() {
  const svgContent = `
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="blue" />
</svg>
  `;

  return <SvgRenderer content={svgContent} />;
}
```

## 🎯 组件属性

### MarkdownPreview

| 属性    | 类型     | 默认值 | 说明          |
| ------- | -------- | ------ | ------------- |
| content | `string` | -      | Markdown 内容 |

### MermaidRenderer

| 属性        | 类型            | 默认值      | 说明                                |
| ----------- | --------------- | ----------- | ----------------------------------- |
| meta        | `CodeBlockMeta` | -           | 代码块元数据（Markdown 集成时使用） |
| code        | `string`        | `''`        | Mermaid 代码（独立使用时）          |
| langName    | `string`        | `'mermaid'` | 语言名称                            |
| showToolbar | `boolean`       | `true`      | 是否显示工具栏                      |
| bordered    | `boolean`       | `true`      | 是否显示边框                        |

### MindmapRenderer

| 属性        | 类型            | 默认值      | 说明           |
| ----------- | --------------- | ----------- | -------------- |
| meta        | `CodeBlockMeta` | -           | 代码块元数据   |
| code        | `string`        | `''`        | Markmap 代码   |
| langName    | `string`        | `'markmap'` | 语言名称       |
| showToolbar | `boolean`       | `true`      | 是否显示工具栏 |
| bordered    | `boolean`       | `true`      | 是否显示边框   |

### EchartsRenderer

| 属性       | 类型                      | 默认值 | 说明             |
| ---------- | ------------------------- | ------ | ---------------- |
| meta       | `CodeBlockMeta`           | -      | 代码块元数据     |
| option     | `EChartsOption \| string` | -      | ECharts 配置     |
| height     | `string \| number`        | `300`  | 图表高度         |
| bordered   | `boolean`                 | `true` | 是否显示边框     |
| autoResize | `boolean`                 | `true` | 是否自动调整大小 |

### SvgRenderer

| 属性    | 类型                  | 默认值 | 说明     |
| ------- | --------------------- | ------ | -------- |
| content | `string`              | -      | SVG 内容 |
| attrs   | `Record<string, any>` | `{}`   | 额外属性 |

### CodeBlock

| 属性 | 类型            | 默认值 | 说明         |
| ---- | --------------- | ------ | ------------ |
| meta | `CodeBlockMeta` | -      | 代码块元数据 |

## 🎨 主题

组件自动适配项目主题，无需额外配置。使用 `useMarkdownTheme` Hook 可以访问主题相关信息。

```tsx
import { useMarkdownTheme } from '@/components/markdown';

function MyComponent() {
  const { darkMode, cssVars, themeClass } = useMarkdownTheme();

  return (
    <div style={cssVars.value} class={themeClass.value}>
      {/* 内容 */}
    </div>
  );
}
```

## 🔧 工具函数

### SVG 工具

```tsx
import { isSvgContent, sanitizeSvg, downloadSvg, copySvgToClipboard } from '@/components/markdown';

// 检测是否为 SVG
const isSvg = isSvgContent('<svg>...</svg>');

// 清理 SVG（防 XSS）
const cleanSvg = sanitizeSvg(svgString);

// 下载 SVG
downloadSvg(svgString, 'chart.svg');

// 复制 SVG 到剪贴板
await copySvgToClipboard(svgString);
```

### 安全工具

```tsx
import { escapeHtml, unescapeAll, sanitizeHtml } from '@/components/markdown';

// HTML 转义
const escaped = escapeHtml('<script>alert("xss")</script>');

// HTML 反转义
const unescaped = unescapeAll('&lt;div&gt;');

// 清理 HTML
const clean = sanitizeHtml(htmlString);
```

## 📚 类型定义

所有组件都有完整的 TypeScript 类型定义，可以直接导入使用：

```tsx
import type {
  CodeBlockMeta,
  SvgMeta,
  MermaidRendererProps,
  EchartsRendererProps
} from '@/components/markdown';
```

## 🎯 最佳实践

### 1. 独立使用组件

当你只需要某个特定功能时，可以直接导入对应组件：

```tsx
// ✅ 推荐：按需导入
import { MermaidRenderer } from '@/components/markdown';

// ❌ 不推荐：导入整个 Markdown 组件
import { MarkdownPreview } from '@/components/markdown';
```

### 2. 组合使用

可以组合使用多个渲染器：

```tsx
function Dashboard() {
  return (
    <>
      <MermaidRenderer code={flowchart} />
      <EchartsRenderer option={chartData} />
      <CodeBlock meta={codeMetadata} />
    </>
  );
}
```

### 3. 响应式设计

所有组件都支持响应式布局，自动适配不同屏幕尺寸。

### 4. 性能优化

- 使用 `debounce` 防抖渲染
- 图表组件支持自动 resize
- SVG 组件支持懒加载

## 🔒 安全性

- ✅ XSS 防护
- ✅ SVG 内容清理
- ✅ HTML 标签过滤
- ✅ 危险属性移除

## 📄 License

MIT
