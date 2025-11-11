# Markdown 渲染插件使用示例

## 快速开始

### 使用 V2 优化版本（推荐）

```typescript
import { defineComponent, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVuePluginV2 from '@/components/markdown/plugins/markdown-render-vnode-v2';
import type { VNode } from 'vue';

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
      typographer: true,
      breaks: true
    });

    // 使用 V2 插件
    md.use(MarkdownVuePluginV2);

    const vnodes = ref<VNode[]>([]);

    // 监听内容变化，重新渲染
    watch(
      () => props.content,
      () => {
        const tokens = md.parse(props.content, {});
        vnodes.value = md.renderer.render(tokens, md.options, {}) as VNode[];
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

### 使用原版本（兼容旧代码）

```typescript
import markdownVuePlugin from '@/components/markdown/plugins/markdown-render-vnode';

const md = new MarkdownIt();
md.use(markdownVuePlugin);
```

## 高级用法

### 1. 自定义代码块组件

```typescript
import { defineAsyncComponent } from 'vue';
import type { CodeBlockMeta } from '@/components/markdown/plugins/v2/types';

md.use(MarkdownVuePluginV2, {
  components: {
    codeBlock: (meta: CodeBlockMeta) => {
      // Mermaid 图表
      if (meta.langName === 'mermaid') {
        return defineAsyncComponent(() => import('./components/MermaidRenderer'));
      }
      
      // Mindmap 思维导图
      if (meta.langName === 'markmap') {
        return defineAsyncComponent(() => import('./components/MindmapRenderer'));
      }
      
      // ECharts 图表
      if (meta.langName === 'echarts') {
        return defineAsyncComponent(() => import('./components/EchartsRenderer'));
      }
      
      // 默认代码块
      return defineAsyncComponent(() => import('./components/CodeBlock'));
    }
  }
});
```

### 2. 配置性能选项

```typescript
md.use(MarkdownVuePluginV2, {
  // 性能配置
  performance: {
    enableCache: true,  // 启用缓存
    cacheSize: 100      // 缓存大小
  },
  
  // 自定义组件
  components: {
    codeBlock: (meta) => {
      // ... 组件逻辑
    }
  }
});
```

### 3. 安全模式

```typescript
// 在渲染时启用安全模式
const tokens = md.parse(userContent, {});
const vnodes = md.renderer.render(tokens, md.options, {
  safeMode: true  // 过滤危险的 URL 和属性
});
```

### 4. 代码高亮

```typescript
import hljs from 'highlight.js';

const md = new MarkdownIt({
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (__) {}
    }
    return ''; // 使用默认转义
  }
});

md.use(MarkdownVuePluginV2);
```

### 5. 完整示例（Vue SFC）

```vue
<template>
  <div class="markdown-container" :style="cssVars">
    <article class="markdown-body">
      <component v-for="(vnode, index) in vnodes" :key="index" :is="vnode" />
    </article>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVuePluginV2 from '@/components/markdown/plugins/markdown-render-vnode-v2';
import { useThemeStore } from '@/store/modules/theme';
import { storeToRefs } from 'pinia';
import type { VNode } from 'vue';

// Props
const props = defineProps<{
  content: string;
}>();

// 主题
const themeStore = useThemeStore();
const { darkMode } = storeToRefs(themeStore);

// CSS 变量
const cssVars = computed(() => ({
  '--markdown-bg': darkMode.value ? '#1a1a1a' : '#ffffff',
  '--markdown-color': darkMode.value ? '#e0e0e0' : '#24292e'
}));

// Markdown 解析器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

md.use(MarkdownVuePluginV2, {
  components: {
    codeBlock: (meta) => {
      // 自定义组件逻辑
      return null; // 使用默认渲染
    }
  }
});

// VNodes
const vnodes = ref<VNode[]>([]);

// 监听内容变化
watch(
  () => props.content,
  (newContent) => {
    if (newContent) {
      const tokens = md.parse(newContent, {});
      vnodes.value = md.renderer.render(tokens, md.options, {
        safeMode: false
      }) as VNode[];
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.markdown-container {
  padding: 20px;
  background: var(--markdown-bg);
  color: var(--markdown-color);
}

.markdown-body {
  max-width: 900px;
  margin: 0 auto;
}
</style>
```

### 6. TSX 示例

```tsx
import { defineComponent, ref, watch, computed } from 'vue';
import MarkdownIt from 'markdown-it';
import MarkdownVuePluginV2 from '@/components/markdown/plugins/markdown-render-vnode-v2';
import type { VNode } from 'vue';

export default defineComponent({
  name: 'MarkdownPreview',
  props: {
    content: {
      type: String,
      required: true
    }
  },
  setup(props) {
    // 初始化 MD
    const md = new MarkdownIt({ html: true });
    md.use(MarkdownVuePluginV2);

    const vnodes = ref<VNode[]>([]);
    const renderKey = ref(0);

    watch(
      () => props.content,
      (newContent) => {
        const tokens = md.parse(newContent, {});
        vnodes.value = md.renderer.render(tokens, md.options, {}) as VNode[];
        renderKey.value++;
      },
      { immediate: true }
    );

    return () => (
      <div key={renderKey.value} class="markdown-body">
        {vnodes.value}
      </div>
    );
  }
});
```

## 性能优化建议

### 1. 防抖处理

对于频繁变化的内容，使用防抖避免过度渲染：

```typescript
import { debounce } from 'lodash-es';

const debouncedRender = debounce(() => {
  const tokens = md.parse(props.content, {});
  vnodes.value = md.renderer.render(tokens, md.options, {}) as VNode[];
}, 300);

watch(() => props.content, debouncedRender);
```

### 2. 虚拟滚动

对于超长文档，结合虚拟滚动：

```typescript
import { VirtualScroller } from 'vue-virtual-scroller';

// 将 vnodes 作为虚拟滚动的数据源
```

### 3. Worker 线程

对于大文档，可以在 Worker 中解析：

```typescript
// worker.ts
import MarkdownIt from 'markdown-it';
import MarkdownVuePluginV2 from './plugins/markdown-render-vnode-v2';

const md = new MarkdownIt();
md.use(MarkdownVuePluginV2);

self.onmessage = (e) => {
  const tokens = md.parse(e.data, {});
  const vnodes = md.renderer.render(tokens, md.options, {});
  self.postMessage(vnodes);
};
```

## 常见问题

### Q1: V1 和 V2 如何选择？

**A**: 新项目推荐使用 V2，旧项目可以逐步迁移。V2 性能提升 30-40%，且有更好的类型支持。

### Q2: 如何调试渲染问题？

**A**: 在开发模式下，V2 会打印慢渲染警告（>50ms）：

```typescript
// 在浏览器控制台查看
[Markdown Renderer V2] Slow render detected: 65.23ms
```

### Q3: 自定义组件加载失败怎么办？

**A**: V2 有自动降级机制，会回退到默认渲染。检查组件导入路径和组件定义。

### Q4: 如何禁用对象池？

**A**: 修改 `v2/constants.ts`：

```typescript
export const PERFORMANCE_CONFIG = {
  ENABLE_OBJECT_POOL: false,  // 禁用对象池
  // ...
} as const;
```

### Q5: 支持哪些 Markdown 插件？

**A**: V2 支持所有标准 markdown-it 插件：

```typescript
import markdownItMultimdTable from 'markdown-it-multimd-table';
import markdownItFootnote from 'markdown-it-footnote';

md.use(markdownItMultimdTable)
  .use(markdownItFootnote)
  .use(MarkdownVuePluginV2);
```

## 更多资源

- [V2 详细文档](./v2/README.md)
- [优化总结](./OPTIMIZATION_SUMMARY.md)
- [测试用例](./__tests__)
- [类型定义](./v2/types.ts)

## 反馈与贡献

如有问题或建议，欢迎提交 Issue 或 Pull Request！

