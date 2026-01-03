/**
 * Flow 组件优化功能使用示例
 *
 * 本文件展示如何使用新增的性能优化功能
 *
 * 注意：这是一个概念性示例，展示了如何使用优化功能。
 * 实际集成时需要根据您的具体实现进行调整。
 */

import { ref } from 'vue';
import {
  // 核心类型
  type FlowNode,
  type FlowEdge,
  type FlowViewport,

  // 空间索引
  SpatialIndex,

  // 对象池
  ObjectPool,
  createPositionPool,
  createBoundsPool,

  // 命令模式
  CommandManager,
  MoveNodeCommand,

  // Zod 运行时验证
  zodValidateNode,
  zodSafeValidateNode,
} from '../index';

// 状态管理接口
import type { IStateStore } from '../core/state/interfaces/IStateStore';

// ============================================
// 示例 1: 使用空间索引优化视口裁剪
// ============================================

export function useOptimizedViewportCulling() {
  const spatialIndex = new SpatialIndex({
    defaultWidth: 220,
    defaultHeight: 72,
  });

  const nodes = ref<FlowNode[]>([]);

  // 当节点更新时，更新空间索引
  function updateNodes(newNodes: FlowNode[]) {
    nodes.value = newNodes;
    spatialIndex.updateNodes(newNodes);
  }

  // 获取视口内可见的节点（性能优化：O(log n)）
  function getVisibleNodes(viewport: FlowViewport): FlowNode[] {
    const bounds = {
      minX: -viewport.x / viewport.zoom,
      minY: -viewport.y / viewport.zoom,
      maxX: (-viewport.x + window.innerWidth) / viewport.zoom,
      maxY: (-viewport.y + window.innerHeight) / viewport.zoom,
      width: window.innerWidth / viewport.zoom,
      height: window.innerHeight / viewport.zoom,
    };

    return spatialIndex.query(bounds);
  }

  // 查找点击位置的节点
  function findNodeAtPosition(x: number, y: number): FlowNode | undefined {
    const results = spatialIndex.queryPoint(x, y);
    return results[0];
  }

  return {
    updateNodes,
    getVisibleNodes,
    findNodeAtPosition,
  };
}

// ============================================
// 示例 2: 使用对象池减少 GC 压力
// ============================================

export function useObjectPools() {
  // 创建位置对象池
  const positionPool = createPositionPool(100, 1000);

  // 创建边界对象池
  const boundsPool = createBoundsPool(50, 500);

  // 在鼠标事件处理中使用对象池
  function handleMouseMove(event: MouseEvent, viewport: FlowViewport) {
    // 从池中获取临时对象
    const pos = positionPool.acquire();

    try {
      // 计算画布坐标
      pos.x = (event.clientX - viewport.x) / viewport.zoom;
      pos.y = (event.clientY - viewport.y) / viewport.zoom;

      // 使用 pos 进行计算...
      console.log('Canvas position:', pos);

      // 可以返回结果，但不要返回池中的对象本身
      return { x: pos.x, y: pos.y };
    } finally {
      // 使用完毕后释放回池
      positionPool.release(pos);
    }
  }

  // 批量计算时使用对象池
  function calculateNodeBounds(nodes: FlowNode[]) {
    const results = [];

    for (const node of nodes) {
      const bounds = boundsPool.acquire();

      try {
        bounds.minX = node.position.x;
        bounds.minY = node.position.y;
        bounds.maxX = node.position.x + (node.size?.width || 220);
        bounds.maxY = node.position.y + (node.size?.height || 72);
        bounds.width = bounds.maxX - bounds.minX;
        bounds.height = bounds.maxY - bounds.minY;

        // 复制结果
        results.push({ ...bounds });
      } finally {
        boundsPool.release(bounds);
      }
    }

    return results;
  }

  // 查看对象池统计信息
  function getPoolStats() {
    return {
      position: positionPool.getStats(),
      bounds: boundsPool.getStats(),
    };
  }

  return {
    handleMouseMove,
    calculateNodeBounds,
    getPoolStats,
  };
}

// ============================================
// 示例 3: 使用命令模式实现撤销/重做
// ============================================

export function useCommandBasedHistory(stateStore: IStateStore) {
  const commandManager = new CommandManager({
    maxSize: 50,
    enableMerge: true, // 启用命令合并
  });

  // 移动节点（支持撤销/重做）
  function moveNode(nodeId: string, newPosition: { x: number; y: number }) {
    const node = stateStore.getNode(nodeId);
    if (!node) return;

    const oldPosition = { ...node.position };

    const command = new MoveNodeCommand(
      nodeId,
      oldPosition,
      newPosition,
      stateStore // 使用 IStateStore 接口
    );

    commandManager.execute(command);
  }

  // 批量移动节点
  function moveNodes(updates: Array<{ id: string; position: { x: number; y: number } }>) {
    // 可以创建一个宏命令来批量执行
    updates.forEach(({ id, position }) => {
      moveNode(id, position);
    });
  }

  // 撤销
  function undo() {
    if (commandManager.canUndo()) {
      commandManager.undo();
    }
  }

  // 重做
  function redo() {
    if (commandManager.canRedo()) {
      commandManager.redo();
    }
  }

  // 清空历史
  function clearHistory() {
    commandManager.clear();
  }

  // 获取历史状态
  function getHistoryState() {
    return {
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo(),
      size: commandManager.size(),
    };
  }

  return {
    moveNode,
    moveNodes,
    undo,
    redo,
    clearHistory,
    getHistoryState,
  };
}

// ============================================
// 示例 4: 使用 Zod 验证外部数据
// ============================================

export function useSafeDataImport() {
  // 导入外部数据时验证
  function importNodes(data: unknown): FlowNode[] {
    const validNodes: FlowNode[] = [];

    if (!Array.isArray(data)) {
      console.error('Invalid data: expected array');
      return [];
    }

    for (const item of data) {
      const result = zodSafeValidateNode(item);

      if (result.success) {
        // Ensure data property exists (schema requires it, but TypeScript may not infer correctly)
        const node: FlowNode = {
          ...result.data,
          data: result.data.data ?? {},
        };
        validNodes.push(node);
      } else {
        console.warn('Invalid node data:', result.error);
        // 可以选择跳过或使用默认值
      }
    }

    return validNodes;
  }

  // 严格验证（抛出异常）
  function importNodesStrict(data: unknown): FlowNode[] {
    if (!Array.isArray(data)) {
      throw new Error('Invalid data: expected array');
    }

    return data.map((item, index) => {
      try {
        const validated = zodValidateNode(item);
        // Ensure data property exists (schema requires it, but TypeScript may not infer correctly)
        return {
          ...validated,
          data: validated.data ?? {},
        } as FlowNode;
      } catch (error) {
        throw new Error(`Invalid node at index ${index}: ${error}`);
      }
    });
  }

  return {
    importNodes,
    importNodesStrict,
  };
}

// ============================================
// 示例 5: 完整的优化集成示例
// ============================================

export function useOptimizedFlowCanvas() {
  // 状态
  const nodes = ref<FlowNode[]>([]);
  const edges = ref<FlowEdge[]>([]);
  const viewport = ref<FlowViewport>({ x: 0, y: 0, zoom: 1 });

  // 初始化所有优化功能
  const spatialIndex = new SpatialIndex();
  const positionPool = createPositionPool();
  const commandManager = new CommandManager({ maxSize: 50, enableMerge: true });

  // 创建状态存储适配器（将 Vue ref 适配为 IStateStore）
  const stateStore: IStateStore = {
    getNodes: () => nodes.value,
    setNodes: (newNodes: FlowNode[]) => {
      nodes.value = newNodes;
    },
    addNode: (node: FlowNode) => {
      nodes.value.push(node);
    },
    addNodes: (newNodes: FlowNode[]) => {
      nodes.value.push(...newNodes);
    },
    updateNode: (id: string, updates: Partial<FlowNode>) => {
      const index = nodes.value.findIndex(n => n.id === id);
      if (index > -1) {
        Object.assign(nodes.value[index], updates);
      }
    },
    removeNode: (id: string) => {
      nodes.value = nodes.value.filter(n => n.id !== id);
    },
    removeNodes: (ids: string[]) => {
      nodes.value = nodes.value.filter(n => !ids.includes(n.id));
    },
    getNode: (id: string) => nodes.value.find(n => n.id === id),
    hasNode: (id: string) => nodes.value.some(n => n.id === id),
    getEdges: () => [],
    setEdges: () => {},
    addEdge: () => {},
    addEdges: () => {},
    updateEdge: () => {},
    removeEdge: () => {},
    removeEdges: () => {},
    getEdge: () => undefined,
    getNodeEdges: () => [],
    getViewport: () => viewport.value,
    setViewport: (vp: Partial<FlowViewport>) => {
      viewport.value = { ...viewport.value, ...vp };
    }
  };

  // 更新节点并刷新空间索引
  function setNodes(newNodes: FlowNode[]) {
    nodes.value = newNodes;
    spatialIndex.updateNodes(newNodes);
    stateStore.setNodes(newNodes);
  }

  // 优化的视口裁剪
  function getVisibleNodes() {
    const vp = viewport.value;
    const bounds = {
      minX: -vp.x / vp.zoom,
      minY: -vp.y / vp.zoom,
      maxX: (-vp.x + window.innerWidth) / vp.zoom,
      maxY: (-vp.y + window.innerHeight) / vp.zoom,
      width: window.innerWidth / vp.zoom,
      height: window.innerHeight / vp.zoom,
    };

    return spatialIndex.query(bounds);
  }

  // 优化的节点移动（使用对象池和命令模式）
  function moveNodeOptimized(nodeId: string, deltaX: number, deltaY: number) {
    const node = stateStore.getNode(nodeId);
    if (!node) return;

    const oldPos = positionPool.acquire();
    const newPos = positionPool.acquire();

    try {
      oldPos.x = node.position.x;
      oldPos.y = node.position.y;
      newPos.x = oldPos.x + deltaX;
      newPos.y = oldPos.y + deltaY;

      const command = new MoveNodeCommand(
        nodeId,
        { x: oldPos.x, y: oldPos.y },
        { x: newPos.x, y: newPos.y },
        stateStore // 使用 IStateStore 接口
      );

      commandManager.execute(command);

      // 更新空间索引
      spatialIndex.updateNodes(stateStore.getNodes());
    } finally {
      positionPool.release(oldPos);
      positionPool.release(newPos);
    }
  }

  // 撤销/重做
  function undo() {
    if (commandManager.canUndo()) {
      commandManager.undo();
      spatialIndex.updateNodes(stateStore.getNodes());
    }
  }

  function redo() {
    if (commandManager.canRedo()) {
      commandManager.redo();
      spatialIndex.updateNodes(stateStore.getNodes());
    }
  }

  // 性能统计
  function getPerformanceStats() {
    return {
      totalNodes: nodes.value.length,
      visibleNodes: getVisibleNodes().length,
      spatialIndexSize: spatialIndex.size(),
      poolStats: positionPool.getStats(),
      historySize: commandManager.size(),
      canUndo: commandManager.canUndo(),
      canRedo: commandManager.canRedo(),
    };
  }

  return {
    nodes,
    edges,
    viewport,
    setNodes,
    getVisibleNodes,
    moveNodeOptimized,
    undo,
    redo,
    getPerformanceStats,
  };
}

// ============================================
// 性能对比示例
// ============================================

export function performanceComparison() {
  const nodes = Array.from({ length: 10000 }, (_, i) => ({
    id: `node-${i}`,
    type: 'default',
    position: { x: Math.random() * 10000, y: Math.random() * 10000 },
    data: {},
  }));

  const viewport = {
    minX: 0,
    minY: 0,
    maxX: 1000,
    maxY: 1000,
    width: 1000,
    height: 1000,
  };

  // 方法 1: 线性查找（优化前）
  console.time('Linear Search');
  const result1 = nodes.filter(node => {
    const x = node.position.x;
    const y = node.position.y;
    return x >= viewport.minX && x <= viewport.maxX &&
           y >= viewport.minY && y <= viewport.maxY;
  });
  console.timeEnd('Linear Search');
  console.log('Found (linear):', result1.length);

  // 方法 2: 空间索引（优化后）
  const spatialIndex = new SpatialIndex();
  spatialIndex.updateNodes(nodes);

  console.time('Spatial Index');
  const result2 = spatialIndex.query(viewport);
  console.timeEnd('Spatial Index');
  console.log('Found (spatial):', result2.length);

  // 预期结果：空间索引快 10-20 倍
}

