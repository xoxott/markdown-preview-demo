# 在 AI Workflow 中集成 SelectionRect

## 概述

本文档说明如何在 AI Workflow 画布中使用通用的 SelectionRect 组件替代自定义的圈选逻辑。

## 当前实现

### 旧代码（自定义实现）

**位置**: `src/components/ai-workflow/hooks/useSelectionBox.ts`

```typescript
export function useSelectionBox() {
  const selectionBox = ref<SelectionBox | null>(null);
  const isSelecting = ref(false);

  function startSelection(e: MouseEvent) {
    // 自定义圈选逻辑
    selectionBox.value = {
      startX: e.clientX,
      startY: e.clientY,
      endX: e.clientX,
      endY: e.clientY
    };
    isSelecting.value = true;
  }

  // ... 更多自定义逻辑
}
```

**使用方式**:
```typescript
const { selectionBox, startSelection } = useSelectionBox();

// 在模板中手动渲染选区
<div v-if="selectionBox" class="selection-box" :style="selectionBoxStyle" />
```

## 新实现（使用 SelectionRect）

### 步骤 1：导入组件

```typescript
import { SelectionRect } from '@/components/common-interaction';
import type { SelectionCallbackParams } from '@/components/common-interaction';
```

### 步骤 2：在 WorkflowCanvas 中使用

**文件**: `src/components/ai-workflow/canvas/WorkflowCanvas.tsx`

```typescript
export default defineComponent({
  name: 'WorkflowCanvas',
  setup() {
    const selectedNodeIds = ref<string[]>([]);

    // 圈选回调
    function handleNodesSelection(params: SelectionCallbackParams) {
      // 更新选中的节点
      selectedNodeIds.value = params.selectedIds;
      
      // 通知父组件
      emit('nodes-selected', params.selectedIds);
    }

    return () => (
      <div class="workflow-canvas-container">
        <SelectionRect
          container-selector=".workflow-canvas"
          selectable-selector="[data-node-id]"
          prevent-selector="[data-prevent-selection]"
          threshold={5}
          auto-scroll={true}
          scroll-speed={15}
          scroll-edge={50}
          use-shift-key={false}
          rect-style={{
            backgroundColor: 'rgba(33, 150, 243, 0.08)',
            border: '2px dashed #2196f3'
          }}
          onSelectionChange={handleNodesSelection}
        >
          <div class="workflow-canvas">
            {/* 节点渲染 */}
            {nodes.value.map(node => (
              <div
                key={node.id}
                data-node-id={node.id}
                class={[
                  'workflow-node',
                  selectedNodeIds.value.includes(node.id) && 'selected'
                ]}
                style={{
                  transform: `translate(${node.position.x}px, ${node.position.y}px)`
                }}
              >
                {/* 节点内容 */}
              </div>
            ))}

            {/* 连接线等其他元素 */}
          </div>
        </SelectionRect>
      </div>
    );
  }
});
```

### 步骤 3：添加数据属性

确保节点元素有 `data-node-id` 属性：

```typescript
// 在节点渲染时添加
<div
  data-node-id={node.id}
  class="workflow-node"
>
  {/* ... */}
</div>
```

### 步骤 4：阻止特定元素触发圈选

对于端口、按钮等交互元素，添加 `data-prevent-selection` 属性：

```typescript
// 端口
<div
  class="node-port"
  data-prevent-selection
  onMousedown={handlePortMouseDown}
>
  {/* ... */}
</div>

// 删除按钮
<button
  data-prevent-selection
  onClick={handleDelete}
>
  Delete
</button>
```

## 高级用法

### 1. 自定义数据提取

如果需要在选中时获取节点的完整数据：

```typescript
<SelectionRect
  item-extractor={(element) => {
    const nodeId = element.dataset.nodeId;
    return nodes.value.find(n => n.id === nodeId);
  }}
  onSelectionChange={(params) => {
    // params.selectedItems 包含完整的节点数据
    const selectedNodes = params.selectedItems.map(item => item.data);
    console.log('Selected nodes:', selectedNodes);
  }}
/>
```

### 2. 自定义验证器

只允许选择特定类型的节点：

```typescript
<SelectionRect
  validator={(item) => {
    const node = nodes.value.find(n => n.id === item.id);
    // 只允许选择未锁定的节点
    return node && !node.locked;
  }}
/>
```

### 3. 结合键盘快捷键

```typescript
import { useEventListener } from '@vueuse/core';

// 全选
useEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
    e.preventDefault();
    selectedNodeIds.value = nodes.value.map(n => n.id);
  }
});

// 取消选择
useEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    selectedNodeIds.value = [];
  }
});
```

### 4. 画布坐标转换

如果画布有缩放和平移，需要考虑坐标转换：

```typescript
// 方案 1：在容器上应用 transform
<div
  class="workflow-canvas"
  style={{
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
  }}
>
  {/* SelectionRect 会自动处理 */}
</div>

// 方案 2：自定义坐标转换
<SelectionRect
  item-extractor={(element) => {
    const nodeId = element.dataset.nodeId;
    const node = nodes.value.find(n => n.id === nodeId);
    
    // 转换坐标
    const screenPos = {
      x: node.position.x * viewport.zoom + viewport.x,
      y: node.position.y * viewport.zoom + viewport.y
    };
    
    return { ...node, screenPos };
  }}
/>
```

## 性能优化

### 1. 大量节点场景

当画布有大量节点时，使用虚拟滚动或只对可见节点添加 `data-node-id`：

```typescript
const visibleNodes = computed(() => {
  return nodes.value.filter(node => {
    // 只渲染可视区域内的节点
    return isNodeInViewport(node, viewport);
  });
});
```

### 2. 节流优化

SelectionRect 已内置节流（16ms），但可以根据需要调整：

```typescript
// 如果性能仍有问题，可以增加节流时间
// 修改 SelectionRect.tsx 中的 useThrottleFn 参数
const handleMouseMove = useThrottleFn((e: MouseEvent) => {
  // ...
}, 32); // 改为 32ms (~30fps)
```

## 迁移检查清单

- [ ] 导入 SelectionRect 组件
- [ ] 移除旧的 useSelectionBox hook
- [ ] 为节点添加 `data-node-id` 属性
- [ ] 为交互元素添加 `data-prevent-selection` 属性
- [ ] 实现 `onSelectionChange` 回调
- [ ] 测试圈选功能
- [ ] 测试与其他交互的兼容性（拖拽、连接等）
- [ ] 测试键盘快捷键
- [ ] 性能测试（大量节点场景）
- [ ] 清理旧代码

## 常见问题

### Q1: 圈选时节点拖拽也被触发了？

**A**: 为节点添加 `data-prevent-selection` 或使用 `use-shift-key` prop：

```typescript
<SelectionRect use-shift-key={true} />
// 这样只有按住 Shift 键时才会触发圈选
```

### Q2: 圈选区域不准确？

**A**: 检查容器的 `position` 样式，确保是 `relative` 或 `absolute`：

```css
.workflow-canvas {
  position: relative;
}
```

### Q3: 自动滚动不工作？

**A**: 确保滚动容器有明确的 `overflow` 样式：

```css
.workflow-canvas-container {
  overflow: auto;
  height: 100vh;
}
```

### Q4: 如何与现有的选择逻辑集成？

**A**: 使用 `onSelectionChange` 更新现有的状态：

```typescript
const canvas = useWorkflowCanvas();

<SelectionRect
  onSelectionChange={(params) => {
    // 更新现有的选择状态
    canvas.setSelectedNodes(params.selectedIds);
  }}
/>
```

## 示例代码

完整的集成示例请参考：
- `src/components/common-interaction/SelectionRect/example.tsx`
- `src/components/ai-workflow/canvas/WorkflowCanvas.tsx` (迁移后)

## 反馈和改进

如果在使用过程中遇到问题或有改进建议，请：
1. 查看 [常见问题](#常见问题)
2. 查看 [MIGRATION_PLAN.md](../MIGRATION_PLAN.md)
3. 提交 Issue 或 PR

