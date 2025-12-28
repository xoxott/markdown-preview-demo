# 交互组件抽离迁移计划

## 目标

将 `file-explorer` 和 `ai-workflow` 中重复的交互组件抽离为公共组件，减少代码重复，提高可维护性。

## 当前状态

### file-explorer 中的交互组件

**位置**: `src/components/file-explorer/interaction/`

1. **SelectionRect.tsx** (380 行)
   - 功能：鼠标框选
   - 特性：自动滚动、阈值控制、节流优化
   - 使用场景：文件/文件夹多选

2. **NSelectionRect.tsx** (593 行)
   - 功能：增强版框选（支持更多配置）
   - 特性：更灵活的配置、更好的性能
   - 使用场景：复杂的多选场景

3. **DragPreview.tsx** (241 行)
   - 功能：拖拽预览
   - 特性：跟随鼠标、显示数量、操作提示
   - 使用场景：文件拖拽

4. **DropZone.tsx** (358 行)
   - 功能：拖放目标区域
   - 特性：高亮反馈、验证、嵌套支持
   - 使用场景：文件夹拖放

5. **FileDropZoneWrapper.tsx** (78 行)
   - 功能：文件拖放包装器
   - 特性：文件上传、拖放验证
   - 使用场景：文件上传区域

### ai-workflow 中的交互功能

**位置**: `src/components/ai-workflow/hooks/`

1. **useSelectionBox.ts**
   - 功能：节点框选逻辑
   - 特性：画布坐标转换、节点选择
   - 使用场景：工作流节点多选

2. **useNodeDragDrop.ts**
   - 功能：节点拖拽逻辑
   - 特性：节点移动、网格吸附
   - 使用场景：工作流节点拖拽

## 抽离策略

### 阶段 1：基础设施（已完成）

- [x] 创建 `common-interaction` 目录
- [x] 定义公共类型 (`types/index.ts`)
- [x] 实现几何计算工具 (`utils/geometry.ts`)
- [x] 实现滚动工具 (`utils/scroll.ts`)
- [x] 编写 README 文档

### 阶段 2：组件抽离（待实施）

#### 2.1 SelectionRect 组件

**优先级**: 高

**步骤**:
1. 分析 `file-explorer/SelectionRect.tsx` 和 `NSelectionRect.tsx`
2. 提取通用功能，保留业务特定逻辑在原组件
3. 创建 `common-interaction/SelectionRect/`
4. 实现通用的 SelectionRect 组件
5. 编写单元测试
6. 更新文档和示例

**设计要点**:
```typescript
// 通用接口
interface SelectionRectProps<T = any> {
  // 基础配置
  disabled?: boolean;
  threshold?: number;
  
  // 容器配置
  containerSelector: string;
  selectableSelector: string;
  
  // 自动滚动
  autoScroll?: boolean;
  scrollSpeed?: number;
  scrollEdge?: number;
  
  // 回调
  onSelectionStart?: () => void;
  onSelectionChange?: (items: SelectableItem<T>[]) => void;
  onSelectionEnd?: (items: SelectableItem<T>[]) => void;
  
  // 自定义
  itemExtractor?: (element: HTMLElement) => T;
  validator?: (item: SelectableItem<T>) => boolean;
}
```

#### 2.2 DragPreview 组件

**优先级**: 中

**步骤**:
1. 分析 `file-explorer/DragPreview.tsx`
2. 抽象拖拽项类型，支持泛型
3. 创建 `common-interaction/DragPreview/`
4. 实现通用的 DragPreview 组件
5. 支持自定义渲染器
6. 编写单元测试

**设计要点**:
```typescript
interface DragPreviewProps<T = any> {
  // 拖拽数据
  items: DragItem<T>[];
  isDragging: boolean;
  startPos: Point | null;
  currentPos: Point | null;
  operation: DragOperation;
  
  // 显示配置
  maxItems?: number;
  showOperationIcon?: boolean;
  showCountBadge?: boolean;
  
  // 自定义渲染
  itemRenderer?: (item: DragItem<T>) => VNode;
  iconResolver?: (item: DragItem<T>) => string;
}
```

#### 2.3 DropZone 组件

**优先级**: 中

**步骤**:
1. 分析 `file-explorer/DropZone.tsx`
2. 抽象拖放验证逻辑
3. 创建 `common-interaction/DropZone/`
4. 实现通用的 DropZone 组件
5. 支持嵌套拖放
6. 编写单元测试

**设计要点**:
```typescript
interface DropZoneProps<T = any> {
  // 拖放配置
  acceptTypes?: string[];
  disabled?: boolean;
  
  // 验证器
  validator?: DropValidator<T>;
  
  // 回调
  onDrop?: (params: DropCallbackParams<T>) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDragOver?: (operation: DragOperation) => void;
  
  // 样式
  activeClass?: string;
  canDropClass?: string;
  cannotDropClass?: string;
}
```

### 阶段 3：迁移现有代码（待实施）

#### 3.1 迁移 file-explorer

**文件**:
- `src/components/file-explorer/interaction/SelectionRect.tsx`
- `src/components/file-explorer/interaction/DragPreview.tsx`
- `src/components/file-explorer/interaction/DropZone.tsx`

**步骤**:
1. 更新导入语句
2. 调整 props 传递
3. 保留业务特定逻辑（如文件类型判断）
4. 测试功能完整性
5. 删除旧组件（可选，保留作为兼容层）

**示例**:
```typescript
// 旧代码
import SelectionRect from './interaction/SelectionRect';

// 新代码
import { SelectionRect } from '@/components/common-interaction';
import { useFileSelection } from './hooks/useFileSelection';

// 业务逻辑层
const { handleSelectionChange } = useFileSelection();

<SelectionRect
  containerSelector=".file-list"
  selectableSelector="[data-file-id]"
  onSelectionChange={handleSelectionChange}
/>
```

#### 3.2 迁移 ai-workflow

**文件**:
- `src/components/ai-workflow/hooks/useSelectionBox.ts`

**步骤**:
1. 使用 SelectionRect 组件替代自定义逻辑
2. 保留画布坐标转换逻辑
3. 适配节点选择回调
4. 测试工作流画布功能
5. 清理旧代码

**示例**:
```typescript
// 旧代码
const { selectionBox, startSelection } = useSelectionBox();

// 新代码
import { SelectionRect } from '@/components/common-interaction';

<SelectionRect
  containerSelector=".workflow-canvas"
  selectableSelector="[data-node-id]"
  onSelectionChange={handleNodesSelection}
  itemExtractor={(el) => ({
    id: el.dataset.nodeId!,
    type: 'node'
  })}
/>
```

### 阶段 4：优化和增强（未来）

- [ ] 添加键盘快捷键支持
- [ ] 添加触摸屏支持
- [ ] 性能监控和优化
- [ ] 可访问性改进
- [ ] 动画效果增强
- [ ] 更多自定义选项

## 兼容性策略

### 渐进式迁移

1. **保留旧组件**
   - 在迁移期间保留原有组件
   - 添加 `@deprecated` 注释
   - 提供迁移指南

2. **兼容层**
   - 创建适配器组件
   - 保持 API 向后兼容
   - 逐步过渡到新 API

3. **版本控制**
   - 使用语义化版本
   - 在 CHANGELOG 中记录变更
   - 提供升级指南

### 示例：兼容层

```typescript
// file-explorer/interaction/SelectionRect.tsx (兼容层)
import { SelectionRect as CommonSelectionRect } from '@/components/common-interaction';

/**
 * @deprecated 请使用 @/components/common-interaction 中的 SelectionRect
 * 此组件将在 v2.0.0 中移除
 */
export default defineComponent({
  name: 'SelectionRect',
  setup(props, { slots }) {
    console.warn('[SelectionRect] 此组件已废弃，请迁移到 @/components/common-interaction');
    
    return () => h(CommonSelectionRect, props, slots);
  }
});
```

## 测试策略

### 单元测试

```typescript
// SelectionRect.spec.ts
describe('SelectionRect', () => {
  it('should start selection when mouse moves beyond threshold', () => {
    // ...
  });
  
  it('should select elements within selection rect', () => {
    // ...
  });
  
  it('should auto-scroll when near edge', () => {
    // ...
  });
});
```

### 集成测试

```typescript
// file-explorer-selection.spec.ts
describe('File Explorer Selection', () => {
  it('should select files using SelectionRect', () => {
    // ...
  });
});

// workflow-canvas-selection.spec.ts
describe('Workflow Canvas Selection', () => {
  it('should select nodes using SelectionRect', () => {
    // ...
  });
});
```

## 时间估算

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| 阶段 1 | 基础设施 | ✅ 已完成 |
| 阶段 2.1 | SelectionRect 组件 | 4-6 小时 |
| 阶段 2.2 | DragPreview 组件 | 3-4 小时 |
| 阶段 2.3 | DropZone 组件 | 3-4 小时 |
| 阶段 3.1 | 迁移 file-explorer | 2-3 小时 |
| 阶段 3.2 | 迁移 ai-workflow | 2-3 小时 |
| 测试 | 单元测试 + 集成测试 | 4-6 小时 |
| **总计** | | **18-26 小时** |

## 风险和挑战

### 技术风险

1. **性能回归**
   - 风险：抽象层可能影响性能
   - 缓解：性能测试、优化关键路径

2. **API 不兼容**
   - 风险：现有代码需要大量修改
   - 缓解：提供兼容层、渐进式迁移

3. **边界情况**
   - 风险：通用组件可能无法覆盖所有场景
   - 缓解：提供扩展点、支持自定义

### 业务风险

1. **功能回归**
   - 风险：迁移后功能异常
   - 缓解：充分测试、灰度发布

2. **开发延期**
   - 风险：迁移工作影响新功能开发
   - 缓解：分阶段实施、并行开发

## 成功标准

- [ ] 所有组件抽离完成
- [ ] file-explorer 和 ai-workflow 成功迁移
- [ ] 测试覆盖率 > 80%
- [ ] 性能无明显下降
- [ ] 文档完整清晰
- [ ] 代码重复率降低 > 50%

## 下一步行动

1. **立即执行**
   - 开始实现 SelectionRect 组件
   - 编写单元测试

2. **短期（1-2 周）**
   - 完成 DragPreview 和 DropZone 组件
   - 开始迁移 file-explorer

3. **中期（3-4 周）**
   - 完成 ai-workflow 迁移
   - 优化性能和体验

4. **长期（1-2 月）**
   - 添加更多功能
   - 持续优化和维护

