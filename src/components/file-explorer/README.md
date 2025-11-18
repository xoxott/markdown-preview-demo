# 📂 文件管理器组件

## 📋 概述

File Explorer 是一个功能完整的文件管理器组件，采用 Vue 3 Composition API 和 TypeScript 构建。组件采用分层架构设计，实现了关注点分离、高内聚低耦合的代码组织方式。

### ✨ 核心特性

- ✅ **5 种视图模式**: 网格、列表、平铺、详细、内容视图
- ✅ **完整的文件操作**: 复制、剪切、粘贴、删除、重命名、新建文件夹
- ✅ **拖拽系统**: 支持文件拖拽移动/复制，带预览和验证
- ✅ **选择系统**: 单选、多选、范围选择、圈选（智能边界检测）
- ✅ **键盘快捷键**: 16 个快捷键支持
- ✅ **右键菜单**: 上下文相关的操作菜单
- ✅ **信息面板**: 文件属性展示和统计信息（默认隐藏）
- ✅ **响应式布局**: 可调整的侧边栏和面板
- ✅ **加载状态**: 统一的加载反馈机制

---

## 🏗️ 目录结构

```
src/
├── components/
│   └── file-explorer/
│       ├── index.ts                      # 导出入口
│       ├── FileExplorer.vue              # 主入口组件（整合所有功能）
│       │
│       ├── layout/                       # 布局组件
│       │   ├── FileToolbar.tsx           # 顶部工具栏（视图切换、排序、搜索）
│       │   ├── FileBreadcrumb.tsx        # 面包屑导航
│       │   ├── FileSidebar.tsx           # 左侧边栏（快速访问、文件树）
│       │   └── FileStatusBar.tsx         # 底部状态栏（选中信息、统计）
│       │
│       ├── container/                    # 容器层
│       │   └── ViewContainer.tsx         # 视图容器（切换不同视图模式）
│       │
│       ├── views/                        # 视图层（5种视图模式）
│       │   ├── GridView.tsx              # 网格视图（4种图标尺寸）
│       │   ├── ListView.tsx              # 列表视图（紧凑单行）
│       │   ├── TileView.tsx              # 平铺视图（图标+信息）
│       │   ├── DetailView.tsx            # 详细视图（表格形式）
│       │   └── ContentView.tsx           # 内容视图（预览摘要）
│       │
│       ├── items/                        # 文件项组件
│       │   └── FileIcon.tsx              # 文件图标
│       │
│       ├── panels/                       # 面板组件
│       │   └── FileInfoPanel.tsx         # 文件信息面板（属性、统计）
│       │
│       ├── interaction/                  # 交互组件
│       │   ├── NSelectionRect.tsx        # ✨ 圈选组件（新版）
│       │   ├── SelectionRect.tsx         # 圈选组件（旧版）
│       │   ├── ContextMenu.tsx           # 右键菜单
│       │   ├── DragPreview.tsx           # 拖拽预览
│       │   ├── DropZone.tsx              # 拖放区域
│       │   └── FileDropZoneWrapper.tsx   # 文件拖拽包装器
│       │
│       ├── dialogs/                      # 对话框组件
│       │   ├── RenameDialog.tsx          # 重命名对话框
│       │   └── README.md                 # 对话框使用说明
│       │
│       ├── feedback/                     # 反馈组件
│       │   ├── FileLoading.tsx           # 加载状态
│       │   └── FileLoading.module.scss   # 加载样式
│       │
│       └── utils/                        # 工具函数
│           ├── fileHelpers.ts            # 文件工具函数
│           └── tabel.ts                  # 表格工具
│
├── composables/                          # 业务逻辑层
│   └── useFileExplorerLogic.ts          # 核心业务逻辑封装
│
├── hooks/                                # 功能 Hooks
│   ├── useFileSelection.ts              # 文件选择逻辑
│   ├── useFileSort.ts                   # 文件排序逻辑
│   ├── useFileOperations.ts             # 文件操作逻辑
│   ├── useFileDragDrop.ts               # 基础拖拽逻辑
│   ├── useFileDragDropEnhanced.ts        # 增强拖拽逻辑
│   ├── useKeyboardShortcuts.ts          # 键盘快捷键
│   ├── useFileDialog.ts                 # 文件对话框
│   ├── useFilePreview.ts                # 文件预览
│   ├── useContextMenuOptions.ts         # 右键菜单选项
│   └── useFileMetadata.ts                # 文件元数据管理
│
├── types/                                # 类型定义
│   └── file-explorer.ts                  # 所有类型接口
│
├── utils/                                # 工具函数
│   └── file-explorer/
│       ├── fileHelpers.ts                # ✨ 文件工具（格式化、图标等）
│       ├── sortHelpers.ts                # 排序辅助
│       ├── pathHelpers.ts                # 路径处理
│       └── validators.ts                 # 验证函数
│
└── styles/                               # 样式文件
    └── file-explorer/
        ├── common.scss                   # 公共样式
        ├── grid.scss                     # 网格视图样式
        ├── list.scss                     # 列表视图样式
        └── selection.scss                # 选择相关样式
```

---

## 🔄 组件层级关系

```
FileExplorer (主容器)
│
├─ FileToolbar (工具栏)
│  ├─ ViewModeSwitch (视图切换)
│  ├─ SortSelector (排序选择器)
│  └─ SearchBar (搜索栏)
│
├─ FileBreadcrumb (面包屑)
│
├─ ResizableLayout (可调整布局)
│  │
│  ├─ FileSidebar (左侧边栏)
│  │  ├─ QuickAccess (快速访问)
│  │  └─ FolderTree (文件树)
│  │
│  ├─ ViewContainer (视图容器) ⭐
│  │  │
│  │  ├─ ContextMenu (右键菜单)
│  │  │
│  │  ├─ NSelectionRect (圈选组件) ⭐
│  │  │
│  │  └─ FileViewRenderer (视图渲染器) ⭐
│  │     │
│  │     └─ [动态视图组件]
│  │        ├─ GridView (网格视图)
│  │        ├─ ListView (列表视图)
│  │        ├─ TileView (平铺视图)
│  │        ├─ DetailView (详细视图)
│  │        └─ ContentView (内容视图)
│  │
│  └─ FileInfoPanel (信息面板) ⭐
│     ├─ 基本信息（单选时）
│     └─ 统计信息（多选时）
│
└─ FileStatusBar (状态栏)
   ├─ SelectionInfo (选中信息)
   └─ Statistics (统计信息)
```
props 用于“组件特定、独立的参数”。

inject 用于“全局共享、深层复用的状态/方法”。
---

## 📋 核心功能实现清单

### ✅ 已实现功能

#### 视图系统
- [x] 5种视图模式（网格、列表、平铺、详细、内容）
- [x] 网格视图支持4种图标尺寸
- [x] 详细视图支持列宽调整和列顺序拖拽
- [x] 视图动态切换

#### 选择系统
- [x] 单选（普通点击）
- [x] 多选（Ctrl/Cmd + 点击）
- [x] 范围选择（Shift + 点击）
- [x] 圈选（拖拽框选）
- [x] 全选/反选（Ctrl+A / Escape）
- [x] 智能边界检测（只在视图容器内清空选中）

#### 文件操作
- [x] 复制/剪切/粘贴（内部剪贴板管理）
- [x] 删除文件
- [x] 重命名文件
- [x] 新建文件夹
- [x] 刷新视图
- [x] 显示文件属性

#### 交互系统
- [x] 右键菜单（上下文相关）
- [x] 拖拽移动/复制（带预览和验证）
- [x] 键盘快捷键（16个快捷键）
- [x] 圈选组件（高性能，支持自动滚动）

#### 布局系统
- [x] 可调整的左侧边栏（可折叠）
- [x] 可调整的右侧信息面板（默认隐藏）
- [x] 响应式布局
- [x] 拖拽调整宽度

#### UI 组件
- [x] 顶部工具栏（视图切换、排序、网格尺寸）
- [x] 面包屑导航
- [x] 左侧边栏（快速访问、文件树）
- [x] 底部状态栏（选中信息、统计）
- [x] 右侧信息面板（文件属性、统计信息）
- [x] 加载状态反馈

#### 其他功能
- [x] 文件排序（名称、大小、类型、日期）
- [x] 文件夹始终在前
- [x] 文件图标识别
- [x] 文件大小格式化
- [x] 日期格式化

### 🚧 待完善功能
- [ ] 搜索过滤功能
- [ ] 文件预览（图片、PDF、文本等）
- [ ] 批量操作进度显示
- [ ] 文件上传功能

---

## 🎯 视图模式详细说明

### 1️⃣ GridView - 网格视图
**布局方式**: CSS Grid + Auto Fill  
**图标尺寸**:
- Extra Large: 80px (3列)
- Large: 64px (4列)
- Medium: 48px (5列)
- Small: 32px (6列)

**特点**:
- 响应式列数
- 缩略图支持

---

### 2️⃣ ListView - 列表视图
**布局方式**: Flex 单行  
**显示内容**:
- 图标（32px）
- 文件名
- 大小标签

**特点**:
- 紧凑布局
- 快速浏览
- 类似资源管理器

---

### 3️⃣ TileView - 平铺视图
**布局方式**: Grid 2列  
**显示内容**:
- 图标（48px，左侧）
- 文件名 + 元信息（右侧）

**特点**:
- 平衡的信息展示
- 适合中等数量文件

---

### 4️⃣ DetailView - 详细视图
**布局方式**: Naive UI DataTable  
**显示列**:
- 名称（带图标）
- 修改日期
- 类型
- 大小

**特点**:
- 完整信息展示
- 可排序
- 表格形式

---

### 5️⃣ ContentView - 内容视图
**布局方式**: Card 列表  
**显示内容**:
- 大图标（48px）
- 文件名 + 元信息
- 内容预览摘要（3行）

**特点**:
- 预览文件内容
- 适合文档搜索
- 最详细的视图

---

## 🔧 关键 Composable 说明

### useFileSelection
**功能**: 统一的文件选择逻辑  
**支持**:
- 单选（普通点击）
- 多选（Ctrl/Cmd + 点击）
- 范围选择（Shift + 点击）
- 圈选（拖拽框选）
- 全选/反选

---

### useFileSort
**功能**: 文件排序逻辑  
**排序字段**:
- 名称（字母序）
- 大小（数值）
- 类型（分类）
- 修改日期（时间）

**规则**: 文件夹始终在前

---

### useKeyboardShortcuts
**功能**: 统一的键盘快捷键管理  
**特性**:
- 支持修饰键组合（Ctrl、Shift、Alt、Meta）
- 可绑定到特定 DOM 元素或全局
- 自动处理事件监听和清理
- 支持自定义快捷键映射

**使用示例**:
```typescript
useKeyboardShortcuts({
  'Ctrl+C': (e) => copyFiles(),
  'Ctrl+V': (e) => pasteFiles(),
  'Delete': (e) => deleteFiles()
}, containerRef)
```

---

### useFileOperations
**功能**: 文件操作逻辑封装  
**支持操作**:
- 复制/剪切/粘贴（内部剪贴板管理）
- 删除文件
- 重命名文件
- 新建文件夹
- 刷新视图
- 显示属性

**特性**:
- 统一的操作接口
- 剪贴板状态管理
- 操作回调支持
- 状态验证（单选/多选限制）

### useFileDragDropEnhanced
**功能**: 增强的拖拽逻辑  
**特性**:
- 支持拖拽移动/复制/链接
- 拖拽预览
- 放置区域验证
- 自动滚动
- 错误处理

### useFileMetadata
**功能**: 文件元数据管理  
**特性**:
- 使用 Map 存储文件 ID 到元数据的映射
- 提供标签和备注的增删改查方法
- 内存存储（可扩展为 localStorage 持久化）

---

## ⌨️ 键盘快捷键

### 文件操作（8个）
- `Ctrl+A` - 全选文件
- `Ctrl+C` - 复制选中文件
- `Ctrl+X` - 剪切选中文件
- `Ctrl+V` - 粘贴文件
- `Delete` - 删除选中文件
- `F2` - 重命名（单个文件）
- `Enter` - 打开选中文件
- `Alt+Enter` - 显示文件属性/信息面板

### 视图切换（5个）
- `Ctrl+1` - 切换到网格视图
- `Ctrl+2` - 切换到列表视图
- `Ctrl+3` - 切换到平铺视图
- `Ctrl+4` - 切换到详细视图
- `Ctrl+5` - 切换到内容视图

### 其他操作（3个）
- `F5` - 刷新视图
- `Ctrl+Shift+N` - 新建文件夹
- `Escape` - 取消选择

**详细说明**: 参见 [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md)

---

## 📊 信息面板

### 功能特性
- **文件信息展示**: 显示选中文件的详细信息（名称、类型、大小、路径、时间等）
- **统计信息**: 多选时显示选中文件的统计信息（总数、文件数、文件夹数、总大小、文件类型分布）
- **轻量级设计**: 适配窄面板（最小 200px），性能友好
- **默认隐藏**: 通过右键菜单"文件信息"选项打开
- **可调整宽度**: 支持拖拽调整面板宽度（120px - 1000px）

### 打开方式
- 右键菜单 → "文件信息"选项
- 快捷键 `Alt+Enter`（选中文件时）

### 显示内容

**单选时**:
- 基本信息：名称、类型、大小、扩展名、路径、创建时间、修改时间

**多选时**:
- 统计信息：总数、文件数、文件夹数、总大小
- 文件类型分布：按扩展名统计

---

## 🎯 使用示例

### 基本使用

```vue
<template>
  <FileExplorer />
</template>

<script setup>
import FileExplorer from '@/components/file-explorer/FileExplorer.vue'
</script>
```

### 自定义配置

```typescript
import { useFileExplorerLogic } from '@/components/file-explorer/composables/useFileExplorerLogic'

const logic = useFileExplorerLogic({
  initialItems: fileList,
  containerRef,
  validateDrop: (items, targetPath) => {
    // 自定义拖放验证逻辑
    return true
  }
})
```

---

## 📚 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 完整架构文档
- [KEYBOARD_SHORTCUTS.md](./KEYBOARD_SHORTCUTS.md) - 键盘快捷键详细说明
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 实施总结
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - 重构总结

---
