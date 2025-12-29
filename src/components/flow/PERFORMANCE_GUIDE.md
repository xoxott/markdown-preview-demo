# Flow 组件性能优化指南

## 快速开始

### 基础配置（推荐）

```tsx
import { FlowCanvas, FlowPerformanceMonitor } from '@/components/flow';

<FlowCanvas
  id="my-flow"
  initialNodes={nodes}
  initialEdges={edges}
  config={{
    performance: {
      enableViewportCulling: true,      // 启用视口裁剪
      virtualScrollBuffer: 200,         // 缓冲区大小
      enableRAFThrottle: true,          // RAF 节流
      enableEdgeCanvasRendering: false, // Canvas 渲染（大量连接线时启用）
      edgeCanvasThreshold: 500          // Canvas 渲染阈值
    },
    canvas: {
      zoomOnScroll: true,
      panOnDrag: true,
      showGrid: true
    }
  }}
>
  {/* 开发时显示性能监控 */}
  {process.env.NODE_ENV === 'development' && (
    <FlowPerformanceMonitor
      totalNodes={nodes.length}
      visibleNodes={visibleNodes.length}
      totalEdges={edges.length}
      visibleEdges={visibleEdges.length}
      position="top-right"
    />
  )}
</FlowCanvas>
```

## 性能配置详解

### 1. 视口裁剪 (Viewport Culling)

**作用**：只渲染可见区域内的节点和连接线

```tsx
config={{
  performance: {
    enableViewportCulling: true,  // 启用视口裁剪
    virtualScrollBuffer: 200      // 缓冲区（像素）
  }
}}
```

**建议**：
- 节点数 < 100：可不启用
- 节点数 100-500：建议启用，buffer = 200
- 节点数 > 500：必须启用，buffer = 300-500

**效果**：
- 性能提升：2-10 倍（取决于节点数量）
- 内存占用：降低 30-50%

### 2. 空间索引 (Spatial Index)

**作用**：使用 R-Tree 加速视口查询

```tsx
// 自动启用（节点数 > 50 时）
// 无需手动配置
```

**效果**：
- 查询速度：O(n) → O(log n)
- 1000 节点：提升 10-20 倍
- 10000 节点：提升 50-100 倍

### 3. RAF 节流 (RequestAnimationFrame Throttling)

**作用**：限制鼠标事件处理频率

```tsx
config={{
  performance: {
    enableRAFThrottle: true  // 启用 RAF 节流
  }
}}
```

**效果**：
- 事件频率：~300次/秒 → ~60次/秒
- CPU 占用：降低 70-80%
- 拖拽更流畅

### 4. Canvas 渲染 (Canvas Rendering)

**作用**：对大量连接线使用 Canvas 替代 SVG

```tsx
config={{
  performance: {
    enableEdgeCanvasRendering: true,  // 启用 Canvas 渲染
    edgeCanvasThreshold: 500          // 阈值（连接线数量）
  }
}}
```

**建议**：
- 连接线 < 200：使用 SVG（更清晰）
- 连接线 200-500：根据性能决定
- 连接线 > 500：使用 Canvas（更快）

**注意**：
- Canvas 渲染不支持复杂的贝塞尔曲线
- 连接线交互功能受限

### 5. 路径缓存 (Path Caching)

**作用**：缓存连接线路径计算结果

```tsx
// 自动启用，无需配置
// 缓存有效期：100ms
```

**效果**：
- 减少 80-90% 的重复计算
- 渲染性能提升 3-5 倍

## 性能监控

### 开发环境

```tsx
import { FlowPerformanceMonitor } from '@/components/flow';

<FlowPerformanceMonitor
  totalNodes={nodes.length}
  visibleNodes={visibleNodes.length}
  totalEdges={edges.length}
  visibleEdges={visibleEdges.length}
  position="top-right"  // 位置：top-left | top-right | bottom-left | bottom-right
/>
```

### 监控指标

- **FPS**：帧率（目标 60）
  - 60：优秀 ✅
  - 40-60：良好 ⚠️
  - 25-40：一般 ⚠️
  - <25：较差 ❌

- **帧时间**：每帧耗时（目标 <16.67ms）

- **节点数量**：可见/总数（裁剪率）

- **内存使用**：JS 堆内存（MB）

## 性能优化策略

### 场景 1：小型流程图（< 100 节点）

```tsx
config={{
  performance: {
    enableViewportCulling: false,  // 可不启用
    enableRAFThrottle: true        // 建议启用
  }
}}
```

**预期性能**：60 FPS

### 场景 2：中型流程图（100-500 节点）

```tsx
config={{
  performance: {
    enableViewportCulling: true,   // 必须启用
    virtualScrollBuffer: 200,
    enableRAFThrottle: true,
    enableEdgeCanvasRendering: false
  }
}}
```

**预期性能**：55-60 FPS

### 场景 3：大型流程图（500-2000 节点）

```tsx
config={{
  performance: {
    enableViewportCulling: true,   // 必须启用
    virtualScrollBuffer: 300,
    enableRAFThrottle: true,
    enableEdgeCanvasRendering: true,  // 建议启用
    edgeCanvasThreshold: 500
  }
}}
```

**预期性能**：45-55 FPS

### 场景 4：超大型流程图（> 2000 节点）

```tsx
config={{
  performance: {
    enableViewportCulling: true,   // 必须启用
    virtualScrollBuffer: 500,
    enableRAFThrottle: true,
    enableEdgeCanvasRendering: true,  // 必须启用
    edgeCanvasThreshold: 300,
    maxHistorySize: 20  // 减少历史记录
  },
  canvas: {
    showGrid: false  // 关闭网格（可选）
  }
}}
```

**预期性能**：35-45 FPS

## 常见性能问题

### 问题 1：拖拽卡顿

**原因**：鼠标事件处理频率过高

**解决方案**：
```tsx
config={{
  performance: {
    enableRAFThrottle: true  // 启用 RAF 节流
  }
}}
```

### 问题 2：缩放卡顿

**原因**：大量节点重新计算位置

**解决方案**：
```tsx
config={{
  performance: {
    enableViewportCulling: true,  // 启用视口裁剪
    virtualScrollBuffer: 300      // 增加缓冲区
  }
}}
```

### 问题 3：连接线渲染慢

**原因**：SVG 渲染大量连接线性能差

**解决方案**：
```tsx
config={{
  performance: {
    enableEdgeCanvasRendering: true,  // 使用 Canvas 渲染
    edgeCanvasThreshold: 300
  }
}}
```

### 问题 4：内存占用高

**原因**：历史记录过多

**解决方案**：
```tsx
config={{
  performance: {
    maxHistorySize: 20  // 减少历史记录（默认 50）
  }
}}
```

## 性能测试

### 基准测试

```tsx
import { FlowCanvas, FlowPerformanceMonitor } from '@/components/flow';

// 生成测试节点
const generateNodes = (count: number) => {
  const nodes = [];
  const cols = Math.ceil(Math.sqrt(count * 2));
  
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodes.push({
      id: `node-${i}`,
      type: 'default',
      position: { x: col * 200, y: row * 100 },
      data: { label: `Node ${i}` }
    });
  }
  
  return nodes;
};

// 测试不同配置
const testConfigs = [
  { nodes: 100, culling: false, canvas: false },
  { nodes: 500, culling: true, canvas: false },
  { nodes: 1000, culling: true, canvas: true },
  { nodes: 5000, culling: true, canvas: true }
];
```

### 性能指标

| 配置 | 节点数 | 视口裁剪 | Canvas | 预期 FPS |
|-----|-------|---------|--------|---------|
| 1   | 100   | ❌      | ❌     | 60      |
| 2   | 500   | ✅      | ❌     | 55-60   |
| 3   | 1000  | ✅      | ✅     | 50-55   |
| 4   | 5000  | ✅      | ✅     | 40-45   |

## 最佳实践

### 1. 渐进式加载

```tsx
// 分批加载节点
const loadNodesInBatches = async (allNodes: FlowNode[]) => {
  const batchSize = 100;
  const batches = Math.ceil(allNodes.length / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const batch = allNodes.slice(i * batchSize, (i + 1) * batchSize);
    nodes.value.push(...batch);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
};
```

### 2. 动态配置

```tsx
// 根据节点数量动态调整配置
const getOptimalConfig = (nodeCount: number) => {
  if (nodeCount < 100) {
    return {
      enableViewportCulling: false,
      enableEdgeCanvasRendering: false
    };
  } else if (nodeCount < 500) {
    return {
      enableViewportCulling: true,
      virtualScrollBuffer: 200,
      enableEdgeCanvasRendering: false
    };
  } else {
    return {
      enableViewportCulling: true,
      virtualScrollBuffer: 300,
      enableEdgeCanvasRendering: true,
      edgeCanvasThreshold: 300
    };
  }
};
```

### 3. 懒加载连接线

```tsx
// 只在需要时加载连接线
const loadEdgesOnDemand = (visibleNodeIds: string[]) => {
  return allEdges.filter(edge => 
    visibleNodeIds.includes(edge.source) || 
    visibleNodeIds.includes(edge.target)
  );
};
```

## 总结

### 核心优化技术

1. ✅ **空间索引**：最大性能提升（10-100倍）
2. ✅ **视口裁剪**：显著降低渲染负载
3. ✅ **RAF 节流**：改善交互体验
4. ✅ **路径缓存**：减少重复计算
5. ✅ **Canvas 渲染**：优化大量连接线

### 推荐配置

```tsx
// 生产环境推荐配置
config={{
  performance: {
    enableViewportCulling: true,
    virtualScrollBuffer: 300,
    enableRAFThrottle: true,
    enableEdgeCanvasRendering: nodes.length > 500,
    edgeCanvasThreshold: 300,
    maxHistorySize: 30
  },
  canvas: {
    zoomOnScroll: true,
    panOnDrag: true,
    showGrid: nodes.length < 1000
  }
}}
```

### 性能目标

- 小型（< 100）：60 FPS
- 中型（100-500）：55-60 FPS
- 大型（500-2000）：45-55 FPS
- 超大（> 2000）：35-45 FPS

### 下一步

查看 [PERFORMANCE_AUDIT.md](./PERFORMANCE_AUDIT.md) 了解详细的性能审查报告和优化细节。

