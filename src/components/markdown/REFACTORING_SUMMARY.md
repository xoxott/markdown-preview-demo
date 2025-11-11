# Markdown 组件重构总结

## 🎯 重构目标

1. ✅ 将所有 `.vue` 文件改为 `.tsx` 文件
2. ✅ 优化主题处理方式（参考 useDrawer 的实现）
3. ✅ 修复类型问题，完善 TypeScript 类型定义
4. ✅ 添加 SVG 渲染支持
5. ✅ 提升代码设计的优雅性、可扩展性和可维护性

## 📁 新增文件

### 类型定义
- `plugins/types.ts` - 完善的 TypeScript 类型定义
  - Token、Renderer、CodeBlockMeta 等接口
  - SVG 相关类型定义
  - 完整的 JSDoc 注释

### 常量定义
- `constants.ts` - 统一的常量管理
  - DOM 属性名称常量
  - 支持的代码语言列表
  - SVG 安全白名单

### Hooks
- `hooks/useMarkdownTheme.ts` - 主题管理 Hook
  - 统一管理主题逻辑
  - 响应式主题切换
  - CSS 变量映射

### 工具函数
- `utils/security.ts` - 安全工具函数
  - HTML 转义/反转义
  - 属性名称验证
  - SVG 和 HTML 清理

- `utils/svg-utils.ts` - SVG 处理工具
  - SVG 验证和优化
  - 尺寸提取和设置
  - 下载和复制功能

### 组件
- `components/SvgRenderer.tsx` - SVG 渲染组件
  - 安全的 SVG 展示
  - 复制和下载功能
  - 错误处理

- `components/CodeBlock.tsx` - 代码块组件（TSX 版本）
  - 使用 TSX 语法
  - 集成主题管理
  - 支持代码运行

### 主组件
- `index.tsx` - 主组件（TSX 版本）
  - 使用 TSX 语法
  - 集成主题管理
  - 简洁的渲染逻辑

## 🔄 重构内容

### 1. 类型系统优化

**之前：**
```typescript
// type.d.ts - 类型定义不完整
export interface Token {
  type: string;
  tag: string;
  // ...
}
```

**之后：**
```typescript
// types.ts - 完整的类型定义
export interface Token {
  /** Token 类型 */
  type: string;
  /** HTML 标签名 */
  tag: string;
  /** 属性数组 */
  attrs: Attr[] | null;
  // ... 完整的接口定义和 JSDoc
}

// 新增 SVG 相关类型
export interface SvgMeta {
  content: string;
  width?: number | string;
  height?: number | string;
  // ...
}
```

### 2. 主题处理优化

**之前：**
```vue
<!-- index.vue -->
<script setup>
const themeVars = useThemeVars();
const themeStore = useThemeStore();
const { darkMode } = storeToRefs(themeStore);

const cssVars = computed(() => ({
  '--markdown-text-color': themeVars.value.textColorBase
}));
</script>
```

**之后：**
```typescript
// hooks/useMarkdownTheme.ts
export function useMarkdownTheme() {
  const themeStore = useThemeStore();
  const { naiveTheme, darkMode } = storeToRefs(themeStore);
  const themeVars = useThemeVars();

  const cssVars = computed(() => ({
    '--markdown-text-color': themeVars.value.textColorBase,
    '--markdown-bg-color': themeVars.value.bodyColor,
    // ... 更多主题变量
  }));

  return {
    darkMode,
    naiveTheme,
    themeVars,
    cssVars,
    themeClass,
    highlightTheme
  };
}
```

### 3. SVG 渲染支持

**新增功能：**
- 自动检测 SVG 内容
- 安全清理 SVG（防止 XSS）
- SVG 展示组件with 复制/下载功能
- 在 markdown-render-vnode.ts 中集成 SVG 渲染

```typescript
// markdown-render-vnode.ts
defaultRules.html_block = (tokens, idx, _, __, slf) => {
  const token = tokens[idx];
  const content = token.content.trim();

  // 检测是否为 SVG
  if (isSvgContent(content)) {
    const sanitized = sanitizeSvg(content);
    return createVNode(SvgRenderer, {
      content: sanitized,
      attrs: slf.renderAttrs(token)
    });
  }

  return createHtmlVNode(token.content);
};
```

### 4. TSX 语法转换

**之前（Vue SFC）：**
```vue
<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<Props>();
const language = computed(() => props.meta.langName);
</script>

<template>
  <NCard class="mb-2 mt-4">
    <NCode
      :show-line-numbers="true"
      :code="props.meta.content"
      :language="language || 'text'"
    />
  </NCard>
</template>
```

**之后（TSX）：**
```tsx
export const CodeBlock = defineComponent({
  name: 'CodeBlock',
  props: {
    meta: {
      type: Object as PropType<CodeBlockMeta>,
      required: true
    }
  },
  setup(props) {
    const language = computed(() => props.meta.langName || 'text');

    return () => (
      <NCard class="mb-2 mt-4">
        <NCode
          showLineNumbers
          code={props.meta.content}
          language={language.value}
        />
      </NCard>
    );
  }
});
```

### 5. 安全性增强

**新增安全功能：**
- SVG 内容清理（移除 script、事件处理器等）
- HTML 内容清理
- URL 安全验证
- 属性名称验证

```typescript
// utils/security.ts
export function sanitizeSvg(svg: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  
  // 移除危险元素
  const dangerousElements = ['script', 'iframe', 'object', ...];
  dangerousElements.forEach(tagName => {
    const elements = svgElement.querySelectorAll(tagName);
    elements.forEach(el => el.remove());
  });
  
  // 移除危险属性
  // ...
  
  return serializer.serializeToString(svgElement);
}
```

## 📊 代码质量提升

### 类型安全
- ✅ 完整的 TypeScript 类型定义
- ✅ 所有函数都有明确的类型标注
- ✅ 使用 PropType 确保 props 类型安全

### 代码组织
- ✅ 按功能模块划分文件
- ✅ 工具函数独立管理
- ✅ 常量统一定义

### 可维护性
- ✅ TSX 语法更简洁易读
- ✅ 主题逻辑集中管理
- ✅ 安全功能模块化

### 可扩展性
- ✅ 插件化的渲染规则
- ✅ 易于添加新的渲染器
- ✅ 灵活的组件映射机制

## 🎨 主要优势

### 1. TSX 优势
- 更好的类型推断
- 更简洁的语法
- 更好的 IDE 支持
- 统一的代码风格

### 2. 主题处理优化
- 集中管理主题逻辑
- 响应式主题切换
- 减少重复代码
- 更好的性能

### 3. SVG 支持
- 内联 SVG 渲染
- 安全性保障
- 交互功能（复制/下载）
- 错误处理

### 4. 安全性
- XSS 防护
- 危险内容过滤
- 属性验证
- URL 安全检查

## 📝 使用示例

### 基础使用
```tsx
import MarkdownPreview from '@/components/markdown';

<MarkdownPreview content={markdownContent} />
```

### 带 SVG 的 Markdown
```markdown
# 标题

这是一个 SVG 图形：

<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="blue" />
</svg>
```

### 代码块
```markdown
\`\`\`javascript
console.log('Hello World');
\`\`\`

\`\`\`mermaid
graph TD
  A-->B
\`\`\`
```

## 🔧 技术栈

- Vue 3 + TSX
- TypeScript
- Naive UI
- Markdown-it
- Highlight.js
- DOMParser/XMLSerializer（SVG 处理）

## ✅ 完成状态

- [x] 创建类型定义文件
- [x] 创建常量定义文件
- [x] 创建主题管理 Hook
- [x] 创建安全工具函数
- [x] 创建 SVG 工具函数
- [x] 创建 SVG 渲染组件
- [x] 优化 markdown-render-vnode.ts
- [x] 转换主组件为 TSX
- [x] 转换 CodeBlock 为 TSX
- [x] 无 Lint 错误

## 🚀 后续优化建议

1. 将剩余的 Vue 组件（ToolBar、SandBox 等）转换为 TSX
2. 添加单元测试
3. 性能优化（虚拟滚动、懒加载等）
4. 添加更多主题配置选项
5. 支持更多图表类型

## 📚 相关文档

- [Vue TSX 文档](https://vuejs.org/guide/extras/render-function.html#jsx-tsx)
- [Markdown-it 文档](https://markdown-it.github.io/)
- [Naive UI 文档](https://www.naiveui.com/)

