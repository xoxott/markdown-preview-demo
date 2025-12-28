# 迁移进度跟踪

## 概述

本文档跟踪从旧的自定义交互组件迁移到新的通用交互组件库的进度。

---

## File Explorer 迁移

### 1. DragPreview 组件 ✅

**状态**: 已完成

**文件**: `src/components/file-explorer/FileExplorer.tsx`

**变更**:
- ✅ 更新导入：从 `./interaction/DragPreview` 改为 `@/components/common-interaction`
- ✅ 添加类型导入：`DragItem`
- ✅ 添加转换函数：`convertToDragItems()`
- ✅ 更新组件使用：转换 FileItem 为 DragItem
- ✅ 验证通过：无 linter 错误

**代码变更**:
```typescript
// 旧代码
import DragPreview from './interaction/DragPreview';

<DragPreview
  items={logic.dragDrop.dragState.value.draggedItems}
  isDragging={logic.dragDrop.isDragging.value}
  dragStartPos={logic.dragDrop.dragState.value.dragStartPos}
  dragCurrentPos={logic.dragDrop.dragState.value.dragCurrentPos}
  operation={logic.dragDrop.dragOperation.value}
/>

// 新代码
import { DragPreview } from '@/components/common-interaction';
import type { DragItem } from '@/components/common-interaction';

const convertToDragItems = (fileItems: FileItem[]): DragItem[] => {
  return fileItems.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    data: item
  }));
};

<DragPreview
  items={convertToDragItems(logic.dragDrop.dragState.value.draggedItems)}
  isDragging={logic.dragDrop.isDragging.value}
  dragStartPos={logic.dragDrop.dragState.value.dragStartPos}
  dragCurrentPos={logic.dragDrop.dragState.value.dragCurrentPos}
  operation={logic.dragDrop.dragOperation.value}
/>
```

**测试状态**: ✅ 已测试并修复

**后续修复**:
- ✅ 添加自定义 `itemRenderer` 以匹配旧样式
- ✅ 移除 transition 动画以消除卡顿
- ✅ 添加 `showRemainingCount` prop 控制剩余数量提示
- ✅ 禁用默认的操作图标和数量徽章
- ✅ 样式与旧版本完全一致，无卡顿

---

### 2. SelectionRect 组件 ⏭️

**状态**: 跳过迁移

**文件**: `src/components/file-explorer/container/ViewContainer.tsx`

**当前使用**: `NSelectionRect` (基于 Naive UI 的封装)

**决定**: 保持使用 NSelectionRect

**原因**:
- NSelectionRect 是专门为 NScrollbar 设计的，与 Naive UI 深度集成
- 具有特殊的 `onClearSelection` 回调和滚动容器处理逻辑
- 迁移成本高，收益低
- 不影响通用组件库的价值

**备注**: NSelectionRect 可以作为通用 SelectionRect 的一个特殊实现示例

---

### 3. DropZone 组件 ⏭️

**状态**: 跳过迁移

**相关文件**:
- `src/components/file-explorer/interaction/FileDropZoneWrapper.tsx`
- `src/components/file-explorer/interaction/DropZone.tsx`
- `src/components/file-explorer/views/GridView.tsx`
- `src/components/file-explorer/views/ContentView.tsx`
- `src/components/file-explorer/views/TileView.tsx`
- `src/components/file-explorer/views/ListView.tsx`

**决定**: 保持使用现有的 DropZone

**原因**:
- 旧的 DropZone 是专门为文件上传场景设计的，包含丰富的 UI 元素（图标、提示、加载状态）
- FileDropZoneWrapper 作为适配器，与 FileDragDropHook 深度集成
- 通用 DropZone 的设计理念更加抽象，不包含具体 UI
- 两者的使用场景和 API 设计差异较大
- 迁移成本高，且可能破坏现有功能

**备注**:
- 文件资源管理器的 DropZone 可以作为通用 DropZone 的一个具体应用示例
- 未来可以考虑将文件上传相关的 UI 逻辑提取为独立的组合式函数

---

### 4. 清理旧代码 ✅

**已删除文件**:
- ✅ `src/components/file-explorer/interaction/DragPreview.tsx`

**保留文件** (不迁移):
- ✅ `src/components/file-explorer/interaction/NSelectionRect.tsx` - 专为 NScrollbar 设计
- ✅ `src/components/file-explorer/interaction/DropZone.tsx` - 文件上传专用
- ✅ `src/components/file-explorer/interaction/FileDropZoneWrapper.tsx` - 适配器组件

---

## AI Workflow 集成分析

### 1. 节点圈选 ⏭️

**状态**: 不适用（已重新评估并确认）

**文件**:
- `src/components/ai-workflow/hooks/useSelectionBox.ts`
- `src/components/ai-workflow/canvas/WorkflowCanvas.tsx`
- `src/components/ai-workflow/docs/SELECTION_ANALYSIS.md` (详细分析文档)

**决定**: 保持现有实现

**原因**:

1. **坐标系差异**
   - 通用 SelectionRect: 使用屏幕坐标系
   - AI Workflow: 使用 Canvas 坐标系（需要 zoom 和 viewport 变换）

2. **变换复杂度**
   ```typescript
   // Canvas 节点的屏幕位置需要实时计算
   screenX = node.position.x * zoom + viewportX
   screenY = node.position.y * zoom + viewportY
   ```

3. **性能考虑**
   - 通用组件: 使用 DOM 查询 (`querySelectorAll`)
   - AI Workflow: 直接在内存数组中计算，避免 DOM 查询

4. **实时更新需求**
   - 圈选过程中用户可能同时缩放或平移画布
   - 需要实时更新圈选框和节点的相对位置

**现有实现**:
```typescript
// 使用 useSelectionBox hook
const { isSelecting, normalizedBox, startSelection, updateSelection, endSelection } = useSelectionBox();

// 坐标转换 + 碰撞检测
function isNodeInSelection(
  nodeX: number, nodeY: number,
  nodeWidth: number, nodeHeight: number,
  zoom: number, viewportX: number, viewportY: number
): boolean {
  const screenX = nodeX * zoom + viewportX;
  const screenY = nodeY * zoom + viewportY;
  // ... 碰撞检测
}

// 直接在 canvas 中渲染框选矩形
{isSelecting && normalizedBox && (
  <div class="absolute pointer-events-none" style={{...}} />
)}
```

**结论**: 这是**合理的代码重复**，因为两者解决的是不同领域的问题。详见 `SELECTION_ANALYSIS.md`。

---

### 2. 节点拖拽预览 ⏭️

**状态**: 不适用

**文件**:
- `src/components/ai-workflow/panels/NodeLibraryPanel.tsx`
- `src/components/ai-workflow/hooks/useNodeDragDrop.ts`

**决定**: 保持使用原生 HTML5 拖拽

**原因**:
- NodeLibraryPanel 使用原生 HTML5 拖拽 API (`draggable`, `onDragstart`)
- 浏览器提供的默认拖拽预览已经足够
- 节点拖拽是从面板到 canvas，不需要复杂的自定义预览
- 添加自定义预览会增加不必要的复杂度

**现有实现**:
```typescript
<div
  draggable
  onDragstart={(e: DragEvent) => handleDragStart(type, e)}
>
  {/* 节点内容 */}
</div>
```

---

### 3. 节点拖放区域 ⏭️

**状态**: 不适用

**文件**:
- `src/components/ai-workflow/canvas/WorkflowCanvas.tsx`
- `src/components/ai-workflow/hooks/useNodeDragDrop.ts`

**决定**: 保持现有实现

**原因**:
- 整个 canvas 就是一个拖放区域，使用原生 `onDrop`, `onDragover` 事件
- 拖放逻辑与 canvas 坐标转换、节点创建紧密耦合
- 不需要多个独立的拖放区域
- 通用 DropZone 设计用于多个独立的拖放目标，不适合单一 canvas 场景

**现有实现**:
```typescript
<div
  onDrop={canvas.handleCanvasDrop}
  onDragover={canvas.handleCanvasDragOver}
>
  {/* Canvas 内容 */}
</div>
```

---

## 进度统计

### File Explorer
```
DragPreview:    ████████████████████ 100% ✅ (已迁移并修复)
SelectionRect:  ████████████████████ 100% ⏭️ (跳过 - NScrollbar 专用)
DropZone:       ████████████████████ 100% ⏭️ (跳过 - 文件上传专用)
清理旧代码:      ████████████████████ 100% ✅ (已完成)

可迁移组件:     ████████████████████ 100% (1/1)
总体进度:       ████████████████████ 100% (4/4 已完成)
```

### AI Workflow
```
节点圈选:       ████████████████████ 100% ⏭️ (不适用 - Canvas 专用)
拖拽预览:       ████████████████████ 100% ⏭️ (不适用 - 原生 HTML5)
拖放区域:       ████████████████████ 100% ⏭️ (不适用 - Canvas 专用)

可集成组件:     ████████████████████ N/A (0/0)
总体进度:       ████████████████████ 100% (已分析完成)
```

### 整体进度
```
File Explorer:  ████████████████████ 100% ✅ (1 组件已迁移)
AI Workflow:    ████████████████████ 100% ✅ (已分析，无需迁移)

总进度:         ████████████████████ 100% ✅ 完成！
```

---

## 时间记录

| 任务 | 开始时间 | 完成时间 | 耗时 | 状态 |
|------|---------|---------|------|------|
| DragPreview 迁移 | 2024-12-28 | 2024-12-28 | ~15分钟 | ✅ 完成 |
| SelectionRect 分析 | 2024-12-28 | 2024-12-28 | ~5分钟 | ⏭️ 跳过 |
| DropZone 分析 | 2024-12-28 | 2024-12-28 | ~5分钟 | ⏭️ 跳过 |
| AI Workflow 分析 | 2024-12-28 | 2024-12-28 | ~10分钟 | ✅ 完成 |
| 清理旧代码 | 2024-12-28 | 2024-12-28 | ~2分钟 | ✅ 完成 |
| **总计** | - | - | **~37分钟** | **✅ 完成** |

---

## 问题和解决方案

### 问题 1: FileItem 与 DragItem 类型不兼容

**解决方案**: 创建转换函数 `convertToDragItems()` 将 FileItem 转换为 DragItem

```typescript
const convertToDragItems = (fileItems: FileItem[]): DragItem[] => {
  return fileItems.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    data: item  // 保留原始数据
  }));
};
```

### 问题 2: 样式与旧版本不一致

**现象**: 新的通用 DragPreview 样式较简单，缺少文件图标、扩展名等元素

**解决方案**: 使用自定义 `itemRenderer` 完全控制渲染

```typescript
const renderFileItem = (item: DragItem, index: number) => {
  if (index === 0) {
    // 自定义渲染，包含所有旧样式元素
    return (
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-2xl...">
        {/* 完整的自定义样式 */}
      </div>
    );
  }
  return <></>;
};

<DragPreview
  itemRenderer={renderFileItem}
  showOperationIcon={false}
  showCountBadge={false}
  showRemainingCount={false}
  maxItems={1}
/>
```

### 问题 3: 拖拽时有卡顿/延迟

**现象**: 拖拽预览跟随鼠标时有明显的延迟和卡顿

**原因**: 通用 DragPreview 的默认项渲染中有 `transition: 'all 0.2s'`

**解决方案**: 移除 transition 动画

```typescript
// DragPreview.tsx
const renderDefaultItem = (item: DragItem) => {
  return (
    <div style={{
      padding: '8px 16px',
      background: '#fff',
      // transition: 'all 0.2s', // ❌ 移除这行
      borderRadius: '8px',
      // ...
    }}>
      {item.name}
    </div>
  );
};
```

### 问题 4: 底部出现重复的"更多"提示

**现象**: 使用自定义渲染器后，底部仍显示默认的灰色透明"更多"按钮

**原因**: 通用 DragPreview 默认会渲染剩余数量提示

**解决方案**: 添加 `showRemainingCount` prop 控制

```typescript
// DragPreview.tsx - 添加新 prop
showRemainingCount: {
  type: Boolean,
  default: true
},

// 使用时禁用
<DragPreview
  showRemainingCount={false}
  // ...
/>
```

---

## 下一步行动

### ✅ 已完成
1. ✅ DragPreview 迁移到 File Explorer
2. ✅ 分析 SelectionRect 和 DropZone（决定保持现有实现）
3. ✅ 分析 AI Workflow 集成需求
4. ✅ 删除旧的 DragPreview 文件
5. ✅ 更新迁移文档

### 🎯 建议的后续工作
1. **功能测试**
   - [x] 测试 File Explorer 中的 DragPreview 功能
   - [x] 验证拖拽体验是否流畅
   - [x] 确认没有引入新的 bug
   - [x] 修复样式不一致问题
   - [x] 修复拖拽卡顿问题
   - [x] 修复重复"更多"提示问题

2. **文档完善**
   - [ ] 为通用组件编写使用指南
   - [ ] 添加更多示例代码
   - [ ] 创建最佳实践文档

3. **单元测试**
   - [ ] 为 SelectionRect 编写测试
   - [ ] 为 DragPreview 编写测试
   - [ ] 为 DropZone 编写测试

4. **性能优化**
   - [ ] 性能基准测试
   - [ ] 优化大量元素场景
   - [ ] 减少不必要的重渲染

5. **功能增强**
   - [ ] 添加触摸屏支持
   - [ ] 实现键盘快捷键
   - [ ] 改进无障碍访问

---

## 备注

- 所有迁移都应该保持向后兼容
- 每个组件迁移后都需要进行功能测试
- 确保用户体验不受影响

---

## 总结

### 🎉 迁移成果

1. **成功迁移**: 1 个组件
   - ✅ DragPreview (File Explorer)

2. **合理保留**: 5 个组件
   - ⏭️ NSelectionRect (专为 NScrollbar 设计)
   - ⏭️ DropZone (文件上传专用)
   - ⏭️ FileDropZoneWrapper (适配器)
   - ⏭️ AI Workflow 框选 (Canvas 专用)
   - ⏭️ AI Workflow 拖放 (Canvas 专用)

3. **清理完成**: 1 个文件
   - 🗑️ 旧的 DragPreview.tsx

### 📊 迁移决策

**迁移原则**:
- ✅ 通用性强、可复用的组件 → 迁移
- ⏭️ 特定场景、深度耦合的组件 → 保留
- 🎯 权衡迁移成本与收益

**关键发现**:
1. 通用交互组件库最适合 DOM 元素场景
2. Canvas 场景需要专门的实现
3. 与特定 UI 库（如 Naive UI）集成的组件不适合迁移
4. 文件上传等特定业务场景的组件应保持独立

### 🎓 经验教训

1. **不要过度抽象**: 并非所有相似的功能都需要统一
2. **保持灵活性**: 允许特定场景有专门的实现
3. **权衡利弊**: 迁移成本 vs 代码复用收益
4. **渐进式迁移**: 从最简单、收益最大的开始

---

**最后更新**: 2024-12-28
**当前状态**: 🎉 迁移完成
**完成度**: 100%

