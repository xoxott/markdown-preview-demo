# 📐 File Explorer 组件架构文档

## 📋 目录

- [概述](#概述)
- [整体架构](#整体架构)
- [目录结构](#目录结构)
- [核心组件](#核心组件)
- [数据流与状态管理](#数据流与状态管理)
- [Hooks 系统](#hooks-系统)
- [交互系统](#交互系统)
- [视图系统](#视图系统)
- [配置系统](#配置系统)
- [设计模式](#设计模式)
- [扩展指南](#扩展指南)

---

## 概述

File Explorer 是一个功能完整的文件管理器组件，采用 Vue 3 Composition API 和 TypeScript 构建。组件采用分层架构设计，实现了关注点分离、高内聚低耦合的代码组织方式。

### 核心特性

- ✅ **双模式支持**: 本地文件系统（File System Access API）和服务器文件管理
- ✅ **5 种视图模式**: 网格、列表、平铺、详细、内容视图
- ✅ **完整的文件操作**: 复制、剪切、粘贴、删除、重命名、新建文件夹
- ✅ **文件预览和编辑**: 支持文本、图片、Markdown 预览，集成 Monaco 编辑器
- ✅ **拖拽系统**: 支持文件拖拽移动/复制，带预览和验证
- ✅ **选择系统**: 单选、多选、范围选择、圈选
- ✅ **键盘快捷键**: 16+ 个快捷键支持
- ✅ **右键菜单**: 上下文相关的操作菜单
- ✅ **面包屑导航**: 动态路径导航，支持快速跳转
- ✅ **响应式布局**: 可调整的侧边栏和面板
- ✅ **加载状态**: 统一的加载反馈机制

---

## 整体架构

### 架构分层

```
┌─────────────────────────────────────────┐
│          FileExplorer.tsx               │  视图层（组合组件）
│         (主入口组件)                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│    useFileExplorerLogic.ts              │  业务逻辑层（Composable）
│    (核心业务逻辑封装)                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Hooks 层                         │  功能层（可复用 Hooks）
│  - useFileSelection                     │
│  - useFileSort                          │
│  - useFileOperations                    │
│  - useFileDragDrop                      │
│  - useKeyboardShortcuts                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      数据源层 (Data Sources)             │  数据访问层（抽象接口）
│  - IFileDataSource                      │
│  - LocalFileDataSource                  │
│  - ServerFileDataSource                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         Config 层                        │  配置层（配置和数据）
│  - shortcuts.config.ts                  │
│  - operations.config.ts                 │
│  - contextmenu.config.ts                │
│  - mockData.ts                          │
└─────────────────────────────────────────┘
```

### 组件层级关系

```
FileExplorer (主容器)
│
├─ FileToolbar (工具栏)
│  ├─ ViewModeSwitch (视图切换)
│  ├─ SortSelector (排序选择器)
│  └─ GridSizeSelector (网格尺寸选择器)
│
├─ FileBreadcrumb (面包屑导航)
│
├─ ResizableLayout (可调整布局)
│  │
│  ├─ FileSidebar (左侧边栏)
│  │  └─ FolderTree (文件夹树)
│  │
│  └─ ViewContainer (视图容器) ⭐
│     │
│     ├─ ContextMenu (右键菜单)
│     │
│     ├─ NSelectionRect (圈选组件) ⭐
│     │
│     └─ FileViewRenderer (视图渲染器) ⭐
│        │
│        └─ [动态视图组件]
│           ├─ GridView (网格视图)
│           ├─ ListView (列表视图)
│           ├─ TileView (平铺视图)
│           ├─ DetailView (详细视图)
│           └─ ContentView (内容视图)
│
├─ FileStatusBar (状态栏)
│  ├─ SelectionInfo (选中信息)
│  └─ Statistics (统计信息)
│
└─ DragPreview (拖拽预览)
```

---

## 目录结构

```
src/components/file-explorer/
│
├── FileExplorer.tsx              # 主入口组件
│
├── composables/                  # 业务逻辑层
│   └── useFileExplorerLogic.ts   # 核心业务逻辑封装
│
├── datasources/                  # 数据源层
│   ├── types.ts                  # 数据源接口定义
│   ├── LocalFileDataSource.ts   # 本地文件数据源（File System Access API）
│   ├── ServerFileDataSource.ts  # 服务器文件数据源
│   └── index.ts                  # 数据源导出
│
├── preview/                      # 文件预览组件
│   ├── FilePreview.tsx           # 预览入口组件
│   ├── TextPreview.tsx           # 文本预览
│   ├── ImagePreview.tsx          # 图片预览
│   └── MarkdownPreview.tsx       # Markdown 预览
│
├── editor/                       # 文件编辑组件
│   └── FileEditor.tsx            # Monaco 编辑器封装
│
├── config/                       # 配置层
│   ├── shortcuts.config.ts       # 快捷键配置
│   ├── operations.config.ts      # 文件操作配置
│   ├── contextmenu.config.ts     # 右键菜单配置
│   └── mockData.ts              # Mock 数据
│
├── hooks/                        # 功能 Hooks
│   ├── useFileSelection.ts       # 文件选择逻辑
│   ├── useFileSort.ts            # 文件排序逻辑
│   ├── useFileOperations.ts      # 文件操作逻辑
│   ├── useFileDragDrop.ts        # 基础拖拽逻辑
│   ├── useFileDragDropEnhanced.ts # 增强拖拽逻辑
│   ├── useKeyboardShortcuts.ts   # 键盘快捷键
│   ├── useFileDialog.ts          # 文件对话框
│   ├── useFilePreview.ts         # 文件预览
│   ├── useContextMenuOptions.ts  # 右键菜单选项
│   └── useFileMetadata.ts        # 文件元数据管理（标签、备注）
│
├── layout/                       # 布局组件
│   ├── FileToolbar.tsx           # 顶部工具栏
│   ├── FileBreadcrumb.tsx        # 面包屑导航
│   ├── FileSidebar.tsx           # 左侧边栏
│   ├── FileStatusBar.tsx         # 底部状态栏
│   └── ResizableLayout.tsx       # 可调整布局
│
├── container/                    # 容器组件
│   ├── ViewContainer.tsx         # 视图容器（选择、菜单、滚动）
│   └── FileViewRenderer.tsx      # 视图渲染器（动态切换视图）
│
├── views/                        # 视图组件（5种视图模式）
│   ├── GridView.tsx              # 网格视图
│   ├── ListView.tsx              # 列表视图
│   ├── TileView.tsx              # 平铺视图
│   ├── DetailView.tsx            # 详细视图
│   └── ContentView.tsx           # 内容视图
│
├── interaction/                  # 交互组件
│   ├── ContextMenu.tsx           # 右键菜单
│   ├── DragPreview.tsx           # 拖拽预览
│   ├── DropZone.tsx              # 拖放区域
│   ├── SelectionRect.tsx         # 圈选组件（旧版）
│   └── NSelectionRect.tsx        # 圈选组件（新版）
│
├── items/                        # 文件项组件
│   └── FileIcon.tsx              # 文件图标
│
├── panels/                       # 面板组件
│   └── FileInfoPanel.tsx         # 文件信息面板（标签、备注、属性）
│
├── dialogs/                      # 对话框组件
│   ├── RenameDialog.tsx          # 重命名对话框
│   └── README.md                 # 对话框使用说明
│
├── feedback/                     # 反馈组件
│   ├── FileLoading.tsx           # 加载状态
│   └── FileLoading.module.scss   # 加载样式
│
├── types/                        # 类型定义
│   └── file-explorer.ts          # 所有类型接口
│
├── utils/                        # 工具函数
│   ├── fileHelpers.ts            # 文件工具函数
│   └── tabel.ts                  # 表格工具
│
├── test/                         # 测试组件
│   └── DialogTestPanel.tsx      # 对话框测试面板
│
└── [文档文件]
    ├── README.md                 # 使用说明
    ├── ARCHITECTURE.md           # 架构文档（本文件）
    ├── IMPLEMENTATION_SUMMARY.md # 实施总结
    ├── REFACTORING_SUMMARY.md    # 重构总结
    ├── KEYBOARD_SHORTCUTS.md     # 快捷键说明
    └── SHORTCUTS_QUICK_REFERENCE.md # 快捷键速查
```

---

## 核心组件

### 1. FileExplorer.tsx

**职责**: 主入口组件，负责组合所有子组件

**特点**:
- 使用 `useFileExplorerLogic` 封装所有业务逻辑
- 提供容器和布局结构
- 管理焦点状态（用于快捷键）
- 组合布局组件、视图容器、交互组件

**关键代码**:
```typescript
const logic = useFileExplorerLogic({
  initialItems: mockFileItems,
  containerRef,
  validateDrop: (items, targetPath) => {
    return logic.mockItems.value.find(it => it.path === targetPath)?.type === 'folder';
  }
});
```

### 2. useFileExplorerLogic.ts

**职责**: 核心业务逻辑封装，整合所有 Hooks

**功能模块**:
- **数据源管理**: 切换本地/服务器模式，管理数据源实例
- **路径管理**: 当前路径跟踪，面包屑生成
- **状态管理**: viewMode, gridSize, collapsed, loading 等
- **拖拽系统初始化**: 文件拖拽和放置
- **排序和选择逻辑**: 文件排序和选择状态
- **文件操作配置**: 复制、删除、重命名等操作
- **快捷键绑定**: 键盘快捷键处理
- **事件处理方法**: 文件打开、导航等

**设计模式**: Composable Pattern（组合式函数）

**数据源集成**:
```typescript
// 数据源管理
const dataSourceType = ref<DataSourceType>('local');
const dataSource = ref<IFileDataSource | null>(null);
const currentPath = ref<string>('/');

// 切换数据源
const switchDataSource = (type: DataSourceType) => {
  dataSourceType.value = type;
  if (type === 'local') {
    dataSource.value = new LocalFileDataSource();
  } else {
    dataSource.value = new ServerFileDataSource(serverDataSourceConfig);
  }
};

// 面包屑生成
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  // 根据 currentPath 生成面包屑项
});
```

**返回值**:
```typescript
{
  // 状态
  viewMode, gridSize, collapsed, mockItems,
  sortedFiles, sortOrder, sortField,
  selectedIds, selectedFiles,
  loading, loadingTip, layoutConfig,
  
  // 数据源
  dataSourceType, dataSource, currentPath,
  breadcrumbItems,
  
  // 拖拽
  dragDrop,
  
  // 方法
  setSorting, selectFile, selectAll, clearSelection,
  handleViewModeChange, handleOpen, handleBreadcrumbNavigate,
  handleGridSizeChange, setLoading, handleContextMenuSelect,
  switchDataSource, openLocalFolder, refreshFileList,
  
  // 文件操作
  fileOperations
}
```

### 3. ViewContainer.tsx

**职责**: 视图容器，提供选择、菜单、滚动功能

**功能**:
- 集成圈选组件（NSelectionRect）
- 集成右键菜单（ContextMenu）
- 提供滚动容器（NScrollbar）
- 显示加载状态（FileLoading）
- 动态渲染视图（FileViewRenderer）

**组件层级**:
```
ViewContainer
├─ ContextMenu (右键菜单)
├─ NSelectionRect (圈选)
│  └─ NScrollbar (滚动)
│     └─ FileViewRenderer (视图渲染)
└─ FileLoading (加载遮罩)
```

### 4. FileViewRenderer.tsx

**职责**: 视图渲染器，根据 viewMode 动态切换视图组件

**支持的视图**:
- `grid` → GridView
- `list` → ListView
- `tile` → TileView
- `detail` → DetailView
- `content` → ContentView

### 5. FileInfoPanel.tsx

**职责**: 文件信息面板，显示文件详细信息、标签和备注

**功能模块**:
- **基本信息区块**: 显示文件名称、类型、大小、路径、时间等
- **统计信息区块**: 多选时显示选中文件的统计信息
- **标签管理区块**: 添加、删除、显示标签
- **备注区块**: 编辑和保存文件备注
- **快速操作**: 预留快速操作按钮区域

**特性**:
- 轻量级设计，适配窄面板（最小 200px）
- 单选时显示详细信息
- 多选时显示统计信息
- 标签支持颜色区分
- 备注自动保存（防抖处理）
- 响应式布局

### 6. FilePreview.tsx / FileEditor.tsx

**职责**: 文件预览和编辑功能

**FilePreview.tsx**:
- 根据文件类型自动选择预览组件
- 支持文本、图片、Markdown 预览
- 在 Drawer 中显示预览内容

**FileEditor.tsx**:
- 封装 Monaco 编辑器
- 自动识别文件语言
- 支持保存和关闭操作
- 集成文件写入功能

**特性**:
- 双击文件自动打开预览或编辑器
- 支持文本文件编辑
- 图片文件预览
- Markdown 渲染预览

---

## 数据流与状态管理

### 数据流向

```
初始数据 (mockData.ts)
    ↓
useFileExplorerLogic (状态初始化)
    ↓
mockItems (原始文件列表)
    ↓
useFileSort (排序处理)
    ↓
sortedFiles (排序后的文件列表)
    ↓
ViewContainer → FileViewRenderer → [视图组件]
    ↓
用户交互（选择、拖拽、操作）
    ↓
useFileSelection / useFileOperations
    ↓
状态更新 → 视图重新渲染
```

### 状态管理策略

1. **响应式状态**: 使用 Vue 3 `ref` 和 `reactive`
2. **状态提升**: 核心状态在 `useFileExplorerLogic` 中管理
3. **依赖注入**: 通过 `provide/inject` 共享拖拽和对话框上下文
4. **计算属性**: 使用 `computed` 处理派生状态（如 sortedFiles）

### 关键状态

| 状态 | 类型 | 说明 |
|------|------|------|
| `dataSourceType` | `Ref<DataSourceType>` | 当前数据源类型（local/server） |
| `dataSource` | `Ref<IFileDataSource \| null>` | 当前数据源实例 |
| `currentPath` | `Ref<string>` | 当前路径 |
| `breadcrumbItems` | `ComputedRef<BreadcrumbItem[]>` | 面包屑导航项 |
| `mockItems` | `Ref<FileItem[]>` | 原始文件列表 |
| `sortedFiles` | `ComputedRef<FileItem[]>` | 排序后的文件列表 |
| `selectedIds` | `Ref<Set<string>>` | 选中的文件 ID 集合 |
| `viewMode` | `Ref<ViewMode>` | 当前视图模式 |
| `gridSize` | `Ref<GridSize>` | 网格视图尺寸 |
| `sortField` | `Ref<SortField>` | 排序字段 |
| `sortOrder` | `Ref<SortOrder>` | 排序顺序 |
| `loading` | `Ref<boolean>` | 加载状态 |
| `collapsed` | `Ref<boolean>` | 侧边栏折叠状态 |
| `openedFile` | `Ref<FileItem \| null>` | 当前打开的文件 |
| `fileContent` | `Ref<string \| Blob \| null>` | 文件内容 |
| `editorMode` | `Ref<boolean>` | 是否为编辑模式 |

---

## Hooks 系统

### 1. useFileSelection

**功能**: 文件选择逻辑

**特性**:
- 单选（普通点击）
- 多选（Ctrl/Cmd + 点击）
- 范围选择（Shift + 点击）
- 圈选（拖拽框选）
- 全选/反选

**API**:
```typescript
const {
  selectedIds,      // 选中的 ID 集合
  selectedFiles,    // 选中的文件列表
  selectFile,       // 选择文件
  selectAll,        // 全选
  clearSelection    // 清空选择
} = useFileSelection(fileList);
```

### 2. useFileSort

**功能**: 文件排序逻辑

**排序字段**:
- `name` - 名称（字母序）
- `size` - 大小（数值）
- `type` - 类型（分类）
- `modifiedAt` - 修改日期（时间）
- `createdAt` - 创建日期（时间）

**规则**: 文件夹始终在前

**API**:
```typescript
const {
  sortedFiles,      // 排序后的文件列表
  sortField,        // 当前排序字段
  sortOrder,        // 当前排序顺序
  setSorting        // 设置排序
} = useFileSort(fileList);
```

### 3. useFileOperations

**功能**: 文件操作逻辑封装

**支持操作**:
- `copyFiles` - 复制文件
- `cutFiles` - 剪切文件
- `pasteFiles` - 粘贴文件
- `deleteFiles` - 删除文件
- `renameFile` / `startRename` - 重命名文件
- `createFolder` - 新建文件夹
- `refresh` - 刷新视图
- `showProperties` - 显示属性

**特性**:
- 内部剪贴板管理（clipboard, clipboardOperation）
- 支持复制和剪切两种操作模式
- 剪切操作粘贴后自动清空剪贴板
- 完整的回调支持
- 状态验证（单选/多选限制）

**API**:
```typescript
const fileOperations = useFileOperations(selectedFiles, {
  onCopy, onCut, onPaste, onDelete,
  onRename, onCreateFolder, onRefresh,
  onShowProperties,
  fileDialog
});
```

### 4. useFileDragDropEnhanced

**功能**: 增强的拖拽逻辑

**特性**:
- 支持拖拽移动/复制/链接
- 拖拽预览
- 放置区域验证
- 自动滚动
- 错误处理

**API**:
```typescript
const dragDrop = useFileDragDropEnhanced({
  validateDrop: (items, targetPath) => boolean,
  onMove, onCopy, onLink,
  hooks: { onDragStart, onDrop, ... }
});
```

### 5. useKeyboardShortcuts

**功能**: 键盘快捷键管理

**特性**:
- 支持修饰键组合（Ctrl、Shift、Alt、Meta）
- 可绑定到特定 DOM 元素
- 自动处理事件监听和清理
- 支持自定义快捷键映射

**API**:
```typescript
useKeyboardShortcuts(shortcutsConfig, containerRef);
```

### 6. useFileDialog

**功能**: 文件对话框管理

**特性**:
- 统一的对话框接口
- 支持重命名、删除确认等对话框
- 基于 base-dialog 组件系统

### 7. useFileMetadata

**功能**: 文件元数据管理（标签和备注）

**特性**:
- 使用 Map 存储文件 ID 到元数据的映射
- 提供标签和备注的增删改查方法
- 内存存储（可扩展为 localStorage 持久化）

**API**:
```typescript
const fileMetadata = useFileMetadata();

// 获取元数据
const metadata = fileMetadata.getMetadata(fileId);

// 标签操作
fileMetadata.addTag(fileId, '重要');
fileMetadata.removeTag(fileId, '重要');
fileMetadata.setTags(fileId, ['标签1', '标签2']);

// 备注操作
fileMetadata.setNotes(fileId, '这是备注内容');
const notes = fileMetadata.getNotes(fileId);
```

---

## 交互系统

### 1. 选择系统

**实现**: `useFileSelection` + `NSelectionRect`

**交互方式**:
- **单击**: 单选文件
- **Ctrl/Cmd + 点击**: 多选文件
- **Shift + 点击**: 范围选择
- **拖拽框选**: 圈选多个文件
- **Ctrl+A**: 全选

**组件**: `NSelectionRect.tsx`
- 监听鼠标按下、移动、释放事件
- 计算选择框区域
- 检测与文件项的交集
- 触发选择回调

### 2. 拖拽系统

**实现**: `useFileDragDropEnhanced` + `DragPreview` + `DropZone`

**功能**:
- 拖拽开始: 记录拖拽项和起始位置
- 拖拽移动: 更新预览位置，检测放置区域
- 拖拽结束: 执行放置操作（移动/复制）

**组件**:
- `DragPreview.tsx`: 显示拖拽预览
- `DropZone.tsx`: 放置区域高亮
- `FileDropZoneWrapper.tsx`: 文件项拖拽包装器

**操作类型**:
- `move`: 移动（默认）
- `copy`: 复制（按住 Ctrl）
- `link`: 链接（按住 Shift）

### 3. 右键菜单系统

**实现**: `ContextMenu.tsx` + `useContextMenuOptions` + `contextmenu.config.ts`

**功能**:
- 根据选中项动态生成菜单选项
- 支持文件、文件夹、多选等不同上下文
- 集成文件操作（复制、粘贴、删除等）

**配置**: `contextmenu.config.ts`
- 定义菜单项结构
- 处理菜单选择事件
- 集成文件操作回调

### 4. 键盘快捷键系统

**实现**: `useKeyboardShortcuts` + `shortcuts.config.ts`

**快捷键分类**:

**文件操作** (8个):
- `Ctrl+A` - 全选
- `Ctrl+C` - 复制
- `Ctrl+X` - 剪切
- `Ctrl+V` - 粘贴
- `Delete` - 删除
- `F2` - 重命名
- `Enter` - 打开文件
- `Alt+Enter` - 显示属性/文件信息

**视图切换** (5个):
- `Ctrl+1` - 网格视图
- `Ctrl+2` - 列表视图
- `Ctrl+3` - 平铺视图
- `Ctrl+4` - 详细视图
- `Ctrl+5` - 内容视图

**其他操作** (3个):
- `F5` - 刷新
- `Ctrl+Shift+N` - 新建文件夹
- `Escape` - 取消选择

**配置**: `shortcuts.config.ts`
- 使用依赖注入设计
- 接收操作函数作为参数
- 返回快捷键映射对象

### 5. 信息面板系统

**实现**: `FileInfoPanel` + `useFileMetadata` + 状态栏按钮 + 右键菜单

**功能**:
- 显示文件详细信息（单选时）
- 显示统计信息（多选时）
- 标签管理（添加、删除、显示）
- 备注编辑和保存
- 默认隐藏，可通过按钮或右键菜单打开

**打开方式**:
- 状态栏"信息"按钮（选中文件时可用）
- 右键菜单"文件信息"选项
- 支持拖拽调整面板宽度

**特性**:
- 轻量级设计，性能友好
- 适配窄面板布局
- 标签和备注自动保存
- 响应式布局

---

## 视图系统

### 视图模式

组件支持 5 种视图模式，通过 `FileViewRenderer` 动态切换：

#### 1. GridView (网格视图)

**特点**:
- CSS Grid 布局，响应式列数
- 4 种图标尺寸: extra-large, large, medium, small
- 支持缩略图显示

**布局**:
- Extra Large: 80px 图标，3 列
- Large: 64px 图标，4 列
- Medium: 48px 图标，5 列
- Small: 32px 图标，6 列

#### 2. ListView (列表视图)

**特点**:
- Flex 单行布局
- 紧凑显示，快速浏览
- 显示: 图标（32px）+ 文件名 + 大小标签

#### 3. TileView (平铺视图)

**特点**:
- Grid 2 列布局
- 平衡的信息展示
- 显示: 图标（48px，左侧）+ 文件名 + 元信息（右侧）

#### 4. DetailView (详细视图)

**特点**:
- Naive UI DataTable
- 完整信息展示，可排序
- 显示列: 名称、修改日期、类型、大小

#### 5. ContentView (内容视图)

**特点**:
- Card 列表布局
- 预览文件内容摘要
- 显示: 大图标 + 文件名 + 元信息 + 内容预览（3行）

### 视图切换

**实现**: `FileViewRenderer.tsx`

```typescript
const viewComponent = {
  grid: GridView,
  list: ListView,
  tile: TileView,
  detail: DetailView,
  content: ContentView
}[viewMode.value];

return h(viewComponent, props);
```

---

## 配置系统

### 1. shortcuts.config.ts

**职责**: 快捷键配置管理

**设计**: 依赖注入模式

```typescript
export function createShortcutsConfig(deps: ShortcutsConfigDeps): ShortcutMap {
  return {
    'Ctrl+A': (e) => deps.selectAll(),
    'Ctrl+C': (e) => deps.fileOperations.copyFiles(),
    // ... 更多快捷键
  };
}
```

### 2. operations.config.ts

**职责**: 文件操作回调配置

```typescript
export function createOperationsConfig(
  message: MessageApiInjection,
  setLoading: (value: boolean, tip?: string) => void
): FileOperationsOptions {
  return {
    onCopy: async (items) => { /* ... */ },
    onCut: async (items) => { /* ... */ },
    onPaste: async (items, targetPath) => { /* ... */ },
    // ... 更多操作
  };
}
```

### 3. contextmenu.config.ts

**职责**: 右键菜单配置

```typescript
export function createContextMenuHandler(deps: ContextMenuHandlerDeps) {
  return (key: string) => {
    // 处理菜单选择
  };
}
```

### 4. mockData.ts

**职责**: Mock 数据管理

**导出**:
- `mockFileItems` - 测试文件数据
- `mockBreadcrumbItems` - 面包屑导航数据

---

## 设计模式

### 1. Composable Pattern（组合式函数）

**应用**: 所有业务逻辑封装为 composable

**优势**:
- 逻辑复用
- 关注点分离
- 易于测试

**示例**: `useFileExplorerLogic`, `useFileSelection`, `useFileSort`

### 2. Dependency Injection（依赖注入）

**应用**: 配置函数接收依赖作为参数

**优势**:
- 提高可测试性
- 增强灵活性
- 降低耦合度

**示例**: `createShortcutsConfig`, `createOperationsConfig`

### 3. Strategy Pattern（策略模式）

**应用**: 视图模式切换、排序策略

**示例**: `FileViewRenderer` 根据 `viewMode` 选择不同的视图组件

### 4. Observer Pattern（观察者模式）

**应用**: 事件系统、状态响应

**示例**: Vue 3 响应式系统，状态变化自动触发视图更新

### 5. Provider Pattern（提供者模式）

**应用**: 跨组件共享状态

**示例**: `provide('FILE_DRAG_DROP', dragDrop)`, `provide('FILE_DIALOG', fileDialog)`

---

## 扩展指南

### 添加新数据源

1. 在 `datasources/` 目录创建新数据源类
2. 实现 `IFileDataSource` 接口
3. 在 `useFileExplorerLogic.ts` 中添加切换逻辑
4. 在 `FileToolbar.tsx` 添加模式切换按钮（如需要）

**示例**:
```typescript
// datasources/CustomDataSource.ts
export class CustomDataSource implements IFileDataSource {
  readonly type: DataSourceType = 'custom';
  readonly rootPath: string = '/';
  
  async listFiles(path: string): Promise<FileItem[]> {
    // 实现文件列表获取逻辑
  }
  
  // 实现其他接口方法...
}
```

### 添加新视图模式

1. 在 `views/` 目录创建新视图组件
2. 在 `types/file-explorer.ts` 扩展 `ViewMode` 类型
3. 在 `FileViewRenderer.tsx` 注册新视图
4. 在 `FileToolbar.tsx` 添加视图切换按钮
5. 在 `shortcuts.config.ts` 添加快捷键（可选）

### 添加新文件操作

1. 在 `useFileOperations.ts` 添加操作函数
2. 在 `operations.config.ts` 添加回调配置
3. 在数据源中实现对应的操作方法（如 `deleteFile`, `renameFile`）
4. 在 `contextmenu.config.ts` 添加菜单项（可选）
5. 在 `shortcuts.config.ts` 添加快捷键（可选）

### 添加新文件预览类型

1. 在 `preview/` 目录创建新预览组件
2. 在 `FilePreview.tsx` 中添加文件类型判断逻辑
3. 注册新的预览组件

**示例**:
```typescript
// preview/PDFPreview.tsx
export default defineComponent({
  // PDF 预览实现
});

// FilePreview.tsx
if (file.extension === 'pdf') {
  return h(PDFPreview, { file, content });
}
```

### 添加新 Hook

1. 在 `hooks/` 目录创建新 Hook 文件
2. 在 `useFileExplorerLogic.ts` 集成新 Hook
3. 在相关组件中使用新 Hook 的功能

### 自定义配置

**修改快捷键**:
编辑 `config/shortcuts.config.ts`

**修改操作回调**:
编辑 `config/operations.config.ts`

**修改右键菜单**:
编辑 `config/contextmenu.config.ts`

**替换 Mock 数据**:
编辑 `config/mockData.ts` 或连接真实 API

**配置数据源**:
在 `useFileExplorerLogic` 的 `options` 中传入 `initialDataSourceType` 和 `serverDataSourceConfig`

---

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **UI 库**: Naive UI
- **样式**: SCSS Modules
- **构建工具**: Vite

---

## 最佳实践

### 1. 状态管理

- ✅ 核心状态在 `useFileExplorerLogic` 中统一管理
- ✅ 使用 `computed` 处理派生状态
- ✅ 通过 `provide/inject` 共享跨组件状态

### 2. 代码组织

- ✅ 配置与逻辑分离
- ✅ 业务逻辑封装为 composable
- ✅ 通用功能提取为 hooks

### 3. 类型安全

- ✅ 所有接口定义在 `types/file-explorer.ts`
- ✅ 使用 TypeScript 严格模式
- ✅ 为所有函数和组件提供类型定义

### 4. 性能优化

- ✅ 使用 `computed` 缓存计算结果
- ✅ 列表渲染使用虚拟滚动（如需要）
- ✅ 事件处理使用防抖/节流（如需要）

### 5. 可维护性

- ✅ 清晰的目录结构
- ✅ 完善的注释和文档
- ✅ 统一的命名规范

---

## 总结

File Explorer 组件采用分层架构设计，实现了：

1. **关注点分离**: 配置、逻辑、视图三层清晰分离
2. **高内聚低耦合**: 各模块职责单一，依赖关系清晰
3. **可扩展性**: 易于添加新功能和修改现有功能
4. **可维护性**: 代码结构清晰，文档完善
5. **可测试性**: 各层可独立测试

组件已实现完整的文件管理功能，包括多种视图模式、文件操作、拖拽系统、选择系统、快捷键等，可直接用于生产环境。

---

**文档版本**: 2.0  
**最后更新**: 2025-01-XX  
**维护者**: 开发团队

## 更新日志

### v2.0 (2025-01-XX)
- ✅ 添加双模式支持（本地/服务器）
- ✅ 实现数据源抽象层（IFileDataSource）
- ✅ 添加文件预览功能（文本、图片、Markdown）
- ✅ 集成 Monaco 编辑器
- ✅ 实现面包屑导航
- ✅ 修复双击文件夹导航功能
- ✅ 优化工具栏布局和响应式设计

### v1.0 (2025-11-08)
- ✅ 基础文件管理器功能
- ✅ 5 种视图模式
- ✅ 文件操作和拖拽系统
- ✅ 键盘快捷键支持

