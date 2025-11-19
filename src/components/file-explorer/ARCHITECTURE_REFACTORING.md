# 文件管理器与知识库架构重构方案

## 📋 问题分析

### 当前问题
1. **功能耦合**: FileExplorer 组件包含大量业务逻辑，既作为组件又作为页面使用
2. **职责不清**: 文件管理器和知识库功能混在一起
3. **难以扩展**: 添加知识库功能时，需要修改 FileExplorer 组件
4. **代码复用困难**: 两个功能之间难以共享代码

### 目标
- 将知识库作为独立的页面功能
- 文件管理器和知识库可以共享通用组件和逻辑
- 清晰的职责分离和模块化设计
- 易于维护和扩展

---

## 🏗️ 架构设计方案

### 整体架构

```
src/
├── views/                              # 页面层（路由入口）
│   ├── file-manager/                   # 文件管理器页面
│   │   └── index.vue                   # 文件管理器页面入口
│   └── knowledge-base/                 # 知识库页面
│       ├── index.vue                   # 知识库页面入口
│       └── modules/                    # 知识库子模块页面
│           ├── knowledge-base-list.vue    # 知识库列表
│           ├── document-management.vue    # 文档管理
│           └── qa-panel.vue               # 问答面板
│
├── components/                         # 组件层
│   ├── file-explorer/                  # 文件管理器组件（重构后）
│   │   ├── FileExplorer.tsx            # 文件管理器主组件（纯组件）
│   │   ├── composables/                # 文件管理器业务逻辑
│   │   ├── hooks/                      # 文件管理器 Hooks
│   │   └── ...                         # 其他文件管理器相关代码
│   │
│   └── knowledge-base/                 # 知识库组件（新建）
│       ├── KnowledgeBaseExplorer.tsx   # 知识库主组件
│       ├── composables/                # 知识库业务逻辑
│       ├── hooks/                      # 知识库 Hooks
│       └── ...                         # 其他知识库相关代码
│
└── shared/                             # 共享层（新建）
    ├── file-system/                    # 文件系统相关共享
    │   ├── components/                 # 共享组件
    │   │   ├── FileIcon.tsx           # 文件图标（从 file-explorer 提取）
    │   │   ├── FilePreview.tsx        # 文件预览（从 file-explorer 提取）
    │   │   └── FileEditor.tsx         # 文件编辑器（从 file-explorer 提取）
    │   ├── hooks/                      # 共享 Hooks
    │   │   ├── useFilePreview.ts      # 文件预览逻辑
    │   │   └── useFileEditor.ts       # 文件编辑逻辑
    │   └── utils/                      # 共享工具函数
    │       ├── fileHelpers.ts         # 文件工具函数
    │       └── formatHelpers.ts       # 格式化工具
    │
    └── layout/                         # 布局相关共享
        ├── ResizableLayout.tsx        # 可调整布局（从 file-explorer 提取）
        ├── FileBreadcrumb.tsx         # 面包屑（从 file-explorer 提取）
        └── FileStatusBar.tsx          # 状态栏（从 file-explorer 提取）
```

---

## 📦 模块划分

### 1. 文件管理器模块 (`components/file-explorer/`)

#### 职责
- 文件系统管理（本地/云端）
- 文件操作（复制、剪切、删除、重命名等）
- 文件浏览和导航
- 文件选择和拖拽

#### 保留的组件
- `FileExplorer.tsx` - 主组件（纯组件，不包含页面逻辑）
- `FileToolbar.tsx` - 工具栏
- `FileSidebar.tsx` - 侧边栏
- `ViewContainer.tsx` - 视图容器
- `FileStatusBar.tsx` - 状态栏（或移到 shared）
- 所有视图组件（GridView、ListView 等）

#### 保留的逻辑
- `useFileExplorerLogic.ts` - 文件管理器核心逻辑
- 所有文件操作相关的 Hooks
- 文件数据源（LocalFileDataSource、ServerFileDataSource）

---

### 2. 知识库模块 (`components/knowledge-base/`)

#### 职责
- 知识库管理
- 文档上传和解析
- 向量化和索引
- 语义搜索
- RAG 问答

#### 新建的组件
- `KnowledgeBaseExplorer.tsx` - 知识库主组件
- `KnowledgeBaseManager.tsx` - 知识库管理
- `DocumentUploader.tsx` - 文档上传
- `QAPanel.tsx` - 问答面板
- 其他知识库相关组件（参考 RAG_KNOWLEDGE_BASE_PLAN.md）

#### 新建的逻辑
- `useKnowledgeBaseLogic.ts` - 知识库核心逻辑
- 所有知识库相关的 Hooks 和服务

---

### 3. 共享模块 (`shared/`)

#### 文件系统共享 (`shared/file-system/`)

**共享组件**:
- `FileIcon.tsx` - 文件图标（从 `file-explorer/items/FileIcon.tsx` 提取）
- `FilePreview.tsx` - 文件预览（从 `file-explorer/preview/` 提取）
- `FileEditor.tsx` - 文件编辑器（从 `file-explorer/editor/` 提取）

**共享 Hooks**:
- `useFilePreview.ts` - 文件预览逻辑
- `useFileEditor.ts` - 文件编辑逻辑

**共享工具**:
- `fileHelpers.ts` - 文件工具函数（格式化、图标识别等）
- `formatHelpers.ts` - 格式化工具（日期、大小等）

#### 布局共享 (`shared/layout/`)

**共享组件**:
- `ResizableLayout.tsx` - 可调整布局（从 `file-explorer/layout/ResizableLayout.tsx` 提取）
- `FileBreadcrumb.tsx` - 面包屑导航（从 `file-explorer/layout/FileBreadcrumb.tsx` 提取）
- `FileStatusBar.tsx` - 状态栏（从 `file-explorer/layout/FileStatusBar.tsx` 提取，可选）

---

## 🔄 重构步骤

### Phase 1: 创建共享模块（1周）

#### Step 1.1: 创建共享目录结构
```
src/shared/
├── file-system/
│   ├── components/
│   ├── hooks/
│   └── utils/
└── layout/
    └── components/
```

#### Step 1.2: 提取共享组件
1. 将 `FileIcon.tsx` 移到 `shared/file-system/components/`
2. 将 `FilePreview.tsx` 移到 `shared/file-system/components/`
3. 将 `FileEditor.tsx` 移到 `shared/file-system/components/`
4. 将 `ResizableLayout.tsx` 移到 `shared/layout/components/`
5. 将 `FileBreadcrumb.tsx` 移到 `shared/layout/components/`（可选）

#### Step 1.3: 提取共享逻辑
1. 提取文件预览逻辑到 `shared/file-system/hooks/useFilePreview.ts`
2. 提取文件编辑逻辑到 `shared/file-system/hooks/useFileEditor.ts`
3. 提取工具函数到 `shared/file-system/utils/`

#### Step 1.4: 更新导入路径
- 更新 `FileExplorer.tsx` 中的导入路径
- 确保所有功能正常

---

### Phase 2: 重构文件管理器（1周）

#### Step 2.1: 清理 FileExplorer 组件
1. 移除页面相关的逻辑（路由、导航等）
2. 确保组件只负责 UI 渲染和事件处理
3. 所有业务逻辑通过 props 和 events 传递

#### Step 2.2: 创建文件管理器页面
```vue
<!-- src/views/file-manager/index.vue -->
<script lang="tsx" setup>
import { ref } from 'vue';
import FileExplorer from '@/components/file-explorer/FileExplorer';
import { useFileExplorerLogic } from '@/components/file-explorer/composables/useFileExplorerLogic';
import { mockFileItems } from '@/components/file-explorer/config/mockData';

const containerRef = ref<HTMLElement | null>(null);

// 业务逻辑在页面层处理
const logic = useFileExplorerLogic({
  initialItems: mockFileItems,
  containerRef,
  // ... 其他配置
});

// 页面级别的处理逻辑
const handleOpenFile = async (file: FileItem) => {
  // ... 处理逻辑
};
</script>

<template>
  <div ref="containerRef" class="file-manager-page">
    <FileExplorer
      :logic="logic"
      @open-file="handleOpenFile"
    />
  </div>
</template>
```

#### Step 2.3: 调整 FileExplorer 组件接口
```typescript
// FileExplorer.tsx 的 props
interface FileExplorerProps {
  // 通过 props 传入业务逻辑实例
  logic: ReturnType<typeof useFileExplorerLogic>;
  // 或者传入配置，组件内部创建逻辑
  config?: UseFileExplorerLogicOptions;
}

// 通过 events 暴露操作
interface FileExplorerEmits {
  (e: 'open-file', file: FileItem): void;
  (e: 'select-files', files: FileItem[]): void;
  // ... 其他事件
}
```

---

### Phase 3: 创建知识库模块（2-3周）

#### Step 3.1: 创建知识库目录结构
```
src/components/knowledge-base/
├── KnowledgeBaseExplorer.tsx
├── composables/
│   └── useKnowledgeBaseLogic.ts
├── hooks/
│   ├── useKnowledgeBase.ts
│   ├── useDocumentParser.ts
│   ├── useEmbedding.ts
│   ├── useSemanticSearch.ts
│   └── useRAGQA.ts
├── services/
│   ├── DocumentParserService.ts
│   ├── EmbeddingService.ts
│   ├── VectorDBService.ts
│   ├── SearchService.ts
│   └── RAGService.ts
└── ... (参考 RAG_KNOWLEDGE_BASE_PLAN.md)
```

#### Step 3.2: 创建知识库页面
```vue
<!-- src/views/knowledge-base/index.vue -->
<script lang="tsx" setup>
import { ref } from 'vue';
import KnowledgeBaseExplorer from '@/components/knowledge-base/KnowledgeBaseExplorer';
import { useKnowledgeBaseLogic } from '@/components/knowledge-base/composables/useKnowledgeBaseLogic';

const containerRef = ref<HTMLElement | null>(null);

// 知识库业务逻辑
const logic = useKnowledgeBaseLogic({
  containerRef,
  // ... 配置
});
</script>

<template>
  <div ref="containerRef" class="knowledge-base-page">
    <KnowledgeBaseExplorer :logic="logic" />
  </div>
</template>
```

#### Step 3.3: 复用共享组件
- 知识库中使用 `shared/file-system/components/FilePreview.tsx` 预览文档
- 知识库中使用 `shared/file-system/components/FileIcon.tsx` 显示文档图标
- 知识库中使用 `shared/layout/components/ResizableLayout.tsx` 布局

---

### Phase 4: 添加路由（1天）

#### Step 4.1: 添加知识库路由
```typescript
// src/router/routes/index.ts 或相应路由文件
{
  path: '/knowledge-base',
  name: 'knowledge-base',
  component: () => import('@/views/knowledge-base/index.vue'),
  meta: {
    title: '知识库',
    icon: 'knowledge-base'
  }
}
```

#### Step 4.2: 更新菜单配置
- 在导航菜单中添加知识库入口
- 确保路由正常工作

---

## 📐 组件接口设计

### FileExplorer 组件接口（重构后）

```typescript
// components/file-explorer/FileExplorer.tsx
export interface FileExplorerProps {
  // 方式1: 传入逻辑实例（推荐）
  logic: ReturnType<typeof useFileExplorerLogic>;

  // 方式2: 传入配置，组件内部创建逻辑
  // config?: UseFileExplorerLogicOptions;

  // 可选的自定义配置
  showToolbar?: boolean;
  showSidebar?: boolean;
  showStatusBar?: boolean;
}

export interface FileExplorerEmits {
  (e: 'open-file', file: FileItem): void;
  (e: 'select-files', files: FileItem[]): void;
  (e: 'context-menu', file: FileItem, event: MouseEvent): void;
  // ... 其他事件
}
```

### KnowledgeBaseExplorer 组件接口

```typescript
// components/knowledge-base/KnowledgeBaseExplorer.tsx
export interface KnowledgeBaseExplorerProps {
  logic: ReturnType<typeof useKnowledgeBaseLogic>;
  showKnowledgeBaseList?: boolean;
  showQAPanel?: boolean;
}

export interface KnowledgeBaseExplorerEmits {
  (e: 'select-knowledge-base', kb: KnowledgeBase): void;
  (e: 'ask-question', question: string): void;
  // ... 其他事件
}
```

---

## 🔗 依赖关系

### 文件管理器依赖
```
FileExplorer
├── shared/file-system/components/FileIcon
├── shared/file-system/components/FilePreview
├── shared/file-system/components/FileEditor
├── shared/layout/components/ResizableLayout
└── shared/file-system/utils/fileHelpers
```

### 知识库依赖
```
KnowledgeBaseExplorer
├── shared/file-system/components/FileIcon
├── shared/file-system/components/FilePreview
├── shared/layout/components/ResizableLayout
└── 知识库专用组件和逻辑
```

### 共享模块依赖
```
shared/
├── file-system/ (无外部依赖，或只依赖基础库)
└── layout/ (无外部依赖，或只依赖基础库)
```

---

## 📝 代码示例

### 文件管理器页面示例

```vue
<!-- src/views/file-manager/index.vue -->
<script lang="tsx" setup>
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import FileExplorer from '@/components/file-explorer/FileExplorer';
import { useFileExplorerLogic } from '@/components/file-explorer/composables/useFileExplorerLogic';
import { mockFileItems } from '@/components/file-explorer/config/mockData';
import type { FileItem } from '@/components/file-explorer/types/file-explorer';

const containerRef = ref<HTMLElement | null>(null);
const message = useMessage();

// 文件预览和编辑状态（页面层管理）
const openedFile = ref<FileItem | null>(null);
const fileContent = ref<string | Blob | undefined>(undefined);
const showFileDrawer = ref(false);

// 业务逻辑
const logic = useFileExplorerLogic({
  initialItems: mockFileItems,
  containerRef,
  validateDrop: (items, targetPath) => {
    return logic.mockItems.value.find(it => it.path === targetPath)?.type === 'folder';
  }
});

// 页面级事件处理
const handleOpenFile = async (file: FileItem) => {
  if (file.type === 'folder') {
    logic.handleBreadcrumbNavigate(file.path);
    return;
  }

  try {
    openedFile.value = file;
    showFileDrawer.value = true;

    if (logic.dataSource.value) {
      fileContent.value = await logic.dataSource.value.readFile(file.path);
    } else {
      fileContent.value = '';
    }
  } catch (error: any) {
    message.error(`打开文件失败: ${error.message}`);
  }
};

onMounted(async () => {
  if (logic.dataSource.value) {
    await logic.refreshFileList();
  }
  containerRef.value?.focus();
});
</script>

<template>
  <div ref="containerRef" class="file-manager-page h-full">
    <FileExplorer
      :logic="logic"
      @open-file="handleOpenFile"
    />

    <!-- 文件预览抽屉（页面层管理） -->
    <NDrawer v-model:show="showFileDrawer" placement="right" width="80%">
      <NDrawerContent>
        <FilePreview
          v-if="openedFile"
          :file="openedFile"
          :content="fileContent"
        />
      </NDrawerContent>
    </NDrawer>
  </div>
</template>
```

### 知识库页面示例

```vue
<!-- src/views/knowledge-base/index.vue -->
<script lang="tsx" setup>
import { ref } from 'vue';
import KnowledgeBaseExplorer from '@/components/knowledge-base/KnowledgeBaseExplorer';
import { useKnowledgeBaseLogic } from '@/components/knowledge-base/composables/useKnowledgeBaseLogic';

const containerRef = ref<HTMLElement | null>(null);

// 知识库业务逻辑
const logic = useKnowledgeBaseLogic({
  containerRef
});
</script>

<template>
  <div ref="containerRef" class="knowledge-base-page h-full">
    <KnowledgeBaseExplorer :logic="logic" />
  </div>
</template>
```

---

## ✅ 重构检查清单

### Phase 1: 共享模块
- [ ] 创建 `shared/` 目录结构
- [ ] 提取 `FileIcon` 到共享模块
- [ ] 提取 `FilePreview` 到共享模块
- [ ] 提取 `FileEditor` 到共享模块
- [ ] 提取 `ResizableLayout` 到共享模块
- [ ] 提取共享工具函数
- [ ] 更新所有导入路径
- [ ] 测试文件管理器功能正常

### Phase 2: 文件管理器重构
- [ ] 清理 `FileExplorer.tsx`，移除页面逻辑
- [ ] 创建 `views/file-manager/index.vue` 页面
- [ ] 将页面级逻辑移到页面组件
- [ ] 调整 `FileExplorer` 组件接口
- [ ] 测试文件管理器功能正常

### Phase 3: 知识库模块
- [ ] 创建 `components/knowledge-base/` 目录
- [ ] 创建 `KnowledgeBaseExplorer` 组件
- [ ] 创建知识库相关 Hooks 和服务
- [ ] 创建 `views/knowledge-base/index.vue` 页面
- [ ] 复用共享组件
- [ ] 测试知识库功能

### Phase 4: 路由和菜单
- [ ] 添加知识库路由
- [ ] 更新导航菜单
- [ ] 测试路由跳转

---

## 🎯 优势总结

### 1. 职责清晰
- **页面层**: 负责路由、页面级状态、页面级事件处理
- **组件层**: 负责 UI 渲染、组件级交互
- **逻辑层**: 负责业务逻辑、数据管理
- **共享层**: 负责通用组件和工具

### 2. 易于维护
- 各模块独立，修改不影响其他模块
- 代码组织清晰，易于定位问题
- 测试更容易（可以单独测试组件和逻辑）

### 3. 易于扩展
- 添加新功能只需创建新模块
- 共享组件可以复用
- 不影响现有功能

### 4. 代码复用
- 文件管理器和知识库共享通用组件
- 减少重复代码
- 统一用户体验

---

## 📚 参考文档

- [RAG 知识库实施计划](./RAG_KNOWLEDGE_BASE_PLAN.md)
- [文件管理器架构文档](./ARCHITECTURE.md)
- [文件管理器 README](./README.md)

---

**文档版本**: v1.0
**创建日期**: 2025-01-XX
**维护者**: 开发团队

