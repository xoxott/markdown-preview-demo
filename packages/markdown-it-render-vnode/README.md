# @suga/markdown-it-render-vnode

一个强大的 markdown-it 插件，将 Markdown 渲染为框架无关的虚拟节点。通过适配器模式，轻松支持 Vue、React 或任何自定义框架。

## ✨ 特性

- 🎯 **框架无关**: 一套代码，支持 Vue、React 或任何自定义框架
- ⚡ **高性能**: 通过 key 优化，让框架高效进行 diff 和 DOM 复用
- 🎨 **自定义组件**: 为代码块、表格、链接、图片等提供自定义组件支持
- 🛡️ **类型安全**: 完整的 TypeScript 类型定义，开发体验友好
- 🔒 **安全可靠**: 内置 XSS 防护和属性验证
- 📦 **按需引入**: 适配器独立包，减少打包体积
- 🔧 **高度可扩展**: 轻松创建自定义适配器或渲染规则
- 📝 **SSR 友好**: 完美支持服务端渲染
- 🔍 **实例隔离**: 多实例独立管理，无全局状态污染

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
npm install @suga/markdown-it-render-vnode-vue
```

### React 适配器（可选）

```bash
npm install @suga/markdown-it-render-vnode-react
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
    // 初始化 Markdown 解析器
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });

    // 使用插件，传入 Vue 适配器
    md.use(markdownItRenderVnode, {
      adapter: vueAdapter
    });

    const vnodes = ref<VNode[]>([]);

    // 监听内容变化，重新渲染
    watch(
      () => props.content,
      (newContent) => {
        if (newContent) {
          const tokens = md.parse(newContent, {});
          vnodes.value = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];
        }
      },
      { immediate: true }
    );

    return () => (
      <div class="markdown-body">
        {vnodes.value}
      </div>
    );
  }
});
```

### React 使用示例

```tsx
import React, { useMemo } from 'react';
import MarkdownIt from 'markdown-it';
import markdownItRenderVnode from '@suga/markdown-it-render-vnode';
import { reactAdapter } from '@suga/markdown-it-render-vnode-react';

// 初始化 Markdown 解析器（只需初始化一次）
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

md.use(markdownItRenderVnode, {
  adapter: reactAdapter
});

interface MarkdownPreviewProps {
  content: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const vnodes = useMemo(() => {
    if (!content) return [];
    const tokens = md.parse(content, {});
    return md.renderer.render(tokens, md.options, {}) as React.ReactNode[];
  }, [content]);

  return <div className="markdown-body">{vnodes}</div>;
};
```

## ⚙️ 配置选项

```typescript
interface FrameworkPluginOptions {
  /** 框架适配器（必需） */
  adapter: FrameworkAdapter;

  /** 自定义组件配置 */
  components?: {
    /** 代码块组件 */
    codeBlock?: FrameworkComponent | ((meta: CodeBlockMeta) => FrameworkComponent);
    /** 表格组件 */
    table?: FrameworkComponent;
    /** 链接组件 */
    link?: FrameworkComponent;
    /** 图片组件 */
    image?: FrameworkComponent;
  };

  /** 性能监控配置 */
  performance?: {
    /** 性能回调函数 */
    onMetrics?: (metrics: PerformanceMetrics) => void;
  };

  /** 错误处理配置 */
  errorHandler?: {
    /** 错误处理模式 */
    mode?: 'throw' | 'log' | 'silent';
    /** 错误回调 */
    onError?: (error: Error) => void;
  };
}
```

### 配置示例

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,

  // 自定义组件
  components: {
    codeBlock: meta => {
      if (meta.langName === 'mermaid') {
        return MermaidRenderer;
      }
      return CodeBlock;
    },
    table: CustomTable,
    link: CustomLink,
    image: CustomImage
  },

  // 性能监控
  performance: {
    onMetrics: metrics => {
      console.log('渲染耗时:', metrics.duration, 'ms');
      console.log('Token 数量:', metrics.tokenCount);
    }
  },

  // 错误处理
  errorHandler: {
    mode: 'log',
    onError: error => {
      console.error('渲染错误:', error);
    }
  }
});
```

## 🎨 自定义组件

### 代码块组件

```typescript
import { defineComponent } from 'vue';
import type { CodeBlockMeta } from '@suga/markdown-it-render-vnode';

export const CodeBlock = defineComponent({
  name: 'CodeBlock',
  props: {
    code: String,
    language: String,
    meta: Object as () => CodeBlockMeta
  },
  setup(props) {
    return () => (
      <pre class={`language-${props.language}`}>
        <code>{props.code}</code>
      </pre>
    );
  }
});

// 使用
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  components: {
    codeBlock: CodeBlock
  }
});
```

### 动态组件选择

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  components: {
    codeBlock: (meta: CodeBlockMeta) => {
      // 根据语言类型返回不同组件
      switch (meta.langName) {
        case 'mermaid':
          return MermaidRenderer;
        case 'echarts':
          return EchartsRenderer;
        case 'markmap':
          return MindmapRenderer;
        default:
          return CodeBlock;
      }
    }
  }
});
```

### 异步组件支持

```typescript
import { defineAsyncComponent } from 'vue';

const AsyncCodeBlock = defineAsyncComponent(() => import('./components/CodeBlock.vue'));

md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  components: {
    codeBlock: AsyncCodeBlock
  }
});
```

## 🔧 自定义适配器

创建自定义框架适配器：

```typescript
import type { FrameworkAdapter } from '@suga/markdown-it-render-vnode';

export const myAdapter: FrameworkAdapter = {
  // 创建元素节点
  createElement(tag, props, children) {
    // 实现你的创建逻辑
    return {
      type: tag,
      props: props || {},
      children: Array.isArray(children) ? children : [children]
    };
  },

  // 创建文本节点
  createText(text) {
    return { type: 'text', value: text };
  },

  // 创建片段节点
  createFragment(children) {
    return { type: 'fragment', children };
  },

  // 创建注释节点
  createComment() {
    return { type: 'comment' };
  },

  // 判断是否为片段节点（可选）
  isFragment(node) {
    return node.type === 'fragment';
  },

  // 获取子节点（可选）
  getChildren(node) {
    return node.children || [];
  },

  // 设置子节点（可选）
  setChildren(node, children) {
    node.children = children;
  }
};
```

## 📝 自定义渲染规则

```typescript
import type { Token, RenderOptions, RenderEnv } from '@suga/markdown-it-render-vnode';

// 自定义段落渲染
md.renderer.rules.paragraph_open = (
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv
) => {
  const token = tokens[idx];
  const adapter = getAdapter(md.renderer);

  return adapter.createElement('p', { class: 'custom-paragraph' }, null);
};

// 自定义链接渲染
md.renderer.rules.link_open = (
  tokens: Token[],
  idx: number,
  options: RenderOptions,
  env: RenderEnv
) => {
  const token = tokens[idx];
  const adapter = getAdapter(md.renderer);
  const href = token.attrGet('href');

  return adapter.createElement(
    'a',
    {
      href,
      target: '_blank',
      rel: 'noopener noreferrer'
    },
    null
  );
};
```

## 🛡️ 错误处理

插件提供三种错误处理模式：

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  errorHandler: {
    // throw: 抛出错误（默认，适合开发环境）
    // log: 记录错误并继续（适合生产环境）
    // silent: 静默处理（不推荐）
    mode: 'log',

    onError: error => {
      // 自定义错误处理
      console.error('渲染失败:', error);
      // 可以上报到监控系统
      reportError(error);
    }
  }
});
```

## ⚡ 性能优化

### 性能监控

```typescript
md.use(markdownItRenderVnode, {
  adapter: vueAdapter,
  performance: {
    onMetrics: metrics => {
      console.log({
        duration: metrics.duration, // 渲染耗时（ms）
        tokenCount: metrics.tokenCount, // Token 数量
        vnodeCount: metrics.vnodeCount, // VNode 数量
        timestamp: metrics.timestamp // 时间戳
      });
    }
  }
});
```

### Key 优化

插件自动为每个渲染的节点生成唯一的 `key` 属性（通过 `data-token-key`），确保框架能够高效地进行 diff 和 DOM 复用：

```typescript
// Vue 示例：确保 VNode 有正确的 key
return () => (
  <div class="markdown-body">
    {vnodes.value.map((vnode, index) => {
      const tokenKey = vnode.props?.['data-token-key'] || `vnode-${index}`;
      return { ...vnode, key: tokenKey };
    })}
  </div>
);
```

## 📎 API 参考

### 插件选项

#### `adapter` (必需)

框架适配器实例。

#### `components`

自定义组件配置对象：

- `codeBlock`: 代码块组件
- `table`: 表格组件
- `link`: 链接组件
- `image`: 图片组件

#### `performance`

性能监控配置：

- `onMetrics`: 性能数据回调函数

#### `errorHandler`

错误处理配置：

- `mode`: 错误处理模式（`'throw'` | `'log'` | `'silent'`）
- `onError`: 错误回调函数

### 渲染方法

#### `md.renderer.render(tokens, options, env)`

渲染 Token 数组为 VNode 数组：

```typescript
const tokens = md.parse(markdownContent, {});
const vnodes = md.renderer.render(tokens, md.options, {});
```

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm test -- packages/markdown-it-render-vnode

# 监听模式
pnpm test -- --watch

# 覆盖率报告
pnpm test -- --coverage
```

## 🔍 常见问题

### 1. 为什么要使用适配器模式？

适配器模式让核心渲染逻辑与具体框架解耦，一套代码可以支持多个框架，同时也方便扩展到新的框架。

### 2. 如何处理流式渲染？

对于流式渲染场景，直接使用 `md.renderer.render()` 进行全量渲染，配合 `key` 属性让框架自己进行高效的 diff：

```typescript
watch(
  () => props.content,
  newContent => {
    const tokens = md.parse(newContent, {});
    vnodes.value = md.renderer.render(tokens, md.options, {});
  }
);
```

### 3. 如何优化大文档的渲染性能？

- 确保每个 VNode 都有唯一的 `key`（插件自动生成）
- 使用虚拟滚动（如 `vue-virtual-scroller`）
- 按需加载异步组件
- 使用 Web Worker 进行解析（markdown-it 支持）

### 4. 支持 SSR 吗？

完全支持！适配器模式天然支持 SSR，在服务端和客户端使用相同的代码即可。

### 5. 如何处理 XSS 安全问题？

插件内置了属性验证和 XSS 防护：

- 自动过滤危险属性（如 `onerror`, `onclick` 等）
- 验证 URL 协议（只允许 `http:`, `https:`, `mailto:` 等安全协议）
- 所有用户输入都会被转义

## 📦 相关包

- [@suga/markdown-it-render-vnode](https://www.npmjs.com/package/@suga/markdown-it-render-vnode) - 核心包
- [@suga/markdown-it-render-vnode-vue](https://www.npmjs.com/package/@suga/markdown-it-render-vnode-vue) - Vue 适配器
- [@suga/markdown-it-render-vnode-react](https://www.npmjs.com/package/@suga/markdown-it-render-vnode-react) - React 适配器

## 📚 相关资源

- [markdown-it](https://github.com/markdown-it/markdown-it) - Markdown 解析器
- [Vue 3](https://vuejs.org/) - 渐进式 JavaScript 框架
- [React](https://react.dev/) - 用于构建用户界面的 JavaScript 库

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

## 📄 许可证

MIT License
