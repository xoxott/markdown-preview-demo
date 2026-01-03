/**
 * Flow 状态管理与自定义状态管理集成示例
 *
 * 展示如何实现 IStateStore 接口，集成自定义状态管理库
 * （如 Vuex、Zustand、Jotai 等）
 */

import { ref, computed, type Ref } from 'vue';
import type { IStateStore, Unsubscribe, StateChangeType } from '../core/state/interfaces/IStateStore';
import type { FlowNode } from '../types/flow-node';
import type { FlowEdge } from '../types/flow-edge';
import type { FlowViewport } from '../types/flow-config';
import { DefaultHistoryManager } from '../core/state/stores/DefaultHistoryManager';
import { FlowSelectionHandler } from '../core/interaction/FlowSelectionHandler';
import type { SelectionOptions } from '../core/interaction/FlowSelectionHandler';
import type { FlowStateSnapshot } from '../core/state/types';

/**
 * 自定义状态管理接口
 * （示例：类似 Vuex 的 store）
 */
interface CustomStore {
  state: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    viewport: FlowViewport;
    selectedNodeIds: string[];
    selectedEdgeIds: string[];
  };
  commit: (mutation: string, payload?: any) => void;
  subscribe: (callback: () => void) => () => void;
}

/**
 * 自定义状态存储实现
 *
 * 实现 IStateStore 接口，适配自定义状态管理库
 */
class CustomStateStore implements IStateStore {
  private store: CustomStore;
  private subscribers: Set<(changeType: StateChangeType) => void> = new Set();

  constructor(store: CustomStore) {
    this.store = store;

    // 订阅自定义 store 的变化
    this.store.subscribe(() => {
      this.notifySubscribers();
    });
  }

  // 节点操作
  getNodes(): FlowNode[] {
    return this.store.state.nodes.map(node => ({ ...node }));
  }

  setNodes(nodes: FlowNode[]): void {
    this.store.commit('SET_NODES', nodes);
    this.notifySubscribers();
  }

  addNode(node: FlowNode): void {
    this.store.commit('ADD_NODE', node);
    this.notifySubscribers();
  }

  addNodes(nodes: FlowNode[]): void {
    this.store.commit('ADD_NODES', nodes);
    this.notifySubscribers();
  }

  updateNode(nodeId: string, updates: Partial<FlowNode>): void {
    this.store.commit('UPDATE_NODE', { nodeId, updates });
    this.notifySubscribers();
  }

  removeNode(nodeId: string): void {
    this.store.commit('REMOVE_NODE', nodeId);
    this.notifySubscribers();
  }

  removeNodes(nodeIds: string[]): void {
    this.store.commit('REMOVE_NODES', nodeIds);
    this.notifySubscribers();
  }

  getNode(nodeId: string): FlowNode | undefined {
    return this.store.state.nodes.find(n => n.id === nodeId);
  }

  hasNode(nodeId: string): boolean {
    return !!this.store.state.nodes.find(n => n.id === nodeId);
  }

  // 连接线操作
  getEdges(): FlowEdge[] {
    return this.store.state.edges.map(edge => ({ ...edge }));
  }

  setEdges(edges: FlowEdge[]): void {
    this.store.commit('SET_EDGES', edges);
    this.notifySubscribers();
  }

  addEdge(edge: FlowEdge): void {
    this.store.commit('ADD_EDGE', edge);
    this.notifySubscribers();
  }

  addEdges(edges: FlowEdge[]): void {
    this.store.commit('ADD_EDGES', edges);
    this.notifySubscribers();
  }

  updateEdge(edgeId: string, updates: Partial<FlowEdge>): void {
    this.store.commit('UPDATE_EDGE', { edgeId, updates });
    this.notifySubscribers();
  }

  removeEdge(edgeId: string): void {
    this.store.commit('REMOVE_EDGE', edgeId);
    this.notifySubscribers();
  }

  removeEdges(edgeIds: string[]): void {
    this.store.commit('REMOVE_EDGES', edgeIds);
    this.notifySubscribers();
  }

  getEdge(edgeId: string): FlowEdge | undefined {
    return this.store.state.edges.find(e => e.id === edgeId);
  }

  getNodeEdges(nodeId: string): FlowEdge[] {
    return this.store.state.edges.filter(
      edge => edge.source === nodeId || edge.target === nodeId
    );
  }

  // 视口操作
  getViewport(): FlowViewport {
    return { ...this.store.state.viewport };
  }

  setViewport(viewport: Partial<FlowViewport>): void {
    this.store.commit('SET_VIEWPORT', viewport);
    this.notifySubscribers();
  }

  // 选择操作
  getSelectedNodeIds(): string[] {
    return [...this.store.state.selectedNodeIds];
  }

  setSelectedNodeIds(ids: string[]): void {
    this.store.commit('SET_SELECTED_NODE_IDS', ids);
    this.notifySubscribers();
  }

  getSelectedEdgeIds(): string[] {
    return [...this.store.state.selectedEdgeIds];
  }

  setSelectedEdgeIds(ids: string[]): void {
    this.store.commit('SET_SELECTED_EDGE_IDS', ids);
    this.notifySubscribers();
  }

  // 订阅机制
  subscribe(callback: (changeType: StateChangeType) => void): Unsubscribe {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(changeType: StateChangeType = 'all'): void {
    this.subscribers.forEach(callback => callback(changeType));
  }
}

/**
 * 使用自定义状态管理的 Flow 状态管理 Hook
 *
 * @example
 * ```typescript
 * // 创建自定义 store
 * const customStore = createCustomStore({
 *   nodes: [],
 *   edges: [],
 *   viewport: { x: 0, y: 0, zoom: 1 }
 * });
 *
 * // 使用自定义 store
 * const {
 *   nodes,
 *   edges,
 *   addNode
 * } = useFlowStateWithCustom(customStore);
 * ```
 */
export function useFlowStateWithCustom(
  customStore: CustomStore,
  options?: {
    maxHistorySize?: number;
    selectionOptions?: SelectionOptions;
  }
) {
  // 创建自定义状态存储
  const store = new CustomStateStore(customStore);

  // 创建历史记录管理器
  const historyManager = new DefaultHistoryManager(store, {
    maxHistorySize: options?.maxHistorySize || 50
  });

  // 创建选择处理器
  const selectionHandler = new FlowSelectionHandler({
    options: options?.selectionOptions,
    onSelectionChange: (nodeIds, edgeIds) => {
      store.setSelectedNodeIds(nodeIds);
      store.setSelectedEdgeIds(edgeIds);
    }
  });

  // 使用 Vue Ref 包装状态，提供响应式
  const nodesRef = ref(store.getNodes());
  const edgesRef = ref(store.getEdges());
  const viewportRef = ref(store.getViewport());
  const selectedNodeIdsRef = ref(store.getSelectedNodeIds());
  const selectedEdgeIdsRef = ref(store.getSelectedEdgeIds());

  // 监听状态变化，同步到 Ref
  store.subscribe(() => {
    nodesRef.value = store.getNodes();
    edgesRef.value = store.getEdges();
    viewportRef.value = store.getViewport();
    selectedNodeIdsRef.value = store.getSelectedNodeIds();
    selectedEdgeIdsRef.value = store.getSelectedEdgeIds();
  });

  return {
    // 响应式状态
    nodes: nodesRef,
    edges: edgesRef,
    viewport: viewportRef,
    selectedNodeIds: selectedNodeIdsRef,
    selectedEdgeIds: selectedEdgeIdsRef,

    // 节点操作
    addNode: (node: FlowNode) => store.addNode(node),
    addNodes: (nodes: FlowNode[]) => store.addNodes(nodes),
    updateNode: (nodeId: string, updates: Partial<FlowNode>) => store.updateNode(nodeId, updates),
    removeNode: (nodeId: string) => store.removeNode(nodeId),
    removeNodes: (nodeIds: string[]) => store.removeNodes(nodeIds),
    getNode: (nodeId: string) => store.getNode(nodeId),
    hasNode: (nodeId: string) => store.hasNode(nodeId),

    // 连接线操作
    addEdge: (edge: FlowEdge) => store.addEdge(edge),
    addEdges: (edges: FlowEdge[]) => store.addEdges(edges),
    updateEdge: (edgeId: string, updates: Partial<FlowEdge>) => store.updateEdge(edgeId, updates),
    removeEdge: (edgeId: string) => store.removeEdge(edgeId),
    removeEdges: (edgeIds: string[]) => store.removeEdges(edgeIds),
    getEdge: (edgeId: string) => store.getEdge(edgeId),
    getNodeEdges: (nodeId: string) => store.getNodeEdges(nodeId),

    // 视口操作
    setViewport: (viewport: Partial<FlowViewport>) => store.setViewport(viewport),
    panViewport: (deltaX: number, deltaY: number) => {
      const vp = store.getViewport();
      store.setViewport({ x: vp.x + deltaX, y: vp.y + deltaY });
    },
    zoomViewport: (zoom: number, centerX?: number, centerY?: number) => {
      const vp = store.getViewport();
      const oldZoom = vp.zoom;
      if (centerX !== undefined && centerY !== undefined) {
        const scale = zoom / oldZoom;
        store.setViewport({
          zoom,
          x: centerX - (centerX - vp.x) * scale,
          y: centerY - (centerY - vp.y) * scale
        });
      } else {
        store.setViewport({ zoom });
      }
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
      return selectionHandler.finishBoxSelection(store.getNodes(), store.getViewport());
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
    canUndo: computed(() => historyManager.canUndo()),
    canRedo: computed(() => historyManager.canRedo()),
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

