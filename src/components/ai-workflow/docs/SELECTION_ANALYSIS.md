# AI Workflow 圈选功能分析

## 问题

能否使用通用的 `SelectionRect` 组件替代 AI Workflow 中的自定义圈选实现？

## 结论

**不能直接使用**，需要保持现有的自定义实现。

## 原因分析

### 1. 坐标系差异

#### 通用 SelectionRect
- 使用**屏幕坐标系**（Screen Coordinates）
- 圈选框的坐标直接对应浏览器窗口的像素位置
- 元素位置通过 `getBoundingClientRect()` 获取
- 适用于静态布局或简单滚动容器

#### AI Workflow Canvas
- 使用**Canvas 坐标系**（Canvas Coordinates）
- 节点位置经过复杂的变换：
  ```typescript
  // 节点的屏幕位置 = 节点Canvas坐标 * 缩放 + 视口偏移
  screenX = node.position.x * zoom + viewportX
  screenY = node.position.y * zoom + viewportY
  ```
- 支持缩放（zoom）和平移（pan）
- 需要实时的坐标转换

### 2. 变换复杂度

#### 通用 SelectionRect
```typescript
// 简单的矩形相交检测
function isElementInSelection(element: HTMLElement, selectionRect: Rect) {
  const elementRect = element.getBoundingClientRect();
  return isRectIntersect(elementRect, selectionRect);
}
```

#### AI Workflow
```typescript
// 需要考虑缩放和视口变换
function isNodeInSelection(
  nodeX: number,      // Canvas 坐标
  nodeY: number,
  nodeWidth: number,
  nodeHeight: number,
  zoom: number,       // 缩放比例
  viewportX: number,  // 视口偏移
  viewportY: number
): boolean {
  // 1. 将节点坐标转换为屏幕坐标
  const screenX = nodeX * zoom + viewportX;
  const screenY = nodeY * zoom + viewportY;
  const screenWidth = nodeWidth * zoom;
  const screenHeight = nodeHeight * zoom;

  // 2. 检查与圈选框的相交
  return isRectIntersect(screenRect, selectionRect);
}
```

### 3. 性能考虑

#### 通用 SelectionRect
- 使用 DOM 查询 (`querySelectorAll`)
- 每次圈选都需要遍历 DOM 树
- 适合元素数量较少的场景（< 100 个）

#### AI Workflow
- 直接在内存中的节点数组上计算
- 避免 DOM 查询开销
- 优化了大量节点的场景（可支持 1000+ 节点）

### 4. 实时更新需求

#### 通用 SelectionRect
- 圈选过程中，元素位置通常是静态的
- 不需要考虑坐标系变化

#### AI Workflow
- 圈选过程中，用户可能同时进行缩放或平移
- 需要实时更新圈选框和节点的相对位置
- 圈选框在屏幕坐标系中，节点在 Canvas 坐标系中

## 代码对比

### 通用 SelectionRect 的使用方式

```tsx
<SelectionRect
  containerSelector=".container"
  selectableSelector="[data-selectable-id]"
  onSelection-end={(params) => {
    console.log('Selected IDs:', params.selectedIds);
  }}
>
  <div class="container">
    <div data-selectable-id="1">Item 1</div>
    <div data-selectable-id="2">Item 2</div>
  </div>
</SelectionRect>
```

**适用场景**：
- 文件管理器的文件选择
- 图片库的图片多选
- 表格的行多选
- 任何静态或简单滚动的 DOM 元素

### AI Workflow 的自定义实现

```tsx
// useSelectionBox.ts
export function useSelectionBox() {
  const selectionBox = ref<SelectionBox | null>(null);

  function isNodeInSelection(
    nodeX: number,
    nodeY: number,
    nodeWidth: number,
    nodeHeight: number,
    zoom: number,
    viewportX: number,
    viewportY: number
  ): boolean {
    // 坐标转换 + 碰撞检测
    const screenX = nodeX * zoom + viewportX;
    const screenY = nodeY * zoom + viewportY;
    // ...
  }

  return { isNodeInSelection, /* ... */ };
}

// WorkflowCanvas.tsx
{isSelecting && normalizedBox && (
  <div class="selection-rect" style={{
    left: `${normalizedBox.left}px`,
    top: `${normalizedBox.top}px`,
    width: `${normalizedBox.width}px`,
    height: `${normalizedBox.height}px`
  }} />
)}
```

**适用场景**：
- Canvas 画布应用
- 图形编辑器
- 流程图/工作流编辑器
- 任何需要缩放和平移的可视化应用

## 可能的解决方案（未采用）

### 方案 1：适配器模式
创建一个适配器，将 Canvas 节点"虚拟化"为 DOM 元素：

```typescript
function useCanvasSelectionAdapter() {
  // 为每个节点创建虚拟的 DOM 元素
  // 实时同步位置和尺寸
  // 转发圈选事件
}
```

**问题**：
- 增加了复杂度
- 性能开销大（需要维护虚拟 DOM）
- 不能处理实时的缩放和平移

### 方案 2：扩展通用组件
为 `SelectionRect` 添加坐标转换支持：

```typescript
<SelectionRect
  coordinateTransform={(screenX, screenY) => {
    return {
      x: (screenX - viewportX) / zoom,
      y: (screenY - viewportY) / zoom
    };
  }}
/>
```

**问题**：
- 破坏了通用组件的简洁性
- 增加了组件的复杂度
- 不是所有场景都需要这个功能

## 最佳实践

### 何时使用通用 SelectionRect

✅ **适合使用**：
- DOM 元素的圈选
- 静态布局或简单滚动
- 元素数量 < 100
- 不需要缩放和平移

### 何时使用自定义实现

✅ **适合使用**：
- Canvas 画布应用
- 需要缩放和平移
- 大量元素（> 100）
- 复杂的坐标变换
- 高性能要求

## 总结

AI Workflow 的圈选功能虽然看起来和通用 `SelectionRect` 相似，但由于以下核心差异，必须保持独立实现：

1. **坐标系不同**：屏幕坐标 vs Canvas 坐标
2. **变换复杂**：需要处理 zoom 和 viewport
3. **性能要求**：避免 DOM 查询，直接计算
4. **实时更新**：圈选过程中坐标系可能变化

这是一个**合理的代码重复**，因为两者解决的是不同领域的问题：
- `SelectionRect`：DOM 元素圈选
- `useSelectionBox`：Canvas 节点圈选

保持两者独立，符合**单一职责原则**和**关注点分离**原则。

---

**文档编写日期**: 2024-12-28
**作者**: AI Assistant
**状态**: ✅ 已确认

