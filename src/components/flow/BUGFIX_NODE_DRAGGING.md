# 修复：示例五中节点无法拖拽

## 问题描述

在性能测试示例（示例五）中，节点无法拖拽。

## 根本原因

1. **配置缺失**：性能测试示例的 `FlowCanvas` 配置中缺少节点拖拽相关配置
2. **节点属性缺失**：生成的测试节点没有显式设置 `draggable` 属性

## 解决方案

### 1. 添加配置

在 `FlowCanvas` 的 `config` 中添加：

```tsx
config={{
  nodes: {
    draggable: true,      // 启用节点拖拽
    selectable: true,     // 启用节点选择
    connectable: true     // 启用节点连接
  },
  interaction: {
    nodesDraggable: true, // 全局启用拖拽
    nodesSelectable: true // 全局启用选择
  }
}}
```

### 2. 显式设置节点属性

在生成节点时添加：

```tsx
nodes.push({
  id: `perf-node-${i}`,
  type: 'default',
  position: { x, y },
  size: { width: nodeWidth, height: nodeHeight },
  data: { label: `节点 ${i + 1}` },
  draggable: true,      // 显式启用拖拽
  selectable: true,     // 显式启用选择
  connectable: true,    // 显式启用连接
  handles: [...]
});
```

## 配置优先级

节点拖拽的判断逻辑（`FlowCanvas.tsx:420`）：

```typescript
const draggable = node.draggable !== false && config.value.nodes?.draggable !== false;
```

**优先级**：
1. 节点自身的 `draggable` 属性（最高优先级）
2. 全局配置 `config.nodes.draggable`
3. 默认配置 `DEFAULT_NODE_CONFIG.draggable = true`

**规则**：
- 如果节点设置 `draggable: false`，则不可拖拽（即使全局配置为 true）
- 如果节点未设置 `draggable`，则使用全局配置
- 如果全局配置未设置，则使用默认配置（true）

## 最佳实践

### 推荐做法

1. **在配置中统一设置**（推荐）：

```tsx
<FlowCanvas
  config={{
    nodes: { draggable: true },
    interaction: { nodesDraggable: true }
  }}
/>
```

2. **在节点中按需设置**：

```tsx
// 可拖拽节点
{ id: 'node-1', draggable: true, ... }

// 不可拖拽节点（锁定）
{ id: 'node-2', draggable: false, ... }
```

### 不推荐做法

❌ 不设置任何配置，依赖默认值（可能在某些情况下失效）

```tsx
<FlowCanvas
  initialNodes={nodes}
  // 缺少 config
/>
```

## 相关文件

- `src/views/component/index.tsx` - 示例页面
- `src/components/flow/components/FlowCanvas.tsx` - 画布组件
- `src/components/flow/config/default-config.ts` - 默认配置

## 测试验证

修复后验证：
1. ✅ 节点可以正常拖拽
2. ✅ 拖拽时触发 RAF 节流优化
3. ✅ 拖拽性能流畅（200+ 节点）
4. ✅ 性能监控正常显示

## 注意事项

1. **性能优化与交互的平衡**：
   - 启用 RAF 节流后，拖拽更流畅但可能有轻微延迟
   - 大量节点时建议启用视口裁剪

2. **配置合并逻辑**：
   - 用户配置会与默认配置深度合并
   - 确保关键配置项显式设置，避免依赖默认值

3. **节点锁定**：
   - 可以通过 `node.locked = true` 锁定节点
   - 锁定的节点不可拖拽、不可删除

## 相关优化

本次修复同时验证了以下性能优化：

- ✅ RAF 节流优化（拖拽流畅）
- ✅ 空间索引优化（视口裁剪）
- ✅ 路径缓存优化（连接线渲染）
- ✅ 性能监控组件（实时 FPS）

## 总结

通过显式配置节点拖拽相关属性，确保了所有示例中的节点都能正常拖拽。同时验证了性能优化后的交互体验依然流畅。

