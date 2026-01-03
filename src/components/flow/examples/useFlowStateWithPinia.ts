/**
 * Flow 状态管理与 Pinia 集成示例
 *
 * 展示如何使用 Pinia 作为状态存储，实现自定义状态管理
 */

import { computed, type Ref } from 'vue';
import { defineStore } from 'pinia';
import type { IStateStore, Unsubscribe, StateChangeType } from '../core/state/interfaces/IStateStore';
import type { FlowNode } from '../types/flow-node';
import type { FlowEdge } from '../types/flow-edge';
import type { FlowViewport } from '../types/flow-config';
import { DefaultHistoryManager } from '../core/state/stores/DefaultHistoryManager';
import { FlowSelectionHandler } from '../core/interaction/FlowSelectionHandler';
import type { SelectionOptions } from '../core/interaction/FlowSelectionHandler';

/**
 * Pinia Store 定义
 */
export const useFlowStore = defineStore('flow', {
  state: () => ({
    nodes: [] as FlowNode[],
    edges: [] as FlowEdge[],
    viewport: { x: 0, y: 0, zoom: 1 } as FlowViewport,
    selectedNodeIds: [] as string[],
    selectedEdgeIds: [] as string[]
  }),

  getters: {
    getNodeById: (state) => (id: string) => {
      return state.nodes.find(node => node.id === id);
    },
    getEdgeById: (state) => (id: string) => {
      return state.edges.find(edge => edge.id === id);
    }
  },

  actions: {
    setNodes(nodes: FlowNode[]) {
      this.nodes = nodes;
    },
    addNode(node: FlowNode) {
      if (!this.nodes.find(n => n.id === node.id)) {
        this.nodes.push(node);
      }
    },
    removeNode(nodeId: string) {
      this.nodes = this.nodes.filter(n => n.id !== nodeId);
      this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    },
    updateNode(nodeId: string, updates: Partial<FlowNode>) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (node) {
        // 如果更新了 position，需要创建新的 position 对象，确保 Vue 能检测到变化
        if (updates.position) {
          node.position = { ...node.position, ...updates.position };
          // 更新其他属性（排除 position，因为已经单独处理）
          const { position, ...restUpdates } = updates;
          if (Object.keys(restUpdates).length > 0) {
            Object.assign(node, restUpdates);
          }
        } else {
          Object.assign(node, updates);
        }
      }
    },
    setEdges(edges: FlowEdge[]) {
      this.edges = edges;
    },
    addEdge(edge: FlowEdge) {
      if (!this.edges.find(e => e.id === edge.id)) {
        this.edges.push(edge);
      }
    },
    removeEdge(edgeId: string) {
      this.edges = this.edges.filter(e => e.id !== edgeId);
    },
    updateEdge(edgeId: string, updates: Partial<FlowEdge>) {
      const edge = this.edges.find(e => e.id === edgeId);
      if (edge) {
        Object.assign(edge, updates);
      }
    },
    setViewport(viewport: Partial<FlowViewport>) {
      this.viewport = { ...this.viewport, ...viewport };
    },
    setSelectedNodeIds(ids: string[]) {
      this.selectedNodeIds = ids;
    },
    setSelectedEdgeIds(ids: string[]) {
      this.selectedEdgeIds = ids;
    }
  }
});

/**
 * Pinia 状态存储实现
 */
class PiniaStateStore implements IStateStore {
  private store: ReturnType<typeof useFlowStore>;
  private subscribers: Set<(changeType: StateChangeType) => void> = new Set();

  constructor() {
    this.store = useFlowStore();
  }

  // 节点操作
  getNodes(): FlowNode[] {
    return this.store.nodes.map(node => ({ ...node }));
  }

  setNodes(nodes: FlowNode[]): void {
    this.store.setNodes(nodes);
    this.notifySubscribers('nodes');
  }

  addNode(node: FlowNode): void {
    this.store.addNode(node);
    this.notifySubscribers('nodes');
  }

  addNodes(nodes: FlowNode[]): void {
    nodes.forEach(node => this.store.addNode(node));
    this.notifySubscribers('nodes');
  }

  updateNode(nodeId: string, updates: Partial<FlowNode>): void {
    this.store.updateNode(nodeId, updates);
    this.notifySubscribers('nodes');
  }

  removeNode(nodeId: string): void {
    this.store.removeNode(nodeId);
    this.notifySubscribers('nodes');
  }

  removeNodes(nodeIds: string[]): void {
    nodeIds.forEach(id => this.store.removeNode(id));
    this.notifySubscribers('nodes');
  }

  getNode(nodeId: string): FlowNode | undefined {
    return this.store.getNodeById(nodeId);
  }

  hasNode(nodeId: string): boolean {
    return !!this.store.getNodeById(nodeId);
  }

  // 连接线操作
  getEdges(): FlowEdge[] {
    return this.store.edges.map(edge => ({ ...edge }));
  }

  setEdges(edges: FlowEdge[]): void {
    this.store.setEdges(edges);
    this.notifySubscribers('edges');
  }

  addEdge(edge: FlowEdge): void {
    this.store.addEdge(edge);
    this.notifySubscribers('edges');
  }

  addEdges(edges: FlowEdge[]): void {
    edges.forEach(edge => this.store.addEdge(edge));
    this.notifySubscribers('edges');
  }

  updateEdge(edgeId: string, updates: Partial<FlowEdge>): void {
    this.store.updateEdge(edgeId, updates);
    this.notifySubscribers('edges');
  }

  removeEdge(edgeId: string): void {
    this.store.removeEdge(edgeId);
    this.notifySubscribers('edges');
  }

  removeEdges(edgeIds: string[]): void {
    edgeIds.forEach(id => this.store.removeEdge(id));
    this.notifySubscribers('edges');
  }

  getEdge(edgeId: string): FlowEdge | undefined {
    return this.store.getEdgeById(edgeId);
  }

  getNodeEdges(nodeId: string): FlowEdge[] {
    return this.store.edges.filter(
      edge => edge.source === nodeId || edge.target === nodeId
    );
  }

  // 视口操作
  getViewport(): FlowViewport {
    return { ...this.store.viewport };
  }

  setViewport(viewport: Partial<FlowViewport>): void {
    this.store.setViewport(viewport);
    this.notifySubscribers('viewport');
  }

  // 选择操作
  getSelectedNodeIds(): string[] {
    return [...this.store.selectedNodeIds];
  }

  setSelectedNodeIds(ids: string[]): void {
    this.store.setSelectedNodeIds(ids);
    this.notifySubscribers('selectedNodeIds');
  }

  getSelectedEdgeIds(): string[] {
    return [...this.store.selectedEdgeIds];
  }

  setSelectedEdgeIds(ids: string[]): void {
    this.store.setSelectedEdgeIds(ids);
    this.notifySubscribers('selectedEdgeIds');
  }

  // 订阅机制
  subscribe(callback: (changeType: StateChangeType) => void): Unsubscribe {
    this.subscribers.add(callback);
    // 使用 Pinia 的 $subscribe 监听状态变化
    // 注意：Pinia 的 $subscribe 无法直接知道具体哪个字段变化了，所以传递 'all'
    // 如果需要细粒度更新，可以在各个方法中调用 notifySubscribers
    const unsubscribe = this.store.$subscribe((mutation, state) => {
      // 根据 mutation 类型判断变化类型（简化处理，实际可能需要更复杂的逻辑）
      callback('all');
    });
    return () => {
      this.subscribers.delete(callback);
      unsubscribe();
    };
  }

  private notifySubscribers(changeType: StateChangeType = 'all'): void {
    this.subscribers.forEach(callback => callback(changeType));
  }
}

/**
 * 使用 Pinia 的 Flow 状态管理 Hook
 *
 * @example
 * ```typescript
 * const {
 *   nodes,
 *   edges,
 *   addNode,
 *   selectNode
 * } = useFlowStateWithPinia({
 *   selectionOptions: {
 *     enableMultiSelection: true
 *   }
 * });
 * ```
 */
export function useFlowStateWithPinia(options?: {
  maxHistorySize?: number;
  selectionOptions?: SelectionOptions;
}) {
  // 创建 Pinia 状态存储
  const store = new PiniaStateStore();

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

  // 使用 Pinia 的响应式状态
  const piniaStore = useFlowStore();

  return {
    // 响应式状态（使用 Pinia 的 computed）
    nodes: computed(() => piniaStore.nodes),
    edges: computed(() => piniaStore.edges),
    viewport: computed(() => piniaStore.viewport),
    selectedNodeIds: computed(() => piniaStore.selectedNodeIds),
    selectedEdgeIds: computed(() => piniaStore.selectedEdgeIds),

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
    restoreSnapshot: (snapshot: any) => {
      historyManager.restoreSnapshot(snapshot);
    },
    reset: () => {
      historyManager.reset();
    }
  };
}

