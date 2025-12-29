# DOM 变动调试分析

## 🔍 用户发现的关键线索

**观察**: 在 Chrome DevTools 中，拖拽一个节点时，**其他节点的 div 也有变动**（高亮闪烁）

这说明：
1. Vue 正在更新其他节点的 DOM
2. 可能是 props 变化
3. 可能是 key 的问题
4. 可能是 computed 依赖问题

---

## 🐛 可能的原因

### 原因 1: `visibleNodes` 数组引用变化 ⚠️⚠️⚠️

**位置**: `FlowNodes.tsx` line 207-252

```typescript
const visibleNodes = computed(() => {
  if (!props.enableViewportCulling) {
    return props.nodes; // ✅ 这个没问题
  }

  // ❌ 问题：每次都返回新数组
  return spatialIndex.value.query({
    minX: viewport.x,
    minY: viewport.y,
    maxX: viewport.x + viewport.width,
    maxY: viewport.y + viewport.height
  });
});
```

**问题**:
- `spatialIndex.query()` 每次返回新数组
- 即使节点相同，数组引用也不同
- Vue 的 `v-for` 检测到数组引用变化
- 重新渲染所有节点

---

### 原因 2: `props.nodes` 数组本身在变化 ⚠️⚠️⚠️

**位置**: `FlowCanvas.tsx` 中的 `nodes` ref

```typescript
// FlowCanvas.tsx
const nodes = ref<FlowNode[]>([]);

// 拖拽时直接修改节点
const handleNodeMouseMove = (event: MouseEvent) => {
  const draggedNode = nodesMap.value.get(nodeDragState.nodeId);
  if (draggedNode) {
    draggedNode.position.x = finalX; // ✅ 直接修改
    draggedNode.position.y = finalY;
  }
};
```

**问题分析**:
```
1. draggedNode.position.x 变化
2. Vue 检测到 nodes 数组中的对象属性变化
3. nodes 是 ref，触发响应式更新
4. FlowNodes 接收到新的 props.nodes
5. 虽然数组引用相同，但 Vue 可能检测到内部对象变化
6. 触发 visibleNodes computed 重新计算
7. spatialIndex.query() 返回新数组
8. v-for 重新渲染所有节点
```

---

### 原因 3: `node` 对象在 render 中被访问 ⚠️⚠️

**位置**: `FlowNodes.tsx` line 384-429

```typescript
return () => (
  <div class="flow-nodes">
    {visibleNodes.value.map(node => {
      const state = getNodeState(node);  // ✅ 已缓存
      const style = getNodeStyle(node);  // ✅ 已缓存

      return (
        <div key={node.id} style={style}> {/* ❌ 问题可能在这里 */}
          <BaseNode
            node={node}  {/* ❌ node 对象本身传递给 BaseNode */}
            selected={state.selected}
            locked={state.locked}
            hovered={state.hovered}
            dragging={state.dragging}
          />
        </div>
      );
    })}
  </div>
);
```

**问题**:
- `node={node}` 传递整个 node 对象
- 当 `node.position` 变化时，Vue 检测到 prop 变化
- BaseNode 重新渲染
- 即使 BaseNode 内部有缓存，外层 div 也会更新

---

### 原因 4: BaseNode 的 `props.node` 依赖 ⚠️⚠️⚠️

**位置**: `BaseNode.tsx` line 93

```typescript
const nodeStyle = computed(() => {
  // 缓存键包含 node.size
  const cacheKey = `${props.selected}-${props.dragging}-${props.hovered}-${props.locked}-${props.node.size?.width || 150}-${props.node.size?.height || 60}`;
  
  // ...
  
  const baseStyle: Record<string, any> = {
    // ...
    width: props.node.size?.width ? `${props.node.size.width}px` : '150px',
    height: props.node.size?.height ? `${props.node.size.height}px` : '60px',
    // ...
    ...props.node.style,  // ❌ 展开 node.style
    ...props.style
  };
  
  // ...
});
```

**问题**:
- `computed` 依赖 `props.node`
- 当任何 node 的 position 变化时
- Vue 可能认为 `props.node` 变化了
- 触发 computed 重新计算
- 即使缓存命中，computed 本身也执行了

---

## ✅ 解决方案

### 方案 1: 稳定 `visibleNodes` 数组引用（关键）

```typescript
// ✅ 使用 shallowRef + 手动比较
const visibleNodes = shallowRef<FlowNode[]>([]);
const lastVisibleNodeIds = new Set<string>();

watch(
  () => [props.nodes, props.viewport, spatialIndex.value] as const,
  () => {
    if (!props.enableViewportCulling) {
      visibleNodes.value = props.nodes;
      return;
    }

    const newVisibleNodes = spatialIndex.value.query({
      minX: props.viewport.x,
      minY: props.viewport.y,
      maxX: props.viewport.x + props.viewport.width,
      maxY: props.viewport.y + props.viewport.height
    });

    // ✅ 比较节点 ID，只有真正变化时才更新
    const newIds = new Set(newVisibleNodes.map(n => n.id));
    
    if (newIds.size !== lastVisibleNodeIds.size) {
      visibleNodes.value = newVisibleNodes;
      lastVisibleNodeIds.clear();
      newIds.forEach(id => lastVisibleNodeIds.add(id));
      return;
    }

    // 检查是否有不同的节点
    let hasChange = false;
    for (const id of newIds) {
      if (!lastVisibleNodeIds.has(id)) {
        hasChange = true;
        break;
      }
    }

    if (hasChange) {
      visibleNodes.value = newVisibleNodes;
      lastVisibleNodeIds.clear();
      newIds.forEach(id => lastVisibleNodeIds.add(id));
    }
    // 否则保持 visibleNodes.value 不变（引用相同）
  },
  { deep: false }
);
```

**效果**:
- 只有可见节点集合真正变化时才更新数组
- 拖拽时，如果节点还在视口内，数组引用不变
- Vue 不会重新渲染其他节点

---

### 方案 2: 使用 `shallowRef` 代替 `ref` for nodes

```typescript
// FlowCanvas.tsx
const nodes = shallowRef<FlowNode[]>([]); // ✅ 使用 shallowRef

// 拖拽时
const handleNodeMouseMove = (event: MouseEvent) => {
  const draggedNode = nodesMap.value.get(nodeDragState.nodeId);
  if (draggedNode) {
    // ✅ 直接修改，Vue 不会深度追踪
    draggedNode.position.x = finalX;
    draggedNode.position.y = finalY;
    
    // ✅ 手动触发更新（只在需要时）
    // 这里不需要触发，因为 BaseNode 会自己更新
  }
};
```

**效果**:
- `shallowRef` 只追踪数组引用，不追踪数组内部对象
- 修改 `node.position` 不会触发 nodes ref 的更新
- 减少不必要的响应式追踪

---

### 方案 3: 优化 BaseNode 的 props 传递

```typescript
// FlowNodes.tsx
return () => (
  <div class="flow-nodes">
    {visibleNodes.value.map(node => {
      const state = getNodeState(node);
      const style = getNodeStyle(node);

      return (
        <div key={node.id} style={style}>
          <BaseNode
            // ✅ 只传递必要的属性，不传递整个 node 对象
            nodeId={node.id}
            nodeType={node.type}
            nodeData={node.data}
            nodeSize={node.size}
            nodeStyle={node.style}
            selected={state.selected}
            locked={state.locked}
            hovered={state.hovered}
            dragging={state.dragging}
          />
        </div>
      );
    })}
  </div>
);
```

**问题**: 这需要大量修改 BaseNode 组件，可能不是最优方案。

---

### 方案 4: 使用 `markRaw` 标记 node 对象（推荐）

```typescript
// FlowCanvas.tsx
import { markRaw } from 'vue';

const addNode = (node: FlowNode) => {
  // ✅ 标记为非响应式
  const rawNode = markRaw(node);
  nodes.value.push(rawNode);
};

// 或者在初始化时
const nodes = shallowRef<FlowNode[]>(
  props.initialNodes.map(node => markRaw(node))
);
```

**效果**:
- `markRaw` 告诉 Vue 不要追踪这个对象
- 修改 `node.position` 不会触发响应式更新
- 需要手动触发更新（通过其他机制）

**问题**: 可能会破坏现有的响应式逻辑

---

## 🎯 最佳解决方案（综合）

### Step 1: 稳定 `visibleNodes` 数组引用

```typescript
// FlowNodes.tsx
const visibleNodesRef = shallowRef<FlowNode[]>([]);
const lastVisibleNodeIds = new Set<string>();

// 使用 watch 代替 computed
watch(
  () => [props.nodes, props.viewport.x, props.viewport.y, props.viewport.width, props.viewport.height, spatialIndex.value] as const,
  () => {
    if (!props.enableViewportCulling) {
      if (visibleNodesRef.value !== props.nodes) {
        visibleNodesRef.value = props.nodes;
      }
      return;
    }

    const newVisibleNodes = spatialIndex.value.query({
      minX: props.viewport.x,
      minY: props.viewport.y,
      maxX: props.viewport.x + props.viewport.width,
      maxY: props.viewport.y + props.viewport.height
    });

    // 比较节点 ID 集合
    const newIds = new Set(newVisibleNodes.map(n => n.id));
    
    // 如果数量不同，肯定变了
    if (newIds.size !== lastVisibleNodeIds.size) {
      visibleNodesRef.value = newVisibleNodes;
      lastVisibleNodeIds.clear();
      newIds.forEach(id => lastVisibleNodeIds.add(id));
      return;
    }

    // 检查是否有不同的节点 ID
    let hasChange = false;
    for (const id of newIds) {
      if (!lastVisibleNodeIds.has(id)) {
        hasChange = true;
        break;
      }
    }

    // 只有真正变化时才更新
    if (hasChange) {
      visibleNodesRef.value = newVisibleNodes;
      lastVisibleNodeIds.clear();
      newIds.forEach(id => lastVisibleNodeIds.add(id));
    }
  },
  { immediate: true, deep: false }
);

// 在 render 中使用
return () => (
  <div class="flow-nodes">
    {visibleNodesRef.value.map(node => {
      // ...
    })}
  </div>
);
```

---

### Step 2: 添加调试日志

```typescript
// 在 FlowNodes.tsx 的 render 中
return () => {
  // ✅ 调试：记录渲染次数
  if (import.meta.env.DEV) {
    console.log('[FlowNodes] Render, visible nodes:', visibleNodesRef.value.length);
  }

  return (
    <div class="flow-nodes">
      {visibleNodesRef.value.map(node => {
        const state = getNodeState(node);
        const style = getNodeStyle(node);

        // ✅ 调试：记录每个节点的渲染
        if (import.meta.env.DEV && node.id === 'debug-node') {
          console.log('[FlowNodes] Render node:', node.id, 'style:', style, 'state:', state);
        }

        return (
          <div key={node.id} style={style}>
            <BaseNode
              node={node}
              selected={state.selected}
              locked={state.locked}
              hovered={state.hovered}
              dragging={state.dragging}
            />
          </div>
        );
      })}
    </div>
  );
};
```

---

### Step 3: 优化 BaseNode 避免不必要的依赖

```typescript
// BaseNode.tsx
const nodeStyle = computed(() => {
  // ✅ 只依赖必要的属性，不依赖整个 props.node
  const width = props.node.size?.width || 150;
  const height = props.node.size?.height || 60;
  
  const cacheKey = `${props.selected}-${props.dragging}-${props.hovered}-${props.locked}-${width}-${height}`;
  
  const cached = styleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const baseStyle: Record<string, any> = {
    position: 'relative',
    width: `${width}px`,
    height: `${height}px`,
    cursor: props.locked ? 'not-allowed' : props.dragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    pointerEvents: 'auto',
    backgroundColor: '#ffffff',
    border: '1px solid #d9d9d9',
    borderRadius: '8px',
    padding: '12px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '100px',
    minHeight: '40px',
    transition: 'border 0.2s ease, box-shadow 0.2s ease, opacity 0.15s ease'
    // ✅ 移除 ...props.node.style 和 ...props.style
    // 这些会导致依赖 props.node 的所有属性
  };

  // 选中状态
  if (props.selected) {
    baseStyle.border = '2px solid #2080f0';
    baseStyle.boxShadow = '0 0 0 2px rgba(32, 128, 240, 0.2)';
  }

  if (props.hovered && !props.selected) {
    baseStyle.borderColor = '#2080f0';
    baseStyle.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
  }

  if (props.dragging) {
    baseStyle.opacity = 0.8;
  }

  styleCache.set(cacheKey, baseStyle);
  
  if (styleCache.size > 50) {
    const keys = Array.from(styleCache.keys());
    for (let i = 0; i < 10; i++) {
      styleCache.delete(keys[i]);
    }
  }

  return baseStyle;
});
```

---

## 🧪 调试验证

### 在 Chrome DevTools 中验证

1. **打开 Performance Monitor**:
   - `Ctrl + Shift + P` → "Show Performance Monitor"
   - 观察 "DOM Nodes" 和 "Layouts / sec"

2. **使用 Paint Flashing**:
   - `Ctrl + Shift + P` → "Show Rendering"
   - 勾选 "Paint flashing"
   - 拖拽节点，观察哪些区域闪烁（绿色）

3. **使用 Layer Borders**:
   - 勾选 "Layer borders"
   - 观察层叠上下文

4. **使用 Console 日志**:
   ```javascript
   // 在拖拽时观察
   // 应该只看到 1-2 个节点的日志
   ```

---

## 📊 预期效果

### 优化前
```
拖拽节点:
1. draggedNode.position 变化
2. nodes ref 触发更新
3. visibleNodes computed 重新计算
4. spatialIndex.query() 返回新数组
5. Vue v-for 检测到数组引用变化
6. 重新渲染所有 200 个节点
7. 每个节点的 div 都高亮闪烁
```

### 优化后
```
拖拽节点:
1. draggedNode.position 变化
2. visibleNodes watch 检查节点 ID 集合
3. ID 集合没变，visibleNodes.value 引用不变
4. Vue v-for 不触发重新渲染
5. 只有拖拽的节点更新（通过 style 缓存）
6. 其他节点的 div 不闪烁
```

---

## 🎉 总结

### 根本原因

**`visibleNodes` computed 每次返回新数组引用**
- `spatialIndex.query()` 总是返回新数组
- Vue 的 `v-for` 检测到数组变化
- 重新渲染所有节点
- Chrome DevTools 显示所有节点 div 变动

### 解决方案

1. ✅ 使用 `shallowRef` + `watch` 代替 `computed`
2. ✅ 比较节点 ID 集合，只有真正变化时才更新数组引用
3. ✅ 移除 BaseNode 中不必要的 `props.node` 依赖
4. ✅ 添加调试日志验证

### 预期效果

- ✅ 拖拽时只有 1 个节点的 div 变动
- ✅ 其他节点的 div 完全不闪烁
- ✅ FPS 稳定在 60
- ✅ 完全流畅

---

**问题分析时间**: 2025-12-29  
**优先级**: P0（严重 Bug）  
**状态**: 待实施

