# File Explorer 迁移指南

## 概述

本文档说明如何将 `file-explorer` 组件中的自定义交互组件迁移到通用的 `common-interaction` 组件库。

## 迁移对比

### 1. SelectionRect 组件

#### 旧实现
**位置**: `src/components/file-explorer/interaction/SelectionRect.tsx`

**特点**:
- 380 行代码
- 自定义类型定义（Point, Rect）
- 使用 `useThemeVars` 获取主题色
- 自定义滚动逻辑
- 自定义碰撞检测

**Props**:
```typescript
{
  disabled: boolean;
  className: string;
  rectStyle: CSSProperties;
  threshold: number;
  autoScroll: boolean;
  scrollSpeed: number;
  scrollEdge: number;
  scrollContainerSelector: string;
  selectableSelector: string;
  preventDragSelector: string;
  onSelectionStart?: () => void;
  onSelectionChange?: (ids: string[]) => void;
  onSelectionEnd?: (ids: string[]) => void;
}
```

#### 新实现
**位置**: `src/components/common-interaction/SelectionRect/SelectionRect.tsx`

**改进**:
- 361 行代码（更精简）
- 共享类型定义（types/index.ts）
- 独立的工具函数（geometry.ts, scroll.ts）
- 更强大的自定义能力（itemExtractor, validator）
- 统一的 API 设计

**Props**:
```typescript
{
  disabled: boolean;
  containerSelector: string;        // 改名
  selectableSelector: string;
  preventSelector: string;          // 改名
  threshold: number;
  autoScroll: boolean;
  scrollSpeed: number;
  scrollEdge: number;
  rectStyle: CSSProperties;
  rectClass: string;                // 新增
  useShiftKey: boolean;             // 新增
  itemExtractor?: Function;         // 新增
  validator?: Function;             // 新增
}
```

**事件**:
```typescript
{
  'selection-start': () => void;
  'selection-change': (params: SelectionCallbackParams) => void;
  'selection-end': (params: SelectionCallbackParams) => void;
}
```

#### 迁移步骤

1. **更新导入**:
```typescript
// 旧
import SelectionRect from '@/components/file-explorer/interaction/SelectionRect';

// 新
import { SelectionRect } from '@/components/common-interaction';
```

2. **更新 Props**:
```typescript
// 旧
<SelectionRect
  className="file-list-container"
  scrollContainerSelector=".file-list"
  preventDragSelector="data-prevent-selection"
  onSelectionChange={(ids) => handleSelection(ids)}
/>

// 新
<SelectionRect
  containerSelector=".file-list-container"
  selectableSelector="[data-selectable-id]"
  preventSelector="[data-prevent-selection]"
  onSelectionChange={(params) => handleSelection(params.selectedIds)}
/>
```

3. **更新事件处理**:
```typescript
// 旧
function handleSelectionChange(selectedIds: string[]) {
  // 处理选中项
}

// 新
function handleSelectionChange(params: SelectionCallbackParams) {
  const { selectedIds, selectedItems, selectionRect } = params;
  // 可以访问更多信息
}
```

---

### 2. DragPreview 组件

#### 旧实现
**位置**: `src/components/file-explorer/interaction/DragPreview.tsx`

**特点**:
- 241 行代码
- 使用 Naive UI 图标（@vicons/ionicons5）
- 文件类型特定的图标映射
- 固定的样式设计

**Props**:
```typescript
{
  items: FileItem[];
  isDragging: boolean;
  dragStartPos: { x: number; y: number } | null;
  dragCurrentPos: { x: number; y: number } | null;
  operation: 'move' | 'copy';
}
```

#### 新实现
**位置**: `src/components/common-interaction/DragPreview/DragPreview.tsx`

**改进**:
- 373 行代码（功能更丰富）
- 支持自定义图标解析器
- 支持自定义项渲染器
- 更灵活的配置选项
- 泛型支持

**Props**:
```typescript
{
  items: DragItem[];
  isDragging: boolean;
  dragStartPos: Point | null;
  dragCurrentPos: Point | null;
  operation: DragOperation;
  maxItems: number;                 // 新增
  offset: Point;                    // 新增
  showOperationIcon: boolean;       // 新增
  showCountBadge: boolean;          // 新增
  itemRenderer?: Function;          // 新增
  iconResolver?: Function;          // 新增
  previewStyle: CSSProperties;      // 新增
  teleportTo: string;               // 新增
}
```

#### 迁移步骤

1. **更新导入**:
```typescript
// 旧
import DragPreview from '@/components/file-explorer/interaction/DragPreview';

// 新
import { DragPreview } from '@/components/common-interaction';
import type { DragItem } from '@/components/common-interaction';
```

2. **转换数据类型**:
```typescript
// 旧
interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
}

// 新 - 使用适配器
function convertToDragItem(fileItem: FileItem): DragItem {
  return {
    id: fileItem.id,
    name: fileItem.name,
    type: fileItem.type,
    data: fileItem  // 保留原始数据
  };
}

const dragItems = selectedFiles.map(convertToDragItem);
```

3. **自定义图标解析器**（可选）:
```typescript
<DragPreview
  items={dragItems}
  isDragging={isDragging.value}
  dragStartPos={dragStartPos.value}
  dragCurrentPos={dragCurrentPos.value}
  operation={operation.value}
  iconResolver={(item) => {
    // 使用原有的图标逻辑
    const fileItem = item.data as FileItem;
    if (fileItem.type === 'folder') return 'material-symbols:folder';
    
    const ext = fileItem.extension?.toLowerCase();
    if (['jpg', 'png', 'gif'].includes(ext)) return 'material-symbols:image';
    if (['mp4', 'avi'].includes(ext)) return 'material-symbols:videocam';
    // ... 更多映射
    
    return 'material-symbols:description';
  }}
/>
```

---

### 3. DropZone 组件

#### 旧实现
**位置**: `src/components/file-explorer/interaction/DropZone.tsx`

**特点**:
- 358 行代码
- 文件上传特定的逻辑
- `asFolderZone` 特殊模式
- `targetPath` 概念
- 加载状态支持

**Props**:
```typescript
{
  zoneId: string;
  targetPath?: string;
  canDrop?: boolean;
  disabled?: boolean;
  loading?: boolean;
  asFolderZone?: boolean;
  hintText?: string;
  invalidHintText?: string;
}
```

**事件**:
```typescript
{
  drop: (zoneId: string, targetPath?: string) => void;
  dragEnter: (zoneId: string) => void;
  dragLeave: (zoneId: string) => void;
}
```

#### 新实现
**位置**: `src/components/common-interaction/DropZone/DropZone.tsx`

**改进**:
- 445 行代码（更通用）
- 类型验证系统
- 自定义验证器
- 更丰富的回调参数
- 无业务逻辑耦合

**Props**:
```typescript
{
  id: string;
  disabled: boolean;
  acceptTypes: string[];            // 新增
  validator?: DropValidator;        // 新增
  highlight: boolean;
  highlightStyle: CSSProperties;
  highlightClass: string;
  invalidStyle: CSSProperties;
  invalidClass: string;
  showHint: boolean;
  hintText: string;
  invalidHintText: string;
  dataExtractor?: Function;         // 新增
}
```

**事件**:
```typescript
{
  'drag-enter': (params: DropCallbackParams) => void;
  'drag-over': (params: DropCallbackParams) => void;   // 新增
  'drag-leave': (params: DropCallbackParams) => void;
  'drop': (params: DropCallbackParams) => void;
}
```

#### 迁移步骤

1. **更新导入**:
```typescript
// 旧
import DropZone from '@/components/file-explorer/interaction/DropZone';

// 新
import { DropZone } from '@/components/common-interaction';
import type { DropCallbackParams } from '@/components/common-interaction';
```

2. **更新 Props**:
```typescript
// 旧
<DropZone
  zoneId="upload-area"
  targetPath="/documents"
  :canDrop="canUpload"
  :disabled="uploading"
  :loading="loading"
  @drop="handleDrop"
/>

// 新
<DropZone
  id="upload-area"
  :disabled="uploading || !canUpload"
  acceptTypes={['file', 'folder']}
  hintText="拖放文件到此处"
  onDrop={(params) => handleDrop(params)}
>
  {loading && <LoadingSpinner />}
  <div>默认内容</div>
</DropZone>
```

3. **更新事件处理**:
```typescript
// 旧
function handleDrop(zoneId: string, targetPath?: string) {
  // 处理文件上传
  uploadFiles(targetPath);
}

// 新
function handleDrop(params: DropCallbackParams) {
  const { dropZoneId, items, canDrop, event } = params;
  
  if (!canDrop) return;
  
  // 从 event.dataTransfer 获取文件
  const files = Array.from(event.dataTransfer?.files || []);
  
  // 处理文件上传（targetPath 需要从其他地方获取）
  uploadFiles(targetPath, files);
}
```

4. **处理 `asFolderZone` 模式**:
```typescript
// 旧
<DropZone
  zoneId={folder.id}
  targetPath={folder.path}
  asFolderZone
  @drop="handleDropToFolder"
/>

// 新 - 使用 validator
<DropZone
  id={folder.id}
  acceptTypes={['file', 'folder']}
  validator={(item) => {
    // 自定义验证逻辑
    return canDropToFolder(item, folder);
  }}
  onDrop={(params) => handleDropToFolder(folder, params)}
/>
```

---

## 迁移检查清单

### SelectionRect
- [ ] 更新导入路径
- [ ] 更新 prop 名称（className → containerSelector, preventDragSelector → preventSelector）
- [ ] 更新事件处理器（接收 SelectionCallbackParams）
- [ ] 测试圈选功能
- [ ] 测试自动滚动
- [ ] 测试键盘交互

### DragPreview
- [ ] 更新导入路径
- [ ] 转换数据类型（FileItem → DragItem）
- [ ] 实现图标解析器（如需保留原有图标）
- [ ] 测试拖拽预览显示
- [ ] 测试操作类型切换
- [ ] 测试多项目预览

### DropZone
- [ ] 更新导入路径
- [ ] 更新 prop 名称（zoneId → id）
- [ ] 移除 `targetPath` 逻辑（在事件处理中管理）
- [ ] 移除 `loading` prop（使用插槽显示加载状态）
- [ ] 更新事件处理器（接收 DropCallbackParams）
- [ ] 实现自定义验证器（如需 asFolderZone 功能）
- [ ] 测试拖放功能
- [ ] 测试禁用状态
- [ ] 测试验证逻辑

---

## 性能对比

| 组件 | 旧代码行数 | 新代码行数 | 改进 |
|------|-----------|-----------|------|
| SelectionRect | 380 | 361 | -5% |
| DragPreview | 241 | 373 | +55%（功能更丰富） |
| DropZone | 358 | 445 | +24%（更通用） |
| **总计** | **979** | **1179** | **+20%** |

**注意**: 虽然新代码总行数增加了 20%，但考虑到：
1. 共享的工具函数（geometry.ts: 122 行, scroll.ts: 213 行）
2. 共享的类型定义（types/index.ts: 209 行）
3. 更强大的功能和可定制性

实际上减少了重复代码，提高了可维护性。

---

## 常见问题

### Q1: 如何保留原有的主题色？

**A**: 使用 `rectStyle` 或 `highlightStyle` prop：

```typescript
import { useThemeVars } from 'naive-ui';

const themeVars = useThemeVars();

<SelectionRect
  rectStyle={{
    backgroundColor: themeVars.value.primaryColorHover,
    border: `2px solid ${themeVars.value.primaryColor}`
  }}
/>
```

### Q2: 如何处理 `targetPath`？

**A**: 在组件外部管理，通过事件参数传递：

```typescript
const dropZones = ref([
  { id: 'zone-1', path: '/documents' },
  { id: 'zone-2', path: '/images' }
]);

function handleDrop(params: DropCallbackParams) {
  const zone = dropZones.value.find(z => z.id === params.dropZoneId);
  if (zone) {
    uploadFiles(zone.path, params.items);
  }
}
```

### Q3: 如何显示加载状态？

**A**: 使用插槽：

```typescript
<DropZone id="upload" onDrop={handleDrop}>
  {loading.value ? (
    <div class="loading-overlay">
      <NIcon size={32}><LoadingOutline /></NIcon>
      <div>上传中...</div>
    </div>
  ) : (
    <div class="default-content">
      拖放文件到此处
    </div>
  )}
</DropZone>
```

### Q4: 性能会受影响吗？

**A**: 不会。新组件使用了相同的优化技术：
- RAF 节流（60fps）
- 高效的事件处理
- 最小化 DOM 操作
- GPU 加速（transform）

---

## 下一步

完成迁移后：
1. 删除旧的组件文件
2. 更新相关的导入引用
3. 运行完整的测试套件
4. 更新文档

## 参考资源

- [通用组件 README](../README.md)
- [迁移计划](../MIGRATION_PLAN.md)
- [类型定义](../types/index.ts)
- [使用示例](../SelectionRect/example.tsx)

