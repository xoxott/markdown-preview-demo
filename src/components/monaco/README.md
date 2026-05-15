# Monaco 编辑器模块

基于 `monaco-editor-core` + Shiki 的 Vue3 TSX 编辑器。编辑器本体与工具栏分离，由业务方按需组合。

## 目录结构

```
monaco/
├── index.ts                          # 统一导出
├── README.md
├── components/
│   ├── MonacoEditor.tsx              # 编辑器（无工具栏）
│   └── EditorToolbar.tsx             # 工具栏 UI
├── composables/
│   └── useMonacoEditorToolbar.ts     # 复制 / 格式化 / 折叠 / 全屏逻辑
├── lib/
│   ├── highlight.ts                  # Shiki 高亮注册
│   ├── languageMap.ts                # 扩展名 → 语言
│   └── utils.ts                      # Model 工具
└── styles/
    └── index.scss
```

## 模块职责

| 导出                                              | 说明                                                   |
| ------------------------------------------------- | ------------------------------------------------------ |
| `MonacoEditor`                                    | 单 DOM 挂载点，`v-model`、主题、语言加载、`ready` 事件 |
| `EditorToolbar`                                   | 纯 UI，通过 props 回调驱动                             |
| `useMonacoEditorToolbar`                          | 工具栏状态与操作，配合 `EditorToolbar` 使用            |
| `resolveLanguage` / `resolveLanguageFromFilename` | 按扩展名或文件名解析语言                               |

需要工具栏时：**不要**再包一层「大 Monaco 组件」，用 `EditorToolbar` + composable 自行组合（与 `FileEditorToolbar` + `MonacoEditor` 同一思路）。

## 基本用法

### 仅编辑器（固定高度）

```tsx
import { ref } from 'vue';
import { MonacoEditor } from '@/components/monaco';

const code = ref('console.log("hello")');

<MonacoEditor
  modelValue={code.value}
  filename="demo.ts"
  language="typescript"
  height={320}
  onUpdate:modelValue={v => {
    code.value = v;
  }}
/>;
```

### 编辑器 + 工具栏

```tsx
import { ref } from 'vue';
import { EditorToolbar, MonacoEditor, useMonacoEditorToolbar } from '@/components/monaco';

const code = ref('console.log("hello")');
const toolbar = useMonacoEditorToolbar({ readonly: true, baseHeight: '320px' });

<div ref={toolbar.wrapperRef} class="flex flex-col" style={toolbar.shellStyle.value}>
  <EditorToolbar
    language="typescript"
    readonly
    folding
    actions={toolbar.actions.value}
    isFolded={toolbar.isFolded.value}
    isFullscreen={toolbar.isFullscreen.value}
    onCopy={toolbar.handleCopy}
    onToggleFold={toolbar.handleToggleFold}
    onToggleFullscreen={toolbar.handleToggleFullscreen}
  />
  <MonacoEditor
    modelValue={code.value}
    filename="demo.ts"
    height="100%"
    readonly
    onReady={toolbar.bindEditor}
    onUpdate:modelValue={v => {
      code.value = v;
    }}
  />
</div>;
```

### 铺满 flex 父级（Drawer / 分屏）

父级需为 **flex 列 + `min-h-0`**，编辑器传 `height="100%"`（内部 `flex: 1 1 0%`）。Drawer 首帧高度可能为 0，组件内用 `ResizeObserver` 在有尺寸后再 `create`。

```tsx
<div class="flex h-full min-h-0 flex-col overflow-hidden">
  <MonacoEditor modelValue={code.value} filename="a.ts" height="100%" />
</div>
```

## MonacoEditor Props

| 属性              | 类型               | 默认         | 说明                                                |
| ----------------- | ------------------ | ------------ | --------------------------------------------------- |
| `modelValue`      | `string`           | `''`         | 内容（v-model）                                     |
| `filename`        | `string`           | `'untitled'` | 用于推断语言                                        |
| `language`        | `string`           | `''`         | 显式语言，优先于 filename                           |
| `readonly`        | `boolean`          | `false`      | 只读                                                |
| `showLineNumbers` | `boolean`          | `true`       | 行号                                                |
| `folding`         | `boolean`          | `true`       | 折叠                                                |
| `minimap`         | `boolean`          | `false`      | 小地图                                              |
| `fontSize`        | `number`           | `14`         | 字号                                                |
| `height`          | `string \| number` | `'100%'`     | 数字/`300px` 为固定高度；`100%`/`auto` 为 flex 铺满 |

## Events

| 事件                | 说明                                  |
| ------------------- | ------------------------------------- |
| `update:modelValue` | 内容变更                              |
| `change`            | 内容变更                              |
| `ready`             | 实例创建完成，`IStandaloneCodeEditor` |

## 项目内引用

| 场景          | 用法                                                            |
| ------------- | --------------------------------------------------------------- |
| 文件代码编辑  | `CodeFileEditor` → `MonacoEditor` + `FileEditorToolbar`         |
| Markdown 编辑 | `MarkdownFileEditor` → `MonacoEditor` + 自定义工具栏            |
| 代码预览      | `CodePreviewer` → `MonacoEditor` + `EditorToolbar` + composable |
| 沙箱          | `SandBox` → 组合用法                                            |
| 组件示例页    | `views/component/examples/MonacoEditorExample.tsx`              |

语言映射统一走 `@/components/monaco` 的 `resolveLanguage`，勿再深路径引用 `lib/`。

## 依赖

- `monaco-editor-core`
- `shiki` / `@shikijs/monaco`
- `useMarkdownTheme`（主题跟随 Markdown 模块）
