# File Explorer

Vue 3 + TypeScript 文件浏览器 UI 模块。提供布局、视图、交互与数据源抽象；**完整「文件管理器页面」在 `views/file-manager` 组合**。

## 特性

- 本地（File System Access API）/ 服务端双数据源
- 五种视图：网格、列表、平铺、详细、内容
- 复制 / 剪切 / 粘贴 / 删除 / 重命名 / 新建文件夹
- 多类型预览与 Monaco 编辑（页面抽屉内）
- 拖拽移动/复制、圈选、快捷键、右键菜单
- 面包屑、可折叠侧栏、信息面板、上传拖放（服务端模式）

## 架构

```
views/file-manager/              # 页面层：编排与抽屉
├── index.tsx
├── composables/useFileManagerPage.ts
└── components/FileManagerDrawers.tsx

components/file-explorer/        # 模块层：可复用 UI + 逻辑
├── FileExplorer.tsx             # 壳组件（仅布局，无业务抽屉）
├── composables/                 # useFileExplorerLogic 等
├── hooks/                       # 选择、排序、拖拽、快捷键…
├── datasources/                 # Local / Server
├── config/                      # mock、快捷键、菜单、操作
└── …
```

| 层级                  | 职责                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| **页面**              | `useFileManagerPage`：logic + 预览 + 上传；`FileManagerDrawers`：预览/上传抽屉 |
| **FileExplorer**      | 接收 `logic` 与回调，组合 Toolbar / 面包屑 / 视图 / 拖拽预览                   |
| **composables/hooks** | 文件列表、选择、操作、导航、分页等                                             |
| **datasources**       | `IFileDataSource` 抽象读写                                                     |

> 不要从 `unplugin-vue-components` 全局注册本目录；页面与子模块 **显式 import**。

## 目录结构

```
file-explorer/
├── FileExplorer.tsx
├── types/
│   ├── file-explorer.ts       # FileItem、ViewMode 等
│   └── shell.ts               # FileExplorerLogic、Shell props
├── composables/
│   ├── useFileExplorerLogic.ts   # 核心编排
│   ├── useFilePreview.ts
│   ├── useFileExplorerUpload.ts
│   ├── useViewState.ts
│   ├── useNavigation.ts
│   └── useFileViewContext.ts
├── hooks/                     # 细粒度能力
├── datasources/
├── config/
├── layout/                    # Toolbar、Breadcrumb、StatusBar、ResizableLayout
├── container/                 # ViewContainer、FileViewRenderer
├── views/                     # Grid / List / Tile / Detail / Content
├── preview/                   # FilePreview + previewers
├── editor/
├── upload/
├── interaction/               # 圈选、右键菜单、拖放
├── dialogs/RenameDialog.tsx   # 经 base-dialog 调用
├── items/FileIcon.tsx
├── panels/FileInfoPanel.tsx
└── utils/
```

## 页面集成

参考 `src/views/file-manager/index.tsx`：

```tsx
const page = useFileManagerPage();

<FileExplorer
  logic={page.logic}
  containerRef={page.containerRef}
  onOpen={page.handleOpenFile}
  onUpload={page.handleOpenUploadDrawer}
  onFilesDrop={page.uploadIntegration.addFilesAndOpenDrawer}
  uploadProgress={page.uploadIntegration.uploadProgressInfo.value}
/>
<FileManagerDrawers
  logic={page.logic}
  preview={page.preview}
  uploadIntegration={page.uploadIntegration}
/>
```

### `useFileManagerPage`

- 初始化 `useFileExplorerLogic`（`mockFileItems` 或后续换真实数据）
- `useFilePreview` / `useFileExplorerUpload`
- 预览与上传抽屉互斥
- `onMounted`：刷新列表、容器 `focus()`（快捷键需焦点）

### `FileExplorer` Props

| Prop             | 说明                                     |
| ---------------- | ---------------------------------------- |
| `logic`          | `useFileExplorerLogic` 返回值            |
| `containerRef`   | 根容器 ref（焦点、快捷键）               |
| `onOpen`         | 打开文件/进入文件夹                      |
| `onUpload`       | 打开上传抽屉                             |
| `onFilesDrop`    | 拖入文件（通常 `addFilesAndOpenDrawer`） |
| `uploadProgress` | 状态栏上传进度，可选                     |

## 核心 Composable

### `useFileExplorerLogic(options)`

| 选项                                         | 说明                    |
| -------------------------------------------- | ----------------------- |
| `initialItems`                               | 初始 `FileItem[]`       |
| `containerRef`                               | 容器元素                |
| `onOpen` / `onUploadFile` / `onUploadFolder` | 快捷键与菜单回调        |
| `validateDrop`                               | 拖放校验                |
| `initialDataSourceType`                      | `'local'` \| `'server'` |
| `serverDataSourceConfig`                     | 服务端配置              |

返回视图状态、导航、`dataSource`、选择、分页、`dragDrop`、`fileOperations` 等。

### 其它

- **`useFilePreview`**：预览/编辑状态（页面抽屉使用）
- **`useFileExplorerUpload`**：复用 `views/upload` 的上传能力
- **`useFileDialog`**：`rename()` → `RenameDialog`（`@/components/base-dialog`）

## 数据源

```ts
interface IFileDataSource {
  listFiles(path: string): Promise<FileItem[]>;
  readFile(path: string): Promise<string | Blob>;
  writeFile(path: string, content: string): Promise<void>;
  // …删除、重命名、创建目录等
}
```

- `LocalFileDataSource`：File System Access API
- `ServerFileDataSource`：HTTP API（可配置）

工具栏可切换数据源；服务端模式下支持 `UploadDropOverlay` 拖入上传。

## 预览扩展

1. 在 `preview/previewers/` 新增 Previewer 组件
2. 在 `preview/previewRegistry.ts` 注册扩展名
3. `FilePreview` 按扩展名路由

示例可参考 `views/component/examples/FilePreviewExample.tsx`。

## 文件编辑

`FileEditor` 按扩展名分发（`editor/resolveEditorKind.ts`）：

| 类型     | 扩展名                    | 编辑器                                                                                   |
| -------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| Markdown | `md` / `markdown` / `mdx` | `MarkdownFileEditor`：Monaco 源码 + `@/components/markdown` 实时预览，支持编辑/分屏/预览 |
| 其它     | 代码类扩展名              | `CodeFileEditor`：Monaco + 格式化                                                        |

预览模式仍走 `FilePreview` / `MarkdownPreviewer`（同一套 Markdown 渲染组件）。

## 快捷键

点击文件区域获得焦点后生效（`config/shortcuts.config.ts`）。

| 快捷键                         | 功能                                 |
| ------------------------------ | ------------------------------------ |
| `Ctrl+A`                       | 全选                                 |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | 复制 / 剪切 / 粘贴                   |
| `Delete`                       | 删除                                 |
| `F2`                           | 重命名                               |
| `Enter`                        | 打开                                 |
| `Alt+Enter`                    | 属性                                 |
| `Ctrl+1`～`Ctrl+5`             | 网格 / 列表 / 平铺 / 详细 / 内容视图 |
| `F5`                           | 刷新                                 |
| `Ctrl+Shift+N`                 | 新建文件夹                           |
| `Escape`                       | 取消选择                             |

右键菜单快捷键文案见 `config/contextmenu.config.ts`。

## Mock 数据

`config/mockData.ts` 提供演示列表。缩略图使用 `utils/mockThumbnail()` 生成 SVG data URI，**不依赖外网占位图**。

## 手动测试

路由：`/file-manager`

1. 列表加载、五种视图切换、排序与分页
2. 单选 / 多选 / 圈选、`Ctrl+A`、`Escape`
3. 复制剪切粘贴、删除、F2 重命名、新建文件夹
4. 双击打开：文件夹导航；文件打开预览抽屉
5. 工具栏上传、拖入文件（服务端模式）、上传抽屉
6. 预览抽屉内编辑保存（文本类）
7. 本地数据源：打开本地文件夹

## 后续规划

- 抽出 `shared/file-system`（图标、预览、布局）供知识库等场景复用
- `UploadMainPanel` 迁至 `components/upload`，去掉 `upload → views` 反向依赖
- 可选 monorepo 包 `@suga/file-explorer`
- 知识库 / RAG 为独立页面模块，复用本 UI，不扩写进 `FileExplorer`

## 相关代码

| 路径                                 | 说明                                        |
| ------------------------------------ | ------------------------------------------- |
| `src/views/file-manager/`            | 文件管理器页面                              |
| `src/views/upload/`                  | 上传能力（与 `useFileExplorerUpload` 共用） |
| `src/components/base-dialog/`        | 通用对话框                                  |
| `src/components/common-interaction/` | `DragPreview` 等                            |
