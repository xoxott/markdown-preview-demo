/**
 * Flow 组件优化功能集成指南
 *
 * 本文件展示如何将新的优化功能集成到现有的 Flow 组件中
 *
 * 注意：这是一个概念性示例，展示了如何使用优化功能。
 * 实际集成时可以使用 DefaultStateStore 或实现自定义的 IStateStore
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { FlowNode, FlowEdge, FlowViewport } from '../types';
import { SpatialIndex } from '../core/performance/SpatialIndex';
import { createPositionPool, createBoundsPool } from '../core/performance/ObjectPool';
import { CommandManager, MoveNodeCommand } from '../core/commands';
import type { IStateStore } from '../core/state/interfaces/IStateStore';

// ============================================
// 集成示例 1: 在 ViewportCuller 中使用空间索引
// ============================================

/**
 * 优化后的视口裁剪器
 */
export function useOptimizedViewportCulling() {
  const spatialIndex = new SpatialIndex({
      defaultWidth: 220,
      defaultHeight: 72,
    });

  /**
   * 获取可见节点（使用空间索引优化）
   */
  function getVisibleNodes(
    nodes: FlowNode[],
    viewport: FlowViewport,
    containerWidth: number,
    containerHeight: number
  ): FlowNode[] {
    // 更新空间索引
    spatialIndex.updateNodes(nodes);

    // 计算视口边界（画布坐标）
    const bounds = {
      minX: -viewport.x / viewport.zoom,
      minY: -viewport.y / viewport.zoom,
      maxX: (-viewport.x + containerWidth) / viewport.zoom,
      maxY: (-viewport.y + containerHeight) / viewport.zoom,
      width: containerWidth / viewport.zoom,
      height: containerHeight / viewport.zoom,
    };

    // 使用空间索引查询（O(log n) 复杂度）
    return spatialIndex.query(bounds);
  }

  return {
    getVisibleNodes,
    spatialIndex,
  };
}

// ============================================
// 集成示例 2: 使用对象池优化节点移动
// ============================================

/**
 * 使用对象池优化的节点移动
 */
export function useOptimizedNodeMovement() {
  const positionPool = createPositionPool(100, 1000);

  /**
   * 移动节点（使用对象池）
   */
  function moveNode(
    node: FlowNode,
    deltaX: number,
    deltaY: number
  ): FlowNode {
    // 从对象池获取位置对象
    const newPos = positionPool.acquire();

    try {
      newPos.x = node.position.x + deltaX;
      newPos.y = node.position.y + deltaY;

      // 返回更新后的节点
      return {
        ...node,
        position: { x: newPos.x, y: newPos.y },
      };
    } finally {
      // 释放对象回池
      positionPool.release(newPos);
    }
  }

  return {
    moveNode,
    positionPool,
  };
}

// ============================================
// 集成示例 3: 使用命令模式实现撤销/重做
// ============================================

/**
 * 使用命令模式的状态管理
 */
export function useOptimizedFlowState(stateStore: IStateStore) {
  const commandManager = new CommandManager({
    maxSize: 50,
    enableMerge: true, // 启用命令合并
  });

  /**
   * 移动节点（支持撤销/重做）
   */
  const moveNode = (nodeId: string, newPosition: { x: number; y: number }) => {
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
  };

  /**
   * 批量移动节点
   */
  const moveNodes = (updates: Array<{ id: string; position: { x: number; y: number } }>) => {
    // 可以创建一个宏命令来批量执行
    updates.forEach(({ id, position }) => {
      moveNode(id, position);
    });
  };

  /**
   * 撤销
   */
  const undo = () => {
    if (commandManager.canUndo()) {
      commandManager.undo();
    }
  };

  /**
   * 重做
   */
  const redo = () => {
    if (commandManager.canRedo()) {
      commandManager.redo();
    }
  };

  /**
   * 清空历史
   */
  const clearHistory = () => {
    commandManager.clear();
  };

  return {
    moveNode,
    moveNodes,
    undo,
    redo,
    canUndo: () => commandManager.canUndo(),
    canRedo: () => commandManager.canRedo(),
    clearHistory,
  };
}

// ============================================
// 集成示例 4: 完整的优化 Flow 组件
// ============================================

/**
 * 完整的优化 Flow 组件 Hook
 * 集成所有优化功能
 */
export function useOptimizedFlow() {
  // 状态
  const nodes = ref<FlowNode[]>([]);
  const edges = ref<FlowEdge[]>([]);
  const viewport = ref<FlowViewport>({ x: 0, y: 0, zoom: 1 });

  // 优化工具
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

  // 可见节点（使用空间索引）
  const visibleNodes = computed(() => {
    if (nodes.value.length === 0) return [];

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
  });

  // 监听节点变化，更新空间索引
  watch(nodes, (newNodes) => {
    spatialIndex.updateNodes(newNodes);
  }, { deep: true });

  /**
   * 优化的节点移动（使用对象池和命令模式）
   */
  const moveNodeOptimized = (nodeId: string, deltaX: number, deltaY: number) => {
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

      // 更新响应式状态
      nodes.value = [...stateStore.getNodes()];

      // 更新空间索引
      spatialIndex.updateNodes(stateStore.getNodes());
    } finally {
      positionPool.release(oldPos);
      positionPool.release(newPos);
    }
  };

  /**
   * 撤销
   */
  const undo = () => {
    if (commandManager.canUndo()) {
      commandManager.undo();
      nodes.value = [...stateStore.getNodes()];
      spatialIndex.updateNodes(stateStore.getNodes());
    }
  };

  /**
   * 重做
   */
  const redo = () => {
    if (commandManager.canRedo()) {
      commandManager.redo();
      nodes.value = [...stateStore.getNodes()];
      spatialIndex.updateNodes(stateStore.getNodes());
    }
  };

  /**
   * 添加节点
   */
  const addNode = (node: FlowNode) => {
    stateStore.addNode(node);
    nodes.value = [...stateStore.getNodes()];
    spatialIndex.updateNodes(stateStore.getNodes());
  };

  /**
   * 清空所有节点
   */
  const clearAllNodes = () => {
    stateStore.setNodes([]);
    nodes.value = [];
    spatialIndex.clear();
    commandManager.clear();
  };

  return {
    // 状态
    nodes,
    edges,
    viewport,
    visibleNodes,

    // 方法
    moveNodeOptimized,
    undo,
    redo,
    addNode,
    clearAllNodes,

    // 工具
    spatialIndex,
    positionPool,
    commandManager,
  };
}
