/**
 * Flow 状态管理 Hook
 *
 * 提供 Vue 3 Composition API 的状态管理 Hook
 * 封装状态管理器的使用方式
 */

import { computed, watch, type Ref } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { FlowStateManager } from '../core/state/FlowStateManager';
import type { FlowNode } from '../types/flow-node';
import type { FlowEdge } from '../types/flow-edge';
import type { FlowViewport } from '../types/flow-config';

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
  /** 状态管理器实例 */
  stateManager: FlowStateManager;

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

  // 历史记录操作
  pushHistory: () => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: Ref<boolean>;
  canRedo: Ref<boolean>;
  clearHistory: () => void;

  // 状态快照
  createSnapshot: () => import('../core/state/FlowStateManager').FlowStateSnapshot;
  restoreSnapshot: (snapshot: import('../core/state/FlowStateManager').FlowStateSnapshot) => void;
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
    autoSaveHistory = true
  } = options;

  // 创建状态管理器
  const stateManager = new FlowStateManager({
    nodes: initialNodes,
    edges: initialEdges,
    viewport: initialViewport,
    maxHistorySize
  });

  // 计算属性：是否可以撤销/重做
  const canUndo = computed(() => stateManager.canUndo());
  const canRedo = computed(() => stateManager.canRedo());

  // 自动保存历史记录
  if (autoSaveHistory) {
    const debouncedPushHistory = useDebounceFn(() => {
      stateManager.pushHistory();
    }, 300);

    watch(
      () => stateManager.nodes.value,
      () => {
        debouncedPushHistory();
      },
      { deep: true }
    );

    // 监听连接线变化
    watch(
      () => stateManager.edges.value,
      () => {
        debouncedPushHistory();
      },
      { deep: true }
    );
  }

  return {
    // 响应式状态
    nodes: stateManager.nodes,
    edges: stateManager.edges,
    viewport: stateManager.viewport,
    selectedNodeIds: stateManager.selectedNodeIds,
    selectedEdgeIds: stateManager.selectedEdgeIds,
    stateManager,

    // 节点操作
    addNode: stateManager.addNode.bind(stateManager),
    addNodes: stateManager.addNodes.bind(stateManager),
    updateNode: stateManager.updateNode.bind(stateManager),
    removeNode: stateManager.removeNode.bind(stateManager),
    removeNodes: stateManager.removeNodes.bind(stateManager),
    getNode: stateManager.getNode.bind(stateManager),
    hasNode: stateManager.hasNode.bind(stateManager),

    // 连接线操作
    addEdge: stateManager.addEdge.bind(stateManager),
    addEdges: stateManager.addEdges.bind(stateManager),
    updateEdge: stateManager.updateEdge.bind(stateManager),
    removeEdge: stateManager.removeEdge.bind(stateManager),
    removeEdges: stateManager.removeEdges.bind(stateManager),
    getEdge: stateManager.getEdge.bind(stateManager),
    getNodeEdges: stateManager.getNodeEdges.bind(stateManager),

    // 视口操作
    setViewport: stateManager.setViewport.bind(stateManager),
    panViewport: stateManager.panViewport.bind(stateManager),
    zoomViewport: stateManager.zoomViewport.bind(stateManager),

    // 选择操作
    selectNode: stateManager.selectNode.bind(stateManager),
    selectNodes: stateManager.selectNodes.bind(stateManager),
    selectEdge: stateManager.selectEdge.bind(stateManager),
    deselectAll: stateManager.deselectAll.bind(stateManager),
    getSelectedNodes: stateManager.getSelectedNodes.bind(stateManager),
    getSelectedEdges: stateManager.getSelectedEdges.bind(stateManager),

    // 历史记录操作
    pushHistory: stateManager.pushHistory.bind(stateManager),
    undo: stateManager.undo.bind(stateManager),
    redo: stateManager.redo.bind(stateManager),
    canUndo,
    canRedo,
    clearHistory: stateManager.clearHistory.bind(stateManager),

    // 状态快照
    createSnapshot: stateManager.createSnapshot.bind(stateManager),
    restoreSnapshot: stateManager.restoreSnapshot.bind(stateManager),
    reset: stateManager.reset.bind(stateManager)
  };
}

