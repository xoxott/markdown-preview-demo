/**
 * 默认状态存储实现（框架无关）
 *
 * 实现 IStateStore 接口，使用普通对象存储状态
 * 不依赖任何框架，可在任何环境中使用
 */

import type { IStateStore, Unsubscribe, StateChangeType } from '../interfaces/IStateStore';
import { incrementalUpdateNodes } from '../utils/incremental-update-utils';
import { logger } from '../../../utils/logger';
import type { FlowNode } from '../../../types/flow-node';
import type { FlowEdge } from '../../../types/flow-edge';
import type { FlowViewport } from '../../../types/flow-config';

/**
 * 默认状态存储选项
 */
export interface DefaultStateStoreOptions {
  /** 初始节点列表 */
  nodes?: FlowNode[];
  /** 初始连接线列表 */
  edges?: FlowEdge[];
  /** 初始视口状态 */
  viewport?: FlowViewport;
  /** 初始选中的节点 ID 列表 */
  selectedNodeIds?: string[];
  /** 初始选中的连接线 ID 列表 */
  selectedEdgeIds?: string[];
}

/**
 * 默认状态存储实现
 *
 * 使用普通数组和对象存储状态，不依赖任何框架
 */
export class DefaultStateStore implements IStateStore {
  // ==================== 状态存储 ====================

  /** 节点列表 */
  private nodes: FlowNode[] = [];
  /** 连接线列表 */
  private edges: FlowEdge[] = [];
  /** 视口状态 */
  private viewport: FlowViewport = { x: 0, y: 0, zoom: 1 };
  /** 选中的节点 ID 列表 */
  private selectedNodeIds: string[] = [];
  /** 选中的连接线 ID 列表 */
  private selectedEdgeIds: string[] = [];

  // ==================== 性能优化：使用 Set 和 Map 进行 O(1) 查找 ====================

  private nodeIdsSet = new Set<string>();
  private edgeIdsSet = new Set<string>();
  private nodesMap = new Map<string, FlowNode>();
  private edgesMap = new Map<string, FlowEdge>();

  // ==================== 订阅机制 ====================

  private subscribers: Set<(changeType: StateChangeType) => void> = new Set();

  // ==================== 增量更新支持 ====================

  /** 上次返回的节点数组引用（用于增量更新） */
  private lastNodesArray: FlowNode[] | null = null;

  /** 节点更新标记（用于增量更新） */
  private updatedNodeIds: Set<string> = new Set();

  constructor(options?: DefaultStateStoreOptions) {
    if (options?.nodes) {
      this.nodes = options.nodes.map(node => ({ ...node }));
      this.rebuildNodeIndexes();
    }

    if (options?.edges) {
      this.edges = options.edges.map(edge => ({ ...edge }));
      this.rebuildEdgeIndexes();
    }

    if (options?.viewport) {
      this.viewport = { ...options.viewport };
    }

    if (options?.selectedNodeIds) {
      this.selectedNodeIds = [...options.selectedNodeIds];
    }

    if (options?.selectedEdgeIds) {
      this.selectedEdgeIds = [...options.selectedEdgeIds];
    }
  }

  /**
   * 重建节点索引
   */
  private rebuildNodeIndexes(): void {
    this.nodeIdsSet.clear();
    this.nodesMap.clear();

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      this.nodeIdsSet.add(node.id);
      this.nodesMap.set(node.id, node);
    }
  }

  /**
   * 重建连接线索引
   */
  private rebuildEdgeIndexes(): void {
    this.edgeIdsSet.clear();
    this.edgesMap.clear();

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      this.edgeIdsSet.add(edge.id);
      this.edgesMap.set(edge.id, edge);
    }
  }

  /**
   * 通知订阅者状态变化
   *
   * @param changeType 变化类型，用于细粒度更新
   */
  private notifySubscribers(changeType: StateChangeType = 'all'): void {
    this.subscribers.forEach(callback => callback(changeType));
  }

  // ==================== 节点操作 ====================

  getNodes(): FlowNode[] {
    // 如果没有增量更新标记，直接返回新数组（首次调用或结构变化后）
    if (this.updatedNodeIds.size === 0 || !this.lastNodesArray) {
      this.lastNodesArray = this.nodes.map(node => ({ ...node }));
      return this.lastNodesArray;
    }

    // 如果数组长度变化，需要重新构建
    if (this.lastNodesArray.length !== this.nodes.length) {
      this.lastNodesArray = this.nodes.map(node => ({ ...node }));
      this.updatedNodeIds.clear();
      return this.lastNodesArray;
    }

    // 增量更新：按照 this.nodes 的顺序构建结果数组，只更新变化的节点
    // 确保返回的数组顺序与 this.nodes 一致，避免 DOM 节点顺序变化
    const { result, hasChanges } = incrementalUpdateNodes(
      this.nodes,
      this.lastNodesArray,
      this.updatedNodeIds
    );

    // 如果有变化，更新缓存
    if (hasChanges) {
      this.lastNodesArray = result;
    }

    // 清除更新标记
    this.updatedNodeIds.clear();

    // 如果有变化，返回新数组；否则返回原数组引用（Vue 不会触发更新）
    return hasChanges ? result : this.lastNodesArray;
  }

  setNodes(nodes: FlowNode[]): void {
    this.nodes = nodes.map(node => ({ ...node }));
    this.rebuildNodeIndexes();
    // 重置增量更新状态
    this.lastNodesArray = null;
    this.updatedNodeIds.clear();
    this.notifySubscribers('nodes');
  }

  addNode(node: FlowNode): void {
    if (this.nodeIdsSet.has(node.id)) {
      logger.warn(`Node with id "${node.id}" already exists`);
      return;
    }

    this.nodes.push({ ...node });
    this.nodeIdsSet.add(node.id);
    this.nodesMap.set(node.id, node);
    // 重置增量更新状态（数组结构变化）
    this.lastNodesArray = null;
    this.updatedNodeIds.clear();
    this.notifySubscribers('nodes');
  }

  addNodes(nodes: FlowNode[]): void {
    const validNodes = nodes.filter(n => !this.nodeIdsSet.has(n.id));

    if (validNodes.length === 0) return;

    this.nodes.push(...validNodes.map(node => ({ ...node })));

    for (let i = 0; i < validNodes.length; i++) {
      const node = validNodes[i];
      this.nodeIdsSet.add(node.id);
      this.nodesMap.set(node.id, node);
    }

    // 重置增量更新状态（数组结构变化）
    this.lastNodesArray = null;
    this.updatedNodeIds.clear();
    this.notifySubscribers('nodes');
  }

  updateNode(nodeId: string, updates: Partial<FlowNode>): void {
    const node = this.nodesMap.get(nodeId);
    if (!node) {
      logger.warn(`Node with id "${nodeId}" not found`);
      return;
    }

    // 更新节点属性
    Object.assign(node, updates);
    this.nodesMap.set(nodeId, node);

    // 标记该节点已更新（用于增量更新）
    this.updatedNodeIds.add(nodeId);

    // 如果数组结构变化（新增/删除），需要重置增量更新
    if (this.lastNodesArray && this.lastNodesArray.length !== this.nodes.length) {
      this.lastNodesArray = null;
      this.updatedNodeIds.clear();
    }

    this.notifySubscribers('nodes');
  }

  removeNode(nodeId: string): void {
    if (!this.nodeIdsSet.has(nodeId)) {
      return;
    }

    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.nodeIdsSet.delete(nodeId);
    this.nodesMap.delete(nodeId);

    // 同时删除相关的连接线
    const edgesToRemove: string[] = [];
    for (const [id, edge] of this.edgesMap) {
      if (edge.source === nodeId || edge.target === nodeId) {
        edgesToRemove.push(id);
      }
    }

    if (edgesToRemove.length > 0) {
      this.edges = this.edges.filter(e => !edgesToRemove.includes(e.id));
      edgesToRemove.forEach(id => {
        this.edgeIdsSet.delete(id);
        this.edgesMap.delete(id);
      });
    }

    // 从选中列表中移除
    const selectedIndex = this.selectedNodeIds.indexOf(nodeId);
    if (selectedIndex > -1) {
      this.selectedNodeIds.splice(selectedIndex, 1);
    }

    this.notifySubscribers('nodes');
  }

  removeNodes(nodeIds: string[]): void {
    const nodeIdsToRemove = new Set(nodeIds.filter(id => this.nodeIdsSet.has(id)));

    if (nodeIdsToRemove.size === 0) return;

    this.nodes = this.nodes.filter(n => !nodeIdsToRemove.has(n.id));

    nodeIdsToRemove.forEach(id => {
      this.nodeIdsSet.delete(id);
      this.nodesMap.delete(id);
    });

    // 同时删除相关的连接线
    const edgesToRemove: string[] = [];
    for (const [id, edge] of this.edgesMap) {
      if (nodeIdsToRemove.has(edge.source) || nodeIdsToRemove.has(edge.target)) {
        edgesToRemove.push(id);
      }
    }

    if (edgesToRemove.length > 0) {
      this.edges = this.edges.filter(e => !edgesToRemove.includes(e.id));
      edgesToRemove.forEach(id => {
        this.edgeIdsSet.delete(id);
        this.edgesMap.delete(id);
      });
    }

    // 从选中列表中移除
    this.selectedNodeIds = this.selectedNodeIds.filter(id => !nodeIdsToRemove.has(id));

    this.notifySubscribers('nodes');
  }

  getNode(nodeId: string): FlowNode | undefined {
    const node = this.nodesMap.get(nodeId);
    return node ? { ...node } : undefined;
  }

  hasNode(nodeId: string): boolean {
    return this.nodeIdsSet.has(nodeId);
  }

  // ==================== 连接线操作 ====================

  getEdges(): FlowEdge[] {
    return this.edges.map(edge => ({ ...edge }));
  }

  setEdges(edges: FlowEdge[]): void {
    this.edges = edges.map(edge => ({ ...edge }));
    this.rebuildEdgeIndexes();
    this.notifySubscribers('edges');
  }

  addEdge(edge: FlowEdge): void {
    if (this.edgeIdsSet.has(edge.id)) {
      logger.warn(`Edge with id "${edge.id}" already exists`);
      return;
    }

    if (!this.nodeIdsSet.has(edge.source)) {
      logger.warn(`Source node "${edge.source}" not found`);
      return;
    }

    if (!this.nodeIdsSet.has(edge.target)) {
      logger.warn(`Target node "${edge.target}" not found`);
      return;
    }

    this.edges.push({ ...edge });
    this.edgeIdsSet.add(edge.id);
    this.edgesMap.set(edge.id, edge);
    this.notifySubscribers('edges');
  }

  addEdges(edges: FlowEdge[]): void {
    const validEdges = edges.filter(
      e =>
        !this.edgeIdsSet.has(e.id) &&
        this.nodeIdsSet.has(e.source) &&
        this.nodeIdsSet.has(e.target)
    );

    if (validEdges.length === 0) return;

    this.edges.push(...validEdges.map(edge => ({ ...edge })));

    for (let i = 0; i < validEdges.length; i++) {
      const edge = validEdges[i];
      this.edgeIdsSet.add(edge.id);
      this.edgesMap.set(edge.id, edge);
    }

    this.notifySubscribers('edges');
  }

  updateEdge(edgeId: string, updates: Partial<FlowEdge>): void {
    const edge = this.edgesMap.get(edgeId);
    if (!edge) {
      logger.warn(`Edge with id "${edgeId}" not found`);
      return;
    }

    Object.assign(edge, updates);
    this.edgesMap.set(edgeId, edge);
    this.notifySubscribers('edges');
  }

  removeEdge(edgeId: string): void {
    const index = this.edges.findIndex(e => e.id === edgeId);
    if (index === -1) {
      return;
    }

    this.edges.splice(index, 1);
    this.edgeIdsSet.delete(edgeId);
    this.edgesMap.delete(edgeId);

    // 从选中列表中移除
    const selectedIndex = this.selectedEdgeIds.indexOf(edgeId);
    if (selectedIndex > -1) {
      this.selectedEdgeIds.splice(selectedIndex, 1);
    }

    this.notifySubscribers('edges');
  }

  removeEdges(edgeIds: string[]): void {
    edgeIds.forEach(edgeId => this.removeEdge(edgeId));
  }

  getEdge(edgeId: string): FlowEdge | undefined {
    const edge = this.edgesMap.get(edgeId);
    return edge ? { ...edge } : undefined;
  }

  getNodeEdges(nodeId: string): FlowEdge[] {
    return this.edges.filter(edge => edge.source === nodeId || edge.target === nodeId).map(edge => ({ ...edge }));
  }

  // ==================== 视口操作 ====================

  getViewport(): FlowViewport {
    return { ...this.viewport };
  }

  setViewport(viewport: Partial<FlowViewport>): void {
    this.viewport = {
      ...this.viewport,
      ...viewport
    };
    this.notifySubscribers('viewport');
  }

  /**
   * 平移视口（辅助方法，不在接口中）
   *
   * @param deltaX 水平偏移
   * @param deltaY 垂直偏移
   */
  panViewport(deltaX: number, deltaY: number): void {
    this.viewport.x += deltaX;
    this.viewport.y += deltaY;
    this.notifySubscribers('viewport');
  }

  /**
   * 缩放视口（辅助方法，不在接口中）
   *
   * @param zoom 缩放比例
   * @param centerX 缩放中心 X（可选）
   * @param centerY 缩放中心 Y（可选）
   */
  zoomViewport(zoom: number, centerX?: number, centerY?: number): void {
    const oldZoom = this.viewport.zoom;
    this.viewport.zoom = zoom;

    if (centerX !== undefined && centerY !== undefined) {
      const scale = zoom / oldZoom;
      this.viewport.x = centerX - (centerX - this.viewport.x) * scale;
      this.viewport.y = centerY - (centerY - this.viewport.y) * scale;
    }

    this.notifySubscribers('viewport');
  }

  // ==================== 选择操作 ====================

  getSelectedNodeIds(): string[] {
    return [...this.selectedNodeIds];
  }

  setSelectedNodeIds(ids: string[]): void {
    this.selectedNodeIds = [...ids];
    this.notifySubscribers('selectedNodeIds');
  }

  getSelectedEdgeIds(): string[] {
    return [...this.selectedEdgeIds];
  }

  setSelectedEdgeIds(ids: string[]): void {
    this.selectedEdgeIds = [...ids];
    this.notifySubscribers('selectedEdgeIds');
  }

  // ==================== 订阅机制 ====================

  subscribe(callback: (changeType: StateChangeType) => void): Unsubscribe {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }
}

