/**
 * Flow 状态管理 Hook
 *
 * 提供 Vue 3 Composition API 的状态管理 Hook
 * 使用新的架构：DefaultStateStore + DefaultHistoryManager + FlowSelectionHandler
 */

import { ref, computed, nextTick, onUnmounted, type Ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { DefaultStateStore } from '../core/state/stores/DefaultStateStore';
import { DefaultHistoryManager } from '../core/state/stores/DefaultHistoryManager';
import { FlowSelectionHandler, type SelectionOptions } from '../core/interaction/FlowSelectionHandler';
import { safeUpdateRef, shallowUpdateRef } from '../utils/ref-utils';
import type { FlowNode } from '../types/flow-node';
import type { FlowEdge } from '../types/flow-edge';
import type { FlowViewport } from '../types/flow-config';
import type { FlowStateSnapshot } from '../core/state/types';

/**
 * useFlowState 选项
 */
export interface UseFlowStateOptions {
  /** 初始节点列表 */
  initialNodes?: FlowNode[];
  /** 初始连接线列表 */
  initialEdges?: FlowEdge[];
  /** 初始视口状态 */
  initialViewport?: FlowViewport;
  /** 最大历史记录数量 */
  maxHistorySize?: number;
  /** 是否自动保存历史记录（默认 true） */
  autoSaveHistory?: boolean;
  /** 选择选项 */
  selectionOptions?: SelectionOptions;
}

/**
 * useFlowState 返回值
 */
export interface UseFlowStateReturn {
  /** 节点列表（响应式） */
  nodes: Ref<FlowNode[]>;
  /** 连接线列表（响应式） */
  edges: Ref<FlowEdge[]>;
  /** 视口状态（响应式） */
  viewport: Ref<FlowViewport>;
  /** 选中的节点 ID 列表（响应式） */
  selectedNodeIds: Ref<string[]>;
  /** 选中的连接线 ID 列表（响应式） */
  selectedEdgeIds: Ref<string[]>;
  /** 状态存储实例（内部使用） */
  stateStore: DefaultStateStore;
  /** 历史记录管理器实例（内部使用） */
  historyManager: DefaultHistoryManager;
  /** 选择处理器实例（内部使用） */
  selectionHandler: FlowSelectionHandler;

  // 节点操作
  addNode: (node: FlowNode) => void;
  addNodes: (nodes: FlowNode[]) => void;
  updateNode: (nodeId: string, updates: Partial<FlowNode>) => void;
  removeNode: (nodeId: string) => void;
  removeNodes: (nodeIds: string[]) => void;
  getNode: (nodeId: string) => FlowNode | undefined;
  hasNode: (nodeId: string) => boolean;

  // 连接线操作
  addEdge: (edge: FlowEdge) => void;
  addEdges: (edges: FlowEdge[]) => void;
  updateEdge: (edgeId: string, updates: Partial<FlowEdge>) => void;
  removeEdge: (edgeId: string) => void;
  removeEdges: (edgeIds: string[]) => void;
  getEdge: (edgeId: string) => FlowEdge | undefined;
  getNodeEdges: (nodeId: string) => FlowEdge[];

  // 视口操作
  setViewport: (viewport: Partial<FlowViewport>) => void;
  panViewport: (deltaX: number, deltaY: number) => void;
  zoomViewport: (zoom: number, centerX?: number, centerY?: number) => void;

  // 选择操作
  selectNode: (nodeId: string, addToSelection?: boolean) => void;
  selectNodes: (nodeIds: string[]) => void;
  selectEdge: (edgeId: string, addToSelection?: boolean) => void;
  deselectAll: () => void;
  getSelectedNodes: () => FlowNode[];
  getSelectedEdges: () => FlowEdge[];
  isNodeSelected: (nodeId: string) => boolean;
  isEdgeSelected: (edgeId: string) => boolean;
  shouldMultiSelect: (event: MouseEvent | KeyboardEvent) => boolean;
  shouldBoxSelect: (event: MouseEvent | KeyboardEvent) => boolean;
  startBoxSelection: (startX: number, startY: number) => void;
  updateBoxSelection: (currentX: number, currentY: number) => void;
  finishBoxSelection: () => string[];
  cancelBoxSelection: () => void;
  isBoxSelecting: () => boolean;
  getSelectionBox: () => Readonly<import('../core/interaction/FlowSelectionHandler').SelectionBox>;
  setSelectionOptions: (options: Partial<SelectionOptions>) => void;

  // 历史记录操作
  pushHistory: () => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: Ref<boolean>;
  canRedo: Ref<boolean>;
  clearHistory: () => void;

  // 状态快照
  createSnapshot: () => FlowStateSnapshot;
  restoreSnapshot: (snapshot: FlowStateSnapshot) => void;
  reset: () => void;
}

/**
 * Flow 状态管理 Hook
 *
 * 提供响应式的状态管理功能
 *
 * @param options Hook 选项
 * @returns 状态相关的响应式数据和方法
 *
 * @example
 * ```typescript
 * const {
 *   nodes,
 *   edges,
 *   addNode,
 *   removeNode,
 *   selectNode
 * } = useFlowState({
 *   initialNodes: [node1, node2],
 *   initialEdges: [edge1]
 * });
 *
 * // 响应式访问
 * console.log(nodes.value);
 *
 * // 操作状态
 * addNode(newNode);
 * selectNode('node-1');
 * ```
 */
export function useFlowState(
  options: UseFlowStateOptions = {}
): UseFlowStateReturn {
  const {
    initialNodes,
    initialEdges,
    initialViewport,
    maxHistorySize,
    autoSaveHistory = true,
    selectionOptions
  } = options;

  // ==================== 创建状态存储（框架无关）====================

  // 恢复初始选择状态
  const initialSelectedNodeIds = initialNodes
    ?.filter(node => node.selected)
    .map(node => node.id) || [];

  const store = new DefaultStateStore({
    nodes: initialNodes,
    edges: initialEdges,
    viewport: initialViewport,
    selectedNodeIds: initialSelectedNodeIds,
    selectedEdgeIds: []
  });

  // ==================== 使用 Vue Ref 包装状态，提供响应式 ====================

  const nodesRef = ref(store.getNodes());
  const edgesRef = ref(store.getEdges());
  const viewportRef = ref(store.getViewport());
  const selectedNodeIdsRef = ref(store.getSelectedNodeIds());
  const selectedEdgeIdsRef = ref(store.getSelectedEdgeIds());

  // ==================== 订阅状态变化，同步到 Ref（性能优化：移除深度监听）====================

  /**
   * 批量更新标志，用于在 nextTick 中批量更新
   */
  let pendingUpdates: Set<string> = new Set();
  let updateScheduled = false;

  /**
   * 批量更新响应式引用
   */
  const flushUpdates = () => {
    if (pendingUpdates.size === 0) {
      updateScheduled = false;
      return;
    }

    // 根据变化类型，只更新相关的 Ref
    if (pendingUpdates.has('nodes') || pendingUpdates.has('all')) {
      safeUpdateRef(nodesRef, store.getNodes());
    }

    if (pendingUpdates.has('edges') || pendingUpdates.has('all')) {
      safeUpdateRef(edgesRef, store.getEdges());
    }

    if (pendingUpdates.has('viewport') || pendingUpdates.has('all')) {
      shallowUpdateRef(viewportRef, store.getViewport(), ['x', 'y', 'zoom']);
    }

    if (pendingUpdates.has('selectedNodeIds') || pendingUpdates.has('all')) {
      safeUpdateRef(selectedNodeIdsRef, store.getSelectedNodeIds());
    }

    if (pendingUpdates.has('selectedEdgeIds') || pendingUpdates.has('all')) {
      safeUpdateRef(selectedEdgeIdsRef, store.getSelectedEdgeIds());
    }

    pendingUpdates.clear();
    updateScheduled = false;
  };

  /**
   * 订阅状态变化（细粒度更新，避免深度监听）
   */
  store.subscribe((changeType) => {
    pendingUpdates.add(changeType);

    // 使用 nextTick 批量更新，避免频繁触发响应式更新
    if (!updateScheduled) {
      updateScheduled = true;
      nextTick(() => {
        flushUpdates();
      });
    }
  });

  // ==================== 创建历史记录管理器 ====================

  const historyManager = new DefaultHistoryManager(store, {
    maxHistorySize
  });

  // ==================== 创建选择处理器（独立）====================

  const selectionHandler = new FlowSelectionHandler({
    options: selectionOptions,
    onSelectionChange: (nodeIds, edgeIds) => {
      // 同步到状态存储
      store.setSelectedNodeIds(nodeIds);
      store.setSelectedEdgeIds(edgeIds);
    }
  });

  // 初始化选择状态
  if (initialSelectedNodeIds.length > 0) {
    selectionHandler.selectNodes(initialSelectedNodeIds);
  }

  // ==================== 自动保存历史记录 ====================

  if (autoSaveHistory) {
    const debouncedPushHistory = useDebounceFn(() => {
      historyManager.pushHistory();
    }, 300);

    // 使用订阅机制替代深度监听，只监听节点和连接线的变化
    const historyUnsubscribe = store.subscribe((changeType) => {
      if (changeType === 'nodes' || changeType === 'edges' || changeType === 'all') {
        debouncedPushHistory();
      }
    });

    // 组件卸载时取消订阅
    onUnmounted(() => {
      historyUnsubscribe();
    });
  }

  // ==================== 计算属性：是否可以撤销/重做 ====================

  const canUndo = computed(() => historyManager.canUndo());
  const canRedo = computed(() => historyManager.canRedo());

  // ==================== 返回统一接口 ====================

  return {
    // 响应式状态
    nodes: nodesRef,
    edges: edgesRef,
    viewport: viewportRef,
    selectedNodeIds: selectedNodeIdsRef,
    selectedEdgeIds: selectedEdgeIdsRef,
    stateStore: store,
    historyManager,
    selectionHandler,

    // 节点操作
    addNode: (node: FlowNode) => {
      store.addNode(node);
    },
    addNodes: (nodes: FlowNode[]) => {
      store.addNodes(nodes);
    },
    updateNode: (nodeId: string, updates: Partial<FlowNode>) => {
      store.updateNode(nodeId, updates);
    },
    removeNode: (nodeId: string) => {
      store.removeNode(nodeId);
    },
    removeNodes: (nodeIds: string[]) => {
      store.removeNodes(nodeIds);
    },
    getNode: (nodeId: string) => {
      return store.getNode(nodeId);
    },
    hasNode: (nodeId: string) => {
      return store.hasNode(nodeId);
    },

    // 连接线操作
    addEdge: (edge: FlowEdge) => {
      store.addEdge(edge);
    },
    addEdges: (edges: FlowEdge[]) => {
      store.addEdges(edges);
    },
    updateEdge: (edgeId: string, updates: Partial<FlowEdge>) => {
      store.updateEdge(edgeId, updates);
    },
    removeEdge: (edgeId: string) => {
      store.removeEdge(edgeId);
    },
    removeEdges: (edgeIds: string[]) => {
      store.removeEdges(edgeIds);
    },
    getEdge: (edgeId: string) => {
      return store.getEdge(edgeId);
    },
    getNodeEdges: (nodeId: string) => {
      return store.getNodeEdges(nodeId);
    },

    // 视口操作
    setViewport: (viewport: Partial<FlowViewport>) => {
      store.setViewport(viewport);
    },
    panViewport: (deltaX: number, deltaY: number) => {
      store.panViewport(deltaX, deltaY);
    },
    zoomViewport: (zoom: number, centerX?: number, centerY?: number) => {
      store.zoomViewport(zoom, centerX, centerY);
    },

    // 选择操作
    selectNode: (nodeId: string, addToSelection?: boolean) => {
      selectionHandler.selectNode(nodeId, addToSelection || false);
    },
    selectNodes: (nodeIds: string[]) => {
      selectionHandler.selectNodes(nodeIds);
    },
    selectEdge: (edgeId: string, addToSelection?: boolean) => {
      selectionHandler.selectEdge(edgeId, addToSelection || false);
    },
    deselectAll: () => {
      selectionHandler.deselectAll();
    },
    getSelectedNodes: () => {
      return selectionHandler.getSelectedNodes(store.getNodes());
    },
    getSelectedEdges: () => {
      return selectionHandler.getSelectedEdges(store.getEdges());
    },
    isNodeSelected: (nodeId: string) => {
      return selectionHandler.isNodeSelected(nodeId);
    },
    isEdgeSelected: (edgeId: string) => {
      return selectionHandler.isEdgeSelected(edgeId);
    },
    shouldMultiSelect: (event: MouseEvent | KeyboardEvent) => {
      return selectionHandler.shouldMultiSelect(event);
    },
    shouldBoxSelect: (event: MouseEvent | KeyboardEvent) => {
      return selectionHandler.shouldBoxSelect(event);
    },
    startBoxSelection: (startX: number, startY: number) => {
      selectionHandler.startBoxSelection(startX, startY);
    },
    updateBoxSelection: (currentX: number, currentY: number) => {
      selectionHandler.updateBoxSelection(currentX, currentY);
    },
    finishBoxSelection: () => {
      const selectedIds = selectionHandler.finishBoxSelection(
        store.getNodes(),
        store.getViewport()
      );
      return selectedIds;
    },
    cancelBoxSelection: () => {
      selectionHandler.cancelBoxSelection();
    },
    isBoxSelecting: () => {
      return selectionHandler.isBoxSelecting();
    },
    getSelectionBox: () => {
      return selectionHandler.getSelectionBox();
    },
    setSelectionOptions: (options: Partial<SelectionOptions>) => {
      selectionHandler.setOptions(options);
    },

    // 历史记录操作
    pushHistory: () => {
      historyManager.pushHistory();
    },
    undo: () => {
      return historyManager.undo();
    },
    redo: () => {
      return historyManager.redo();
    },
    canUndo,
    canRedo,
    clearHistory: () => {
      historyManager.clearHistory();
    },

    // 状态快照
    createSnapshot: () => {
      return historyManager.createSnapshot();
    },
    restoreSnapshot: (snapshot: FlowStateSnapshot) => {
      historyManager.restoreSnapshot(snapshot);
    },
    reset: () => {
      historyManager.reset();
    }
  };
}

