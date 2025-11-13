# Monaco Editor 组件

基于 Monaco Editor 的 Vue3 + TSX 编辑器组件，支持多种语言、主题切换、代码折叠等功能。

## 功能特性

### ✅ 核心功能
- 🎨 支持亮色/暗色主题自动切换
- 📝 支持多种编程语言（JavaScript、TypeScript、Vue、JSX、TSX、CSS、HTML、JSON、Markdown）
- 🔒 支持只读模式和编辑模式
- 📁 代码折叠功能（只读模式下可用）
- 🔍 语法高亮（基于 Shiki）
- 📏 行号显示
- 🎯 自动布局

### 🛠️ 工具栏功能
- 📋 复制代码
- 🎨 格式化代码（编辑模式）
- 📂 折叠/展开所有代码（只读模式）
- 🖥️ 全屏模式

## 基本使用

### 编辑模式

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MonacoEditor } from '@/components/monaco';

const code = ref(`
function hello() {
  console.log('Hello World!');
}
`);

const handleChange = (value: string) => {
  console.log('代码变更:', value);
};
</script>

<template>
  <MonacoEditor
    v-model="code"
    language="javascript"
    filename="example.js"
    :readonly="false"
    @change="handleChange"
  />
</template>
```

### 只读模式（代码展示）

```vue
<script setup lang="ts">
import { MonacoEditor } from '@/components/monaco';

const code = `
<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
  </div>
</template>

<script setup>
const msg = 'Hello Vue!';
</script>
`;
</script>

<template>
  <MonacoEditor
    :model-value="code"
    language="vue"
    filename="HelloWorld.vue"
    :readonly="true"
    :folding="true"
  />
</template>
```

## Props

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelValue` | `string` | `''` | 编辑器内容（支持 v-model） |
| `filename` | `string` | `'untitled'` | 文件名（用于推断语言） |
| `readonly` | `boolean` | `false` | 是否只读 |
| `language` | `MonacoLanguage` | `'javascript'` | 语言模式 |
| `showToolbar` | `boolean` | `true` | 是否显示工具栏 |
| `showLineNumbers` | `boolean` | `true` | 是否显示行号 |
| `folding` | `boolean` | `true` | 是否启用代码折叠 |
| `minimap` | `boolean` | `false` | 是否显示 minimap |
| `fontSize` | `number` | `14` | 字体大小 |
| `height` | `string \| number` | `'400px'` | 编辑器高度 |

## Events

| 事件 | 参数 | 说明 |
|------|------|------|
| `update:modelValue` | `(value: string)` | 内容变更时触发（v-model） |
| `change` | `(value: string)` | 内容变更时触发 |

## 支持的语言

```typescript
type MonacoLanguage =
  | 'javascript'
  | 'typescript'
  | 'vue'
  | 'jsx'
  | 'tsx'
  | 'css'
  | 'html'
  | 'json'
  | 'markdown';
```

## 高级用法

### 自定义高度

```vue
<template>
  <!-- 固定像素高度 -->
  <MonacoEditor v-model="code" :height="600" />

  <!-- 百分比高度 -->
  <MonacoEditor v-model="code" height="50vh" />

  <!-- 填充父容器 -->
  <div style="height: 500px">
    <MonacoEditor v-model="code" height="100%" />
  </div>
</template>
```

### 根据文件名自动推断语言

```vue
<template>
  <!-- 自动识别为 Vue -->
  <MonacoEditor v-model="code" filename="App.vue" />

  <!-- 自动识别为 TypeScript -->
  <MonacoEditor v-model="code" filename="utils.ts" />

  <!-- 自动识别为 JSX -->
  <MonacoEditor v-model="code" filename="Component.jsx" />
</template>
```

### 只读模式配置

```vue
<template>
  <MonacoEditor
    :model-value="code"
    :readonly="true"
    :folding="true"
    :show-line-numbers="true"
    :minimap="false"
    filename="readonly.js"
  />
</template>
```

**只读模式特点：**
- ✅ 可以查看代码
- ✅ 可以折叠/展开代码块
- ✅ 可以复制代码
- ✅ 可以调整字体大小
- ✅ 可以全屏查看
- ❌ 不能编辑内容
- ❌ 不显示代码提示
- ❌ 不显示上下文菜单

### 编辑模式配置

```vue
<template>
  <MonacoEditor
    v-model="code"
    :readonly="false"
    :folding="true"
    :show-line-numbers="true"
    :minimap="true"
    filename="editable.js"
  />
</template>
```

**编辑模式特点：**
- ✅ 可以编辑代码
- ✅ 代码格式化
- ✅ 代码提示
- ✅ 语法检查
- ✅ 自动补全
- ✅ 快捷键支持

## 工具栏功能说明

### 只读模式工具栏
```
[文件信息] [只读标签] | [折叠] [展开] [字体-] [字体大小] [字体+] [复制] [全屏]
```

### 编辑模式工具栏
```
[文件信息] | [格式化] [字体-] [字体大小] [字体+] [复制] [全屏]
```

## 主题

编辑器主题自动跟随系统主题：
- 亮色模式：使用 `light-plus` 主题
- 暗色模式：使用 `dark-plus` 主题

主题由 `useMarkdownTheme` hook 控制，无需手动配置。

## 完整示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { MonacoEditor } from '@/components/monaco';

const code = ref(`
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  setup(props) {
    console.log(props.msg);
  }
};
`);

const isReadonly = ref(false);
const language = ref<'javascript' | 'typescript'>('javascript');

const handleChange = (value: string) => {
  console.log('代码已更改:', value);
};

const toggleMode = () => {
  isReadonly.value = !isReadonly.value;
};

const toggleLanguage = () => {
  language.value = language.value === 'javascript' ? 'typescript' : 'javascript';
};
</script>

<template>
  <div class="demo-container">
    <div class="controls">
      <button @click="toggleMode">
        切换为 {{ isReadonly ? '编辑' : '只读' }} 模式
      </button>
      <button @click="toggleLanguage">
        切换为 {{ language === 'javascript' ? 'TypeScript' : 'JavaScript' }}
      </button>
    </div>

    <MonacoEditor
      v-model="code"
      :language="language"
      :readonly="isReadonly"
      :folding="true"
      :show-toolbar="true"
      :height="500"
      filename="example.js"
      @change="handleChange"
    />
  </div>
</template>

<style scoped>
.demo-container {
  padding: 20px;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}
</style>
```

## 样式说明

组件使用 Tailwind CSS 构建，主要类名：
- 容器：`relative flex flex-col`
- 工具栏：`flex items-center justify-between px-4 py-2 border-b`
- 全屏：`fixed inset-0 z-[9999]`
- 编辑器：`flex-1 w-full overflow-hidden`

支持暗色模式，自动应用 `dark:` 前缀的样式。

## 注意事项

1. **只读模式下的折叠功能**
   - 只读模式默认启用代码折叠
   - 可通过工具栏的折叠/展开按钮控制
   - 编辑模式下折叠功能始终可用，但不显示专门的按钮

2. **语言推断优先级**
   - 优先使用 `language` prop
   - 其次根据 `filename` 扩展名推断
   - 默认使用 `javascript`

3. **性能优化**
   - 使用 `shallowRef` 存储编辑器实例
   - 自动布局，无需手动调用 `layout()`
   - 组件卸载时自动清理资源

4. **全屏模式**
   - 使用 `fixed` 定位覆盖整个屏幕
   - z-index 为 9999，确保在最上层
   - 按 ESC 或点击全屏按钮退出

## 依赖

- `monaco-editor-core`: Monaco 编辑器核心
- `shiki`: 语法高亮
- `@shikijs/monaco`: Shiki 与 Monaco 的集成
- `naive-ui`: UI 组件库
- `@vicons/tabler`: 图标库

