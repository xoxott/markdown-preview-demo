# 通用交互组件

提供可复用的 UI 交互组件，用于拖拽、圈选、拖放等常见交互场景。

## 组件列表

### 1. SelectionRect（圈选框）

用于鼠标拖拽框选元素的交互组件。

**功能特性**：
- ✅ 鼠标拖拽框选
- ✅ 自动滚动支持
- ✅ 阈值控制（避免误触）
- ✅ 实时选中回调
- ✅ 多选支持
- ✅ 性能优化（节流）

**使用场景**：
- 文件管理器的多选
- 工作流画布的节点多选
- 图片库的批量选择
- 表格的行多选

**示例**：
```vue
<SelectionRect
  :disabled="false"
  :threshold="5"
  :auto-scroll="true"
  scroll-container-selector=".container"
  selectable-selector="[data-selectable-id]"
  @selection-start="handleStart"
  @selection-change="handleChange"
  @selection-end="handleEnd"
>
  <div class="container">
    <div data-selectable-id="1">Item 1</div>
    <div data-selectable-id="2">Item 2</div>
  </div>
</SelectionRect>
```

### 2. DragPreview（拖拽预览）

拖拽操作时跟随鼠标的预览组件。

**功能特性**：
- ✅ 跟随鼠标位置
- ✅ 显示拖拽项数量
- ✅ 支持图标/缩略图
- ✅ 操作类型提示（移动/复制）
- ✅ 平滑动画效果
- ✅ Teleport 到 body

**使用场景**：
- 文件拖拽预览
- 节点拖拽预览
- 列表项拖拽排序
- 卡片拖拽移动

**示例**：
```vue
<DragPreview
  :items="draggedItems"
  :is-dragging="isDragging"
  :drag-start-pos="startPos"
  :drag-current-pos="currentPos"
  :operation="operation"
/>
```

### 3. DropZone（拖放区域）

接收拖放操作的目标区域组件。

**功能特性**：
- ✅ 拖放目标高亮
- ✅ 拖放验证
- ✅ 嵌套拖放支持
- ✅ 拖放反馈动画
- ✅ 自定义拖放样式
- ✅ 文件/数据拖放

**使用场景**：
- 文件上传区域
- 文件夹拖放
- 节点连接拖放
- 列表项排序

**示例**：
```vue
<DropZone
  :accept-types="['file', 'folder']"
  :disabled="false"
  @drop="handleDrop"
  @drag-enter="handleEnter"
  @drag-leave="handleLeave"
>
  <div class="drop-target">
    Drop files here
  </div>
</DropZone>
```

## 设计原则

### 1. 通用性优先
- 组件设计面向多种使用场景
- 提供灵活的配置选项
- 最小化业务逻辑耦合

### 2. 性能优化
- 使用 RAF 节流
- 避免不必要的 DOM 操作
- 优化事件监听器

### 3. 可访问性
- 支持键盘操作
- 提供 ARIA 属性
- 屏幕阅读器友好

### 4. 类型安全
- 完整的 TypeScript 类型定义
- 泛型支持
- 严格的 props 验证

## 架构设计

```
common-interaction/
├── README.md                 # 文档
├── types/
│   └── index.ts             # 公共类型定义
├── utils/
│   ├── geometry.ts          # 几何计算工具
│   ├── scroll.ts            # 滚动相关工具
│   └── dom.ts               # DOM 操作工具
├── SelectionRect/
│   ├── SelectionRect.tsx    # 圈选框组件
│   ├── types.ts             # 组件类型
│   └── utils.ts             # 组件工具函数
├── DragPreview/
│   ├── DragPreview.tsx      # 拖拽预览组件
│   ├── types.ts             # 组件类型
│   └── icons.ts             # 图标映射
└── DropZone/
    ├── DropZone.tsx         # 拖放区域组件
    ├── types.ts             # 组件类型
    └── validators.ts        # 拖放验证器
```

## 迁移指南

### 从 file-explorer 迁移

**旧代码**：
```typescript
import SelectionRect from '@/components/file-explorer/interaction/SelectionRect';
```

**新代码**：
```typescript
import { SelectionRect } from '@/components/common-interaction';
```

### 从 ai-workflow 迁移

工作流画布的圈选功能可以直接使用通用组件：

**旧代码**：
```typescript
// 自定义实现的圈选逻辑
const { selectionBox, startSelection } = useSelectionBox();
```

**新代码**：
```typescript
import { SelectionRect } from '@/components/common-interaction';

<SelectionRect
  selectable-selector="[data-node-id]"
  @selection-change="handleNodesSelection"
/>
```

## 最佳实践

### 1. 性能优化

```typescript
// ✅ 使用节流避免频繁更新
<SelectionRect
  :threshold="5"
  @selection-change="throttledHandler"
/>

// ❌ 避免在回调中执行重操作
@selection-change="items => {
  // 不要在这里做复杂计算
  heavyComputation(items);
}"
```

### 2. 内存管理

```typescript
// ✅ 组件卸载时清理
onUnmounted(() => {
  // SelectionRect 会自动清理事件监听器
});

// ✅ 使用 v-if 控制组件挂载
<SelectionRect v-if="enableSelection" />
```

### 3. 样式定制

```typescript
// ✅ 使用 CSS 变量
<SelectionRect
  :rect-style="{
    '--selection-bg': 'rgba(33, 150, 243, 0.1)',
    '--selection-border': '2px solid #2196f3'
  }"
/>
```

## 样式管理

所有通用交互组件的样式已集中在 `@/styles/common-interaction.scss` 中。

### 自动导入

各组件会自动导入所需样式，无需手动引入：

```typescript
// ✅ 组件内部已自动导入
import '@/styles/common-interaction.scss';
```

### 样式覆盖

如需自定义样式，可以通过以下方式：

```scss
// 在你的样式文件中
.drag-preview {
  // 覆盖默认样式
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.selection-rect {
  border-color: #ff4d4f;
  background-color: rgba(255, 77, 79, 0.1);
}
```

### 样式架构

- ✅ 外部样式文件（`common-interaction.scss`）
- ❌ 不使用内联 `<style>` 标签
- ✅ 支持 CSS 变量和主题定制
- ✅ 遵循 BEM 命名规范

## 兼容性

- Vue 3.3+
- TypeScript 5.0+
- 现代浏览器（Chrome 90+, Firefox 88+, Safari 14+）

## 贡献指南

添加新的交互组件时，请遵循以下步骤：

1. 在对应目录创建组件文件
2. 定义清晰的 TypeScript 类型
3. 编写组件文档和示例
4. 添加单元测试
5. 更新本 README

## 参考资源

- [Vue 3 文档](https://vuejs.org/)
- [VueUse](https://vueuse.org/)
- [HTML5 拖放 API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)

