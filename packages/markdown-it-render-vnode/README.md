# @suga/markdown-it-render-vnode

一个用于将 Markdown 渲染为框架无关虚拟节点的 markdown-it 插件。支持 Vue、React 或任何其他框架，通过适配器模式实现跨框架兼容。

## ✨ 特性

- 🎯 **框架无关**: 通过适配器模式支持 Vue、React 或任何自定义框架
- 📦 **模块化设计**: 适配器作为独立包，按需引入，减少打包体积
- 🔧 **高度可扩展**: 轻松创建自定义适配器或渲染规则
- ⚡ **性能优化**: 内置缓存机制、对象池、性能监控等优化
- 🛡️ **类型安全**: 完整的 TypeScript 类型定义
- 🔒 **安全渲染**: 内置 XSS 防护和属性验证
- 🎨 **自定义组件**: 支持为代码块、表格、链接、图片等提供自定义组件
- 📝 **SSR 兼容**: 支持服务端渲染场景

## 📦 安装

### 核心包（必需）

```bash
npm install @suga/markdown-it-render-vnode markdown-it
# 或
pnpm add @suga/markdown-it-render-vnode markdown-it
# 或
yarn add @suga/markdown-it-render-vnode markdown-it
```

### Vue 适配器（可选）

```bash
npm install @suga/markdown-it-render-vnode-vue vue
```

### React 适配器（可选）

```bash
npm install @suga/markdown-it-render-vnode-react react
```

## 🚀 快速开始

### Vue 3 使用示例

```typescript
import { defineComponent, ref, watch } from 'vue';
import type { VNode } from 'vue';
import MarkdownIt from 'markdown-it';
import markdownItRenderVnode from '@suga/markdown-it-render-vnode';
import { vueAdapter } from '@suga/markdown-it-render-vnode-vue';

export default defineComponent({
  name: 'MarkdownPreview',
  props: {
    content: {
      type: String,
      required: true
    }
  },
  setup(props) {
    // 初始化 MarkdownIt 实例
    const md = new MarkdownIt({
      html: true,        // 允许 HTML
      linkify: true,     // 自动识别链接
      typographer: true, // 启用排版优化
      breaks: true       // 将换行符转换为 <br>
    });

    // 使用插件（必须提供适配器）
    md.use(markdownItRenderVnode, {
      adapter: vueAdapter
    });

    // 渲染结果
    const vnodes = ref<VNode[]>([]);

    // 监听内容变化并重新渲染
    watch(
      () => props.content,
      (newContent) => {
        if (newContent) {
          const tokens = md.parse(newContent, {});
          const result = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];
          vnodes.value = result;
        }
      },
      { immediate: true }
    );

    return () => vnodes.value;
  }
});
```

### React 使用示例

```typescript
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import MarkdownIt from 'markdown-it';
import markdownItRenderVnode from '@suga/markdown-it-render-vnode';
import { reactAdapter } from '@suga/markdown-it-render-vnode-react';

interface MarkdownPreviewProps {
  content: string;
}

function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const [elements, setElements] = useState<ReactElement[]>([]);

  useEffect(() => {
    // 初始化 MarkdownIt 实例
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true
    });

    // 使用插件
    md.use(markdownItRenderVnode, {
      adapter: reactAdapter
    });

    // 解析并渲染
    const tokens = md.parse(content, {});
    const result = md.renderer.render(tokens, md.options, {}) as unknown as ReactElement[];
    setElements(result);
  }, [content]);

  return <>{elements}</>;
}

export default MarkdownPreview;
```

## ⚙️ 配置选项

插件支持丰富的配置选项，用于自定义渲染行为：

```typescript
interface FrameworkPluginOptions {
  // 必需：框架适配器
  adapter: FrameworkAdapter;

  // 可选：自定义组件
  components?: {
    codeBlock?: (meta: CodeBlockMeta) => FrameworkComponent | Promise<FrameworkComponent> | null;
    table?: (meta: { token: Token }) => FrameworkComponent | Promise<FrameworkComponent> | null;
    link?: (meta: { token: Token; href: string; title?: string }) => FrameworkComponent | Promise<FrameworkComponent> | null;
    image?: (meta: { token: Token; src: string; alt: string; title?: string }) => FrameworkComponent | Promise<FrameworkComponent> | null;
  };

  // 可选：性能配置
  performance?: {
    enableCache?: boolean;  // 是否启用缓存（默认: true）
    cacheSize?: number;     // 缓存大小（默认: 100）
  };

  // 可选：错误处理配置
  errorHandler?: {
    mode?: 'silent' | 'warn' | 'strict';  // 错误处理模式（默认: 'warn'）
    errorPrefix?: string;                  // 错误消息前缀（默认: '[Markdown Renderer]'）
  };

  // 可选：自定义渲染规则
  customRules?: Partial<RenderRules>;
}
```

### 配置示例

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,

  // 自定义组件
  components: {
    codeBlock: (meta) => {
      // 根据语言返回不同的组件
      if (meta.langName === 'mermaid') {
        return MermaidChart;
      }
      if (meta.langName === 'echarts') {
        return EchartsChart;
      }
      return DefaultCodeBlock;
    },

    image: (meta) => {
      // 自定义图片组件，支持懒加载等
      return LazyImage;
    }
  },

  // 性能配置
  performance: {
    enableCache: true,
    cacheSize: 200
  },

  // 错误处理
  errorHandler: {
    mode: 'warn',  // 'silent' | 'warn' | 'strict'
    errorPrefix: '[Markdown]'
  }
});
```

## 🎨 自定义组件

### 代码块组件

代码块组件接收 `CodeBlockMeta` 对象，包含以下信息：

```typescript
interface CodeBlockMeta {
  langName: string;              // 语言名称（如 'javascript', 'python'）
  content: string;               // 代码内容
  attrs: Record<string, string>; // 属性对象
  info: string;                  // 完整的 info 字符串（如 'javascript:1:10'）
  token: Token;                  // 原始 Token 对象
}
```

**示例：自定义代码块组件**

```typescript
import { defineComponent } from 'vue';
import type { CodeBlockMeta } from '@suga/markdown-it-render-vnode';

const CustomCodeBlock = defineComponent({
  props: {
    meta: {
      type: Object as PropType<CodeBlockMeta>,
      required: true
    }
  },
  setup(props) {
    return () => (
      <div class="custom-code-block">
        <div class="code-header">
          <span>{props.meta.langName}</span>
          <button onClick={handleCopy}>复制</button>
        </div>
        <pre><code>{props.meta.content}</code></pre>
      </div>
    );
  }
});

md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  components: {
    codeBlock: () => CustomCodeBlock
  }
});
```

### 异步组件支持

组件工厂函数可以返回 Promise，支持异步加载组件：

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  components: {
    codeBlock: async (meta) => {
      if (meta.langName === 'mermaid') {
        // 动态导入 Mermaid 组件
        const { MermaidChart } = await import('./components/MermaidChart.vue');
        return MermaidChart;
      }
      return null; // 使用默认渲染
    }
  }
});
```

## 🔧 自定义适配器

如果需要在其他框架中使用，或需要自定义渲染行为，可以创建自己的适配器：

```typescript
import type { FrameworkAdapter } from '@suga/markdown-it-render-vnode/adapters';

const myAdapter: FrameworkAdapter = {
  // 创建元素节点
  createElement(tag, props, children) {
    // tag: 标签名（如 'div', 'span'）或组件
    // props: 属性对象
    // children: 子节点（可能是数组、单个节点或字符串）
    return YourFramework.createElement(tag, props, children);
  },

  // 创建文本节点
  createText(text) {
    return YourFramework.createTextNode(text);
  },

  // 创建片段（用于包装多个根节点）
  createFragment(children) {
    return YourFramework.createFragment(children);
  },

  // 创建注释节点（可选）
  createComment() {
    return YourFramework.createComment();
  },

  // 判断是否为片段（可选）
  isFragment(node) {
    return YourFramework.isFragment(node);
  },

  // 获取子节点（可选）
  getChildren(node) {
    return YourFramework.getChildren(node);
  },

  // 设置子节点（可选）
  setChildren(node, children) {
    YourFramework.setChildren(node, children);
  }
};

// 使用自定义适配器
md.use(markdownItRenderVnode, {
  adapter: myAdapter
});
```

### 适配器接口说明

| 方法 | 必需 | 说明 |
|------|------|------|
| `createElement` | ✅ | 创建元素节点，接收标签名/组件、属性对象、子节点 |
| `createText` | ✅ | 创建文本节点，接收文本内容 |
| `createFragment` | ✅ | 创建片段节点，用于包装多个根节点 |
| `createComment` | ✅ | 创建注释节点（某些框架可能返回 null） |
| `isFragment` | ❌ | 判断节点是否为片段（用于优化） |
| `getChildren` | ❌ | 获取节点的子节点（用于优化） |
| `setChildren` | ❌ | 设置节点的子节点（用于优化） |

## 📝 自定义渲染规则

如果需要自定义特定 Token 类型的渲染方式，可以提供 `customRules`：

```typescript
import type { RenderRule } from '@suga/markdown-it-render-vnode';

const customHeadingRule: RenderRule = (tokens, idx, options, env, renderer) => {
  const token = tokens[idx];
  const adapter = getAdapter();

  // 自定义标题渲染逻辑
  const level = token.tag.replace('h', '');
  return adapter.createElement(
    `h${level}`,
    { class: `custom-heading heading-${level}` },
    renderer.renderToken(tokens, idx, options, env)
  );
};

md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  customRules: {
    heading_open: customHeadingRule,
    // 可以覆盖多个规则
    blockquote_open: customBlockquoteRule
  }
});
```

### 可用的渲染规则

插件内置了以下渲染规则，都可以被覆盖：

- `code_inline` - 行内代码
- `code_block` - 代码块
- `fence` - 围栏代码块（```）
- `html_block` - HTML 块
- `html_inline` - 行内 HTML
- `text` - 文本
- `hardbreak` - 硬换行
- `softbreak` - 软换行
- `image` - 图片
- `media` - 媒体元素

## 🛡️ 错误处理

插件提供了三种错误处理模式：

### 1. silent（静默模式）

错误发生时，不输出任何信息，返回降级节点或空节点：

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  errorHandler: {
    mode: 'silent'
  }
});
```

### 2. warn（警告模式，默认）

错误发生时，在控制台输出警告信息，并返回降级节点：

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  errorHandler: {
    mode: 'warn',
    errorPrefix: '[Markdown]'  // 自定义错误前缀
  }
});
```

### 3. strict（严格模式）

错误发生时，直接抛出异常：

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  errorHandler: {
    mode: 'strict'
  }
});
```

## ⚡ 性能优化

### 缓存机制

插件内置了 VNode 缓存机制，可以显著提升重复渲染的性能：

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  performance: {
    enableCache: true,  // 启用缓存（默认: true）
    cacheSize: 200      // 缓存大小（默认: 100）
  }
});
```

### 性能监控

在开发模式下，插件会自动监控渲染性能，如果渲染时间超过阈值（50ms），会在控制台输出警告。

### 对象池

插件使用对象池技术来减少对象创建和垃圾回收，提升性能。

## 📚 API 参考

### 类型定义

#### `FrameworkPluginOptions`

插件配置选项：

```typescript
interface FrameworkPluginOptions {
  adapter: FrameworkAdapter;
  components?: ComponentConfig;
  performance?: PerformanceConfig;
  errorHandler?: ErrorHandlerConfig;
  customRules?: Partial<RenderRules>;
}
```

#### `CodeBlockMeta`

代码块元数据：

```typescript
interface CodeBlockMeta {
  langName: string;
  content: string;
  attrs: Record<string, string>;
  info: string;
  token: Token;
}
```

#### `FrameworkAdapter`

框架适配器接口：

```typescript
interface FrameworkAdapter {
  createElement(tag: string | FrameworkComponent, props: NodeProps | null, children: NodeChildren): FrameworkNode;
  createText(text: string): FrameworkNode | string;
  createFragment(children: FrameworkNode[]): FrameworkNode;
  createComment(): FrameworkNode | null;
  isFragment?(node: FrameworkNode): boolean;
  getChildren?(node: FrameworkNode): FrameworkNode[];
  setChildren?(node: FrameworkNode, children: FrameworkNode[]): void;
}
```

### 工具函数

#### `setAdapter(adapter: FrameworkAdapter)`

设置全局适配器（通常不需要手动调用，插件会自动设置）。

#### `getAdapter(): FrameworkAdapter`

获取当前使用的适配器。

#### `hasAdapter(): boolean`

检查是否已设置适配器。

#### `handleError(error: unknown, context: string, fallback?: FrameworkNode): FrameworkNode`

处理错误并返回降级节点。

#### `safeExecute<T>(fn: () => T, context: string, fallback: T): T`

安全执行函数，捕获错误并返回降级值。

## 🔍 常见问题

### Q: 为什么必须提供适配器？

A: 插件本身是框架无关的，需要通过适配器来适配不同的框架。这样可以保持核心包的轻量，并支持任意框架。

### Q: 可以在同一个项目中使用多个适配器吗？

A: 每个 MarkdownIt 实例只能使用一个适配器。如果需要同时支持多个框架，需要创建多个 MarkdownIt 实例。

### Q: 如何禁用缓存？

A: 设置 `performance.enableCache` 为 `false`：

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  performance: {
    enableCache: false
  }
});
```

### Q: 自定义组件返回 null 会怎样？

A: 如果组件工厂函数返回 `null`，插件会使用默认的渲染规则。

### Q: 支持服务端渲染（SSR）吗？

A: 是的，插件完全支持 SSR。只需确保在服务端和客户端使用相同的适配器即可。

### Q: 如何调试渲染问题？

A: 在开发模式下，插件会自动输出性能警告。你也可以通过 `errorHandler.mode` 设置为 `'strict'` 来让错误直接抛出，便于调试。

## 📦 相关包

- **@suga/markdown-it-render-vnode**: 核心渲染逻辑（无框架依赖）
- **@suga/markdown-it-render-vnode-vue**: Vue 适配器
- **@suga/markdown-it-render-vnode-react**: React 适配器

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT
