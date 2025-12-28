# 更新日志

## [0.1.1] - 2024-12-28

### 修复
- 🐛 **样式管理重构** - 移除内联 `<style>` 标签，改用外部样式文件
  - 创建 `@/styles/common-interaction.scss` 集中管理所有样式
  - 在 `DragPreview`、`SelectionRect`、`DropZone` 中自动导入样式
  - 符合项目样式管理规范
  - 更好的样式复用和维护性

### 改进
- 📝 更新 README 文档，添加样式管理章节
- 📝 说明样式架构和自定义方法

## [0.1.0] - 2024-12-28

### 新增

#### 基础设施
- ✅ 创建 `common-interaction` 组件库
- ✅ 定义公共类型系统 (`types/index.ts`)
- ✅ 实现几何计算工具 (`utils/geometry.ts`)
- ✅ 实现滚动相关工具 (`utils/scroll.ts`)

#### 组件
- ✅ **SelectionRect** - 通用圈选框组件
  - 支持鼠标拖拽框选
  - 自动滚动功能
  - 阈值控制（防止误触）
  - 性能优化（RAF 节流）
  - 自定义样式和类名
  - 自定义数据提取器
  - 自定义验证器
  - Shift 键多选模式

- ✅ **DragPreview** - 拖拽预览组件
  - 跟随鼠标的预览卡片
  - 多项目预览（可配置最大数量）
  - 操作类型提示（移动/复制/链接）
  - 数量徽章显示
  - 自定义项渲染器
  - 自定义图标解析器
  - Teleport 支持
  - 平滑过渡动画

- ✅ **DropZone** - 拖放目标组件
  - 拖放目标区域
  - 类型验证（acceptTypes）
  - 自定义验证器
  - 高亮显示（有效/无效状态）
  - 提示文本显示
  - 自定义样式和类名
  - 拖放事件回调
  - 嵌套元素处理

#### 文档
- ✅ README.md - 组件库概览和使用指南
- ✅ MIGRATION_PLAN.md - 详细的迁移计划
- ✅ WORKFLOW_INTEGRATION.md - AI Workflow 集成指南
- ✅ SelectionRect/example.tsx - 使用示例

### 功能特性

#### SelectionRect 组件

**核心功能**:
- 鼠标拖拽创建选区
- 实时计算选中元素
- 支持自动滚动
- 阈值控制避免误触

**配置选项**:
```typescript
interface SelectionRectProps {
  disabled?: boolean;              // 禁用圈选
  containerSelector: string;       // 容器选择器
  selectableSelector: string;      // 可选元素选择器
  preventSelector?: string;        // 阻止圈选的元素
  threshold?: number;              // 触发阈值（默认 5px）
  autoScroll?: boolean;            // 自动滚动（默认 true）
  scrollSpeed?: number;            // 滚动速度（默认 10）
  scrollEdge?: number;             // 触发边距（默认 50px）
  rectStyle?: CSSProperties;       // 自定义样式
  rectClass?: string;              // 自定义类名
  useShiftKey?: boolean;           // Shift 键模式
  itemExtractor?: Function;        // 数据提取器
  validator?: Function;            // 验证器
}
```

**事件**:
- `selection-start` - 开始圈选
- `selection-change` - 选区变化
- `selection-end` - 结束圈选

**性能优化**:
- RAF 节流（16ms，~60fps）
- 高效的碰撞检测算法
- 最小化 DOM 操作
- 智能自动滚动

### 工具函数

#### 几何计算 (`utils/geometry.ts`)
- `distance()` - 计算两点距离
- `createRectFromPoints()` - 创建矩形
- `isRectIntersect()` - 矩形相交判断
- `isPointInRect()` - 点在矩形内判断
- `getRectCenter()` - 获取矩形中心
- `expandRect()` - 扩展矩形
- `clampPointToRect()` - 限制点在矩形内
- `getIntersectionRect()` - 计算矩形交集
- `isRectContains()` - 矩形包含判断

#### 滚动工具 (`utils/scroll.ts`)
- `getScrollContainer()` - 查找滚动容器
- `getAutoScrollDirection()` - 判断滚动方向
- `performAutoScroll()` - 执行自动滚动
- `smoothScrollTo()` - 平滑滚动
- `getElementOffsetInContainer()` - 获取元素偏移
- `isElementInViewport()` - 判断元素可见性
- `scrollIntoViewIfNeeded()` - 滚动到可视区域

### 类型定义

#### 基础类型
- `Point` - 坐标点
- `Rect` - 矩形区域
- `Size` - 尺寸

#### 圈选类型
- `SelectionState` - 圈选状态
- `SelectableItem<T>` - 可选元素
- `SelectionCallbackParams<T>` - 回调参数

#### 拖拽类型
- `DragState` - 拖拽状态
- `DragItem<T>` - 拖拽项
- `DragOperation` - 操作类型
- `DragPreviewConfig` - 预览配置

#### 拖放类型
- `DropTargetState` - 拖放目标状态
- `DropValidator<T>` - 验证器
- `DropCallbackParams<T>` - 回调参数

### 使用示例

#### 基础用法

```vue
<SelectionRect
  container-selector=".container"
  selectable-selector="[data-selectable-id]"
  @selection-change="handleSelection"
>
  <div class="container">
    <div data-selectable-id="1">Item 1</div>
    <div data-selectable-id="2">Item 2</div>
  </div>
</SelectionRect>
```

#### 高级用法

```vue
<SelectionRect
  container-selector=".workflow-canvas"
  selectable-selector="[data-node-id]"
  prevent-selector="[data-prevent-selection]"
  :threshold="5"
  :auto-scroll="true"
  :scroll-speed="15"
  :scroll-edge="50"
  :rect-style="{
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
    border: '2px dashed #2196f3'
  }"
  :item-extractor="(el) => nodes.find(n => n.id === el.dataset.nodeId)"
  :validator="(item) => !item.data?.locked"
  @selection-change="handleNodesSelection"
/>
```

### 迁移指南

#### 从 file-explorer 迁移

```typescript
// 旧代码
import SelectionRect from '@/components/file-explorer/interaction/SelectionRect';

// 新代码
import { SelectionRect } from '@/components/common-interaction';
```

#### 从 ai-workflow 迁移

```typescript
// 旧代码
const { selectionBox, startSelection } = useSelectionBox();

// 新代码
import { SelectionRect } from '@/components/common-interaction';

<SelectionRect
  container-selector=".workflow-canvas"
  selectable-selector="[data-node-id]"
  @selection-change="handleNodesSelection"
/>
```

### 已知问题

- [ ] 暂无

### 计划功能

#### 短期（v0.2.0）
- [x] DragPreview 组件 ✅
- [x] DropZone 组件 ✅
- [ ] 单元测试
- [ ] 迁移 file-explorer
- [ ] 迁移 ai-workflow

#### 中期（v0.3.0）
- [ ] 触摸屏支持
- [ ] 键盘快捷键
- [ ] 可访问性改进

#### 长期（v1.0.0）
- [ ] 完整的文档站点
- [ ] 更多交互组件
- [ ] 性能监控工具

### 贡献者

- 初始实现和文档

### 参考资源

- [Vue 3 文档](https://vuejs.org/)
- [VueUse](https://vueuse.org/)
- [HTML5 拖放 API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)

---

## 版本说明

- **0.1.0** - 初始版本，包含 SelectionRect 组件和基础工具函数
- **0.2.0** - 计划添加 DragPreview 和 DropZone 组件
- **1.0.0** - 正式版本，完整的功能和文档

