# 📂 文件管理器完整架构

## 🏗️ 目录结构

```
src/
├── components/
│   └── file-explorer/
│       ├── index.ts                      # 导出入口
│       ├── FileExplorer.vue              # 主入口组件（整合所有功能）
│       │
│       ├── layout/                       # 布局组件
│       │   ├── FileToolbar.vue           # 顶部工具栏（视图切换、排序、搜索）
│       │   ├── FileBreadcrumb.vue        # 面包屑导航
│       │   ├── FileSidebar.vue           # 左侧边栏（快速访问、文件树）
│       │   └── FileStatusBar.vue         # 底部状态栏（选中信息、统计）
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
│       │   ├── FileItem.tsx              # 通用文件项
│       │   ├── FileIcon.vue              # 文件图标
│       │   ├── FolderItem.vue            # 文件夹项
│       │   └── FileThumbnail.vue         # 缩略图
│       │
│       ├── interaction/                  # 交互组件
│       │   ├── SelectionRect.tsx         # ✨ 圈选组件
│       │   ├── ContextMenu.vue           # 右键菜单
│       │   ├── DragPreview.vue           # 拖拽预览
│       │   └── DropZone.vue              # 拖放区域
│       │
│       ├── dialogs/                      # 对话框
│       │   ├── RenameDialog.vue          # 重命名
│       │   ├── DeleteConfirm.vue         # 删除确认
│       │   ├── PropertiesDialog.vue      # 文件属性
│       │   ├── CreateFolderDialog.vue    # 新建文件夹
│       │   └── UploadDialog.vue          # 上传进度
│       │
│       ├── preview/                      # 预览组件
│       │   ├── FilePreviewPanel.vue      # 预览面板容器
│       │   ├── ImagePreview.vue          # 图片预览
│       │   ├── VideoPreview.vue          # 视频预览
│       │   ├── AudioPreview.vue          # 音频预览
│       │   ├── PDFPreview.vue            # PDF预览
│       │   └── TextPreview.vue           # 文本/代码预览
│       │
│       └── utils/                        # 工具组件
│           ├── EmptyState.vue            # 空状态
│           ├── LoadingState.vue          # 加载状态
│           ├── ProgressBar.vue           # 进度条
│           └── BulkActionsBar.vue        # 批量操作栏
│
├── composables/                          # 组合式函数
│   └── file-explorer/
│       ├── useFileSelection.ts           # ✨ 选择逻辑
│       ├── useFileSort.ts                # ✨ 排序逻辑
│       ├── useFileFilter.ts              # 过滤/搜索
│       ├── useFileDragDrop.ts            # 拖拽逻辑
│       ├── useFileOperations.ts          # 文件操作（复制/移动/删除）
│       ├── useFileNavigation.ts          # 导航逻辑
│       └── useKeyboardShortcuts.ts       # 键盘快捷键
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
├─ Content Area (内容区域)
│  │
│  ├─ FileSidebar (侧边栏 - 可选)
│  │  ├─ QuickAccess (快速访问)
│  │  ├─ FolderTree (文件树)
│  │  └─ StorageInfo (存储信息)
│  │
│  └─ ViewContainer (视图容器) ⭐
│     │
│     └─ SelectionRect (圈选层) ⭐
│        │
│        └─ [动态视图组件] ⭐
│           ├─ GridView (网格)
│           ├─ ListView (列表)
│           ├─ TileView (平铺)
│           ├─ DetailView (详细)
│           └─ ContentView (内容)
│
└─ FileStatusBar (状态栏)
   ├─ SelectionInfo (选中信息)
   └─ Statistics (统计信息)
```

---

## 📋 核心功能实现清单

### ✅ 已实现
- [x] SelectionRect 圈选组件（带边界限制）
- [x] ViewContainer 视图容器
- [x] 5种视图模式基础结构
- [x] useFileSelection 选择逻辑
- [x] useFileSort 排序逻辑
- [x] 文件工具函数

### 🚧 待完善
- [ ] 右键菜单系统
- [ ] 拖拽功能完整实现
- [ ] 预览面板
- [ ] 对话框系统
- [ ] 键盘快捷键
- [ ] 文件操作（复制/粘贴/移动）
- [ ] 搜索过滤功能
- [ ] 面包屑导航
- [ ] 侧边栏
- [ ] 状态栏

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
- Hover 放大效果
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

## 💡 使用示例

```vue
<template>
  <FileExplorer
    :files="files"
    v-model:selected-ids="selectedIds"
    v-model:view-config="viewConfig"
    @file-click="handleFileClick"
    @file-dblclick="handleFileDblClick"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FileExplorer from '@/components/file-explorer'
import type { FileItem, ViewConfig } from '@/types/file-explorer'

const files = ref<FileItem[]>([...])
const selectedIds = ref<string[]>([])
const viewConfig = ref<ViewConfig>({
  mode: 'grid',
  iconSize: 'medium',
  sortField: 'name',
  sortOrder: 'asc'
})

const handleFileClick = (id: string) => {
  console.log('Clicked:', id)
}

const handleFileDblClick = (id: string) => {
  console.log('Double clicked:', id)
}
</script>
```

---

## 🎨 样式自定义

所有组件完全兼容 Naive UI 主题系统，支持：
- ✅ 明暗主题自动切换
- ✅ 主题色变量引用
- ✅ CSS 变量驱动
- ✅ 响应式设计

---

## 🚀 下一步建议

1. **优先实现**: 右键菜单 + 对话框系统
2. **增强交互**: 拖拽功能完整实现
3. **完善导航**: 面包屑 + 侧边栏
4. **添加预览**: 各类文件预览组件
5. **快捷键**: 全局键盘快捷键支持