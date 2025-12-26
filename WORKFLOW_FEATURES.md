# AI 工作流画布功能文档

## 📋 已实现功能

### 1. ✅ 框选多节点功能
- **快捷键**: `Shift + 左键拖拽`
- **功能**: 在画布上拖拽选择矩形区域，批量选中多个节点
- **实现**: `useSelectionBox` hook
- **文件**: `src/components/ai-workflow/hooks/useSelectionBox.ts`

### 2. ✅ 撤销/重做功能
- **快捷键**:
  - 撤销: `Ctrl/Cmd + Z`
  - 重做: `Ctrl/Cmd + Y` 或 `Ctrl/Cmd + Shift + Z`
- **功能**: 支持最多50步历史记录，可撤销/重做节点和连接的增删改操作
- **实现**: `useHistory` hook
- **文件**: `src/components/ai-workflow/hooks/useHistory.ts`

### 3. ✅ 复制/粘贴功能
- **快捷键**:
  - 复制: `Ctrl/Cmd + C`
  - 粘贴: `Ctrl/Cmd + V`
- **功能**:
  - 复制选中的节点及其之间的连接
  - 粘贴时自动偏移位置避免重叠
  - 自动生成新的节点ID
- **实现**: 集成在 `useWorkflowCanvas` 中

### 4. ✅ 节点对齐和分布
- **对齐功能**:
  - 左对齐
  - 右对齐
  - 顶部对齐
  - 底部对齐
  - 水平居中对齐
  - 垂直居中对齐
- **分布功能**:
  - 水平均匀分布（需要3个以上节点）
  - 垂直均匀分布（需要3个以上节点）
- **实现**: `useNodeAlignment` hook
- **文件**: `src/components/ai-workflow/hooks/useNodeAlignment.ts`

### 5. ✅ 小地图（Minimap）
- **位置**: 画布右下角
- **功能**:
  - 显示整个工作流的缩略图
  - 显示当前视口位置
  - 点击小地图快速导航到对应位置
  - 节点颜色与类型对应
- **实现**: `Minimap` 组件
- **文件**: `src/components/ai-workflow/canvas/Minimap.tsx`

### 6. ✅ 工作流验证
- **验证项**:
  - 检查是否有开始节点
  - 检查是否有结束节点
  - 检查孤立节点（未连接的节点）
  - 检查必需输入端口是否已连接
  - 检测循环依赖
  - 检查条件节点的分支完整性
- **功能**:
  - 一键验证工作流
  - 显示错误和警告信息
  - 提供节点依赖分析
  - 提供下游节点查询
- **实现**: `useWorkflowValidation` hook
- **文件**: `src/components/ai-workflow/hooks/useWorkflowValidation.ts`

### 7. ✅ 其他已有功能
- **画布操作**:
  - 鼠标滚轮缩放
  - 左键/右键拖拽平移
  - 双指触控板缩放
  - 自适应视图
- **节点操作**:
  - 拖拽移动节点
  - 多选节点（Ctrl/Cmd + 点击）
  - 全选（Ctrl/Cmd + A）
  - 删除节点（Delete/Backspace）
  - 从节点库拖拽添加新节点
- **连接操作**:
  - 从输出端口拖拽到输入端口创建连接
  - 多端口支持（如条件节点的true/false分支）
  - 连接线精确对齐端口中心
  - 点击连接线删除
- **快捷键**:
  - `Escape`: 取消选择/取消连接
  - `Ctrl/Cmd + A`: 全选节点
  - `Delete/Backspace`: 删除选中节点

## 🚧 待实现功能

### 1. 连接线样式配置
- **计划功能**:
  - 直线（Straight）
  - 贝塞尔曲线（Bezier）- 当前默认
  - 步进线（Step）
  - 平滑步进线（Smooth Step）
- **优先级**: 中
- **预估工作量**: 2-3小时

### 2. 节点搜索和快速添加
- **计划功能**:
  - 快捷键触发搜索框（如 `/` 或 `Ctrl/Cmd + K`）
  - 模糊搜索节点类型
  - 键盘导航选择
  - 在鼠标位置添加节点
- **优先级**: 高
- **预估工作量**: 3-4小时

### 3. 节点分组功能
- **计划功能**:
  - 创建分组/框架（Group/Frame）
  - 拖拽节点到分组
  - 分组可折叠/展开
  - 分组可命名和着色
  - 整体移动分组
- **优先级**: 中
- **预估工作量**: 6-8小时

### 4. 性能优化：虚拟渲染
- **计划功能**:
  - 只渲染视口内的节点
  - 大量节点时的性能优化（>100个节点）
  - 连接线的层次细节（LOD）
  - 使用 Web Worker 进行计算密集型操作
- **优先级**: 低（当前性能已足够）
- **预估工作量**: 8-10小时

## 🏗️ 架构设计

### Hooks 组织
```
useWorkflowCanvas (主Hook)
├── useCanvasZoom (缩放和视口)
├── useNodeDragDrop (节点拖拽)
├── useNodeConnection (节点连接)
├── useSelectionBox (框选)
├── useHistory (历史记录)
├── useNodeAlignment (对齐和分布)
└── useWorkflowValidation (验证)
```

### 组件结构
```
WorkflowEditor (编辑器页面)
├── NodeLibraryPanel (节点库面板)
├── WorkflowCanvas (画布)
│   ├── CanvasToolbar (工具栏)
│   ├── CanvasGrid (网格背景)
│   ├── ConnectionLine (连接线)
│   ├── BaseNode (基础节点)
│   │   ├── StartNode
│   │   ├── EndNode
│   │   ├── AINode
│   │   ├── ConditionNode
│   │   └── ... (其他节点类型)
│   └── Minimap (小地图)
└── NodeConfigPanel (配置面板)
```

### 数据流
```
用户操作 → Canvas Handlers → Hooks → State Update → UI Re-render
                                  ↓
                            History Push
```

## 🎯 扩展性设计

### 1. 添加新节点类型
```typescript
// 1. 在 NodeRegistry.tsx 中注册
export const NODE_TYPES = {
  // ... 现有节点
  myNewNode: {
    component: MyNewNode,
    label: '我的新节点',
    icon: 'mdi:star',
    color: '#ff6b6b',
    category: 'custom',
    description: '自定义节点描述'
  }
};

// 2. 创建节点组件
export const MyNewNode = defineComponent({
  name: 'MyNewNode',
  setup(props: NodeProps) {
    return () => (
      <BaseNode {...props}>
        {/* 自定义内容 */}
      </BaseNode>
    );
  }
});
```

### 2. 添加新的验证规则
```typescript
// 在 useWorkflowValidation.ts 的 validate() 函数中添加
function validate(): ValidationError[] {
  const errors: ValidationError[] = [];

  // ... 现有验证

  // 添加新的验证规则
  nodes.value.forEach(node => {
    if (/* 自定义条件 */) {
      errors.push({
        type: 'error',
        nodeId: node.id,
        message: '自定义错误消息'
      });
    }
  });

  return errors;
}
```

### 3. 添加新的快捷键
```typescript
// 在 useWorkflowCanvas.ts 的 handleKeyDown() 中添加
function handleKeyDown(e: KeyboardEvent) {
  // ... 现有快捷键

  // 添加新快捷键
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    // 执行操作
  }
}
```

## 📊 性能指标

### 当前性能
- **节点数量**: 支持 100+ 节点流畅运行
- **连接数量**: 支持 200+ 连接
- **历史记录**: 50步（可配置）
- **响应时间**:
  - 节点拖拽: <16ms (60fps)
  - 缩放: <16ms (60fps)
  - 框选: <16ms (60fps)

### 优化措施
1. ✅ 使用 `computed` 缓存连接位置计算
2. ✅ 批量更新节点位置
3. ✅ 使用 `Set` 优化查找性能
4. ✅ 纯计算替代 DOM 查询（端口位置）
5. ✅ 原子化 viewport 更新
6. ✅ 使用 `watch` 的 `flush: 'post'` 优化响应式

## 🔧 维护性

### 代码组织原则
1. **单一职责**: 每个 Hook 只负责一个功能领域
2. **可组合性**: Hooks 可以独立使用或组合使用
3. **类型安全**: 完整的 TypeScript 类型定义
4. **可测试性**: 纯函数逻辑，易于单元测试
5. **文档完善**: 每个函数都有清晰的注释

### 测试建议
```typescript
// 单元测试示例
describe('useHistory', () => {
  it('should push state correctly', () => {
    const { pushState, canUndo } = useHistory();
    pushState({ nodes: [], connections: [] });
    expect(canUndo.value).toBe(true);
  });

  it('should undo correctly', () => {
    const { pushState, undo, getCurrentState } = useHistory();
    const state1 = { nodes: [node1], connections: [] };
    const state2 = { nodes: [node1, node2], connections: [] };

    pushState(state1);
    pushState(state2);
    undo();

    expect(getCurrentState()).toEqual(state1);
  });
});
```

## 🌟 开源准备

### 已完成
- ✅ 代码结构清晰
- ✅ TypeScript 类型完整
- ✅ 功能模块化
- ✅ 无硬编码依赖

### 待完善
- ⏳ 单元测试覆盖
- ⏳ E2E 测试
- ⏳ API 文档
- ⏳ 使用示例
- ⏳ 贡献指南
- ⏳ 更新日志

## 📝 使用示例

### 基础使用
```typescript
import { useWorkflowCanvas } from '@/components/ai-workflow/hooks/useWorkflowCanvas';

const canvas = useWorkflowCanvas({
  initialDefinition: {
    nodes: [],
    connections: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  }
});

// 使用功能
canvas.undo(); // 撤销
canvas.redo(); // 重做
canvas.alignLeft(); // 左对齐
canvas.validateWorkflow(); // 验证工作流
```

### 高级使用
```typescript
// 监听节点变化
watch(canvas.nodes, (newNodes) => {
  console.log('Nodes changed:', newNodes);
  canvas.saveHistory(); // 保存到历史记录
});

// 自定义验证
const errors = canvas.validateWorkflow();
if (errors.length > 0) {
  errors.forEach(error => {
    console.error(error.message);
  });
}

// 获取节点依赖
const dependencies = canvas.getNodeDependencies('node-id');
const downstream = canvas.getDownstreamNodes('node-id');
```

## 🎨 UI/UX 特性

### 视觉反馈
- ✅ 节点选中高亮（蓝色发光边框）
- ✅ 框选矩形（虚线蓝色边框）
- ✅ 连接线悬停/选中效果
- ✅ 端口悬停放大效果
- ✅ 工具栏按钮禁用状态
- ✅ 小地图视口指示器

### 交互优化
- ✅ 拖拽阈值（3px）区分点击和拖拽
- ✅ 节点居中放置（拖拽添加时）
- ✅ 自动选中新添加的节点
- ✅ 平滑的缩放动画
- ✅ 响应式工具栏（根据选中节点数量显示）

### 可访问性
- ✅ 键盘导航支持
- ✅ 工具提示说明
- ✅ 快捷键提示
- ⏳ ARIA 标签
- ⏳ 屏幕阅读器支持

---

**最后更新**: 2024-12-26
**版本**: 1.0.0
**维护者**: AI Workflow Team

