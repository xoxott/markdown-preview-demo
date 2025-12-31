/**
 * Flow 状态管理器
 *
 * 管理图形编辑器的所有状态：节点、连接线、视口、选择、历史记录等
 */

import { ref, type Ref } from 'vue';
import type { FlowNode } from '../../types/flow-node';
import type { FlowEdge } from '../../types/flow-edge';
import type { FlowViewport } from '../../types/flow-config';

/**
 * 状态快照
 */
export interface FlowStateSnapshot {
  /** 节点列表 */
  nodes: FlowNode[];
  /** 连接线列表 */
  edges: FlowEdge[];
  /** 视口状态 */
  viewport: FlowViewport;
  /** 选中的节点 ID 列表 */
  selectedNodeIds: string[];
  /** 选中的连接线 ID 列表 */
  selectedEdgeIds: string[];
  /** 时间戳 */
  timestamp: number;
}

/**
 * Flow 状态管理器
 *
 * 管理图形编辑器的所有状态
 */
export class FlowStateManager {
  /** 节点列表 */
  public readonly nodes: Ref<FlowNode[]>;
  /** 连接线列表 */
  public readonly edges: Ref<FlowEdge[]>;
  /** 视口状态 */
  public readonly viewport: Ref<FlowViewport>;
  /** 选中的节点 ID 列表 */
  public readonly selectedNodeIds: Ref<string[]>;
  /** 选中的连接线 ID 列表 */
  public readonly selectedEdgeIds: Ref<string[]>;
  /** 历史记录 */
  private history: FlowStateSnapshot[] = [];
  /** 历史记录指针 */
  private historyIndex: number = -1;
  /** 最大历史记录数量 */
  private maxHistorySize: number = 50;

  // ✅ 性能优化：使用 Set 和 Map 进行 O(1) 查找
  private nodeIdsSet = new Set<string>();
  private edgeIdsSet = new Set<string>();
  private nodesMap = new Map<string, FlowNode>();
  private edgesMap = new Map<string, FlowEdge>();

  constructor(initialState?: {
    nodes?: FlowNode[];
    edges?: FlowEdge[];
    viewport?: FlowViewport;
    maxHistorySize?: number;
  }) {
    this.nodes = ref(initialState?.nodes || []);
    this.edges = ref(initialState?.edges || []);
    this.viewport = ref(
      initialState?.viewport || { x: 0, y: 0, zoom: 1 }
    );
    this.selectedNodeIds = ref<string[]>([]);
    this.selectedEdgeIds = ref<string[]>([]);
    this.maxHistorySize = initialState?.maxHistorySize || 50;

    // ✅ 初始化索引
    this.rebuildIndexes();

    // 保存初始状态
    if (initialState) {
      this.pushHistory();
    }
  }

  // ✅ 重建索引（用于批量操作后同步）
  private rebuildIndexes(): void {
    this.nodeIdsSet.clear();
    this.nodesMap.clear();

    for (let i = 0; i < this.nodes.value.length; i++) {
      const node = this.nodes.value[i];
      this.nodeIdsSet.add(node.id);
      this.nodesMap.set(node.id, node);
    }

    this.edgeIdsSet.clear();
    this.edgesMap.clear();

    for (let i = 0; i < this.edges.value.length; i++) {
      const edge = this.edges.value[i];
      this.edgeIdsSet.add(edge.id);
      this.edgesMap.set(edge.id, edge);
    }
  }

  // ==================== 节点操作 ====================

  /**
   * 添加节点
   *
   * @param node 节点数据
   */
  addNode(node: FlowNode): void {
    // ✅ O(1) 查找
    if (this.nodeIdsSet.has(node.id)) {
      console.warn(`Node with id "${node.id}" already exists`);
      return;
    }

    this.nodes.value.push(node);
    this.nodeIdsSet.add(node.id);
    this.nodesMap.set(node.id, node);
  }

  /**
   * 批量添加节点
   *
   * @param nodes 节点数据数组
   */
  addNodes(nodes: FlowNode[]): void {
    // ✅ 批量操作优化：过滤 + 一次性更新
    const validNodes = nodes.filter(n => !this.nodeIdsSet.has(n.id));

    if (validNodes.length === 0) return;

    this.nodes.value.push(...validNodes);

    for (let i = 0; i < validNodes.length; i++) {
      const node = validNodes[i];
      this.nodeIdsSet.add(node.id);
      this.nodesMap.set(node.id, node);
    }
  }

  /**
   * 更新节点
   *
   * @param nodeId 节点 ID
   * @param updates 要更新的数据
   */
  updateNode(nodeId: string, updates: Partial<FlowNode>): void {
    // ✅ O(1) 查找
    const node = this.nodesMap.get(nodeId);
    if (!node) {
      console.warn(`Node with id "${nodeId}" not found`);
      return;
    }

    // 更新节点
    Object.assign(node, updates);

    // 触发响应式更新
    this.nodes.value = [...this.nodes.value];

    // 更新 Map
    this.nodesMap.set(nodeId, node);
  }

  /**
   * 删除节点
   *
   * @param nodeId 节点 ID
   */
  removeNode(nodeId: string): void {
    // ✅ O(1) 查找
    if (!this.nodeIdsSet.has(nodeId)) {
      return;
    }

    this.nodes.value = this.nodes.value.filter(n => n.id !== nodeId);
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
      this.edges.value = this.edges.value.filter(e => !edgesToRemove.includes(e.id));
      edgesToRemove.forEach(id => {
        this.edgeIdsSet.delete(id);
        this.edgesMap.delete(id);
      });
    }

    // 从选中列表中移除
    const selectedIndex = this.selectedNodeIds.value.indexOf(nodeId);
    if (selectedIndex > -1) {
      this.selectedNodeIds.value.splice(selectedIndex, 1);
    }
  }

  /**
   * 批量删除节点
   *
   * @param nodeIds 节点 ID 数组
   */
  removeNodes(nodeIds: string[]): void {
    // ✅ 批量操作优化：一次性过滤
    const nodeIdsToRemove = new Set(nodeIds.filter(id => this.nodeIdsSet.has(id)));

    if (nodeIdsToRemove.size === 0) return;

    this.nodes.value = this.nodes.value.filter(n => !nodeIdsToRemove.has(n.id));

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
      this.edges.value = this.edges.value.filter(e => !edgesToRemove.includes(e.id));
      edgesToRemove.forEach(id => {
        this.edgeIdsSet.delete(id);
        this.edgesMap.delete(id);
      });
    }

    // 从选中列表中移除
    this.selectedNodeIds.value = this.selectedNodeIds.value.filter(
      id => !nodeIdsToRemove.has(id)
    );
  }

  /**
   * 获取节点
   *
   * @param nodeId 节点 ID
   * @returns 节点数据，如果不存在则返回 undefined
   */
  getNode(nodeId: string): FlowNode | undefined {
    // ✅ O(1) 查找
    return this.nodesMap.get(nodeId);
  }

  /**
   * 检查节点是否存在
   *
   * @param nodeId 节点 ID
   * @returns 是否存在
   */
  hasNode(nodeId: string): boolean {
    // ✅ O(1) 查找
    return this.nodeIdsSet.has(nodeId);
  }

  // ==================== 连接线操作 ====================

  /**
   * 添加连接线
   *
   * @param edge 连接线数据
   */
  addEdge(edge: FlowEdge): void {
    // ✅ O(1) 查找
    if (this.edgeIdsSet.has(edge.id)) {
      console.warn(`Edge with id "${edge.id}" already exists`);
      return;
    }

    // ✅ O(1) 查找节点
    if (!this.nodeIdsSet.has(edge.source)) {
      console.warn(`Source node "${edge.source}" not found`);
      return;
    }

    if (!this.nodeIdsSet.has(edge.target)) {
      console.warn(`Target node "${edge.target}" not found`);
      return;
    }

    this.edges.value.push(edge);
    this.edgeIdsSet.add(edge.id);
    this.edgesMap.set(edge.id, edge);
  }

  /**
   * 批量添加连接线
   *
   * @param edges 连接线数据数组
   */
  addEdges(edges: FlowEdge[]): void {
    // ✅ 批量操作优化
    const validEdges = edges.filter(e =>
      !this.edgeIdsSet.has(e.id) &&
      this.nodeIdsSet.has(e.source) &&
      this.nodeIdsSet.has(e.target)
    );

    if (validEdges.length === 0) return;

    this.edges.value.push(...validEdges);

    for (let i = 0; i < validEdges.length; i++) {
      const edge = validEdges[i];
      this.edgeIdsSet.add(edge.id);
      this.edgesMap.set(edge.id, edge);
    }
  }

  /**
   * 更新连接线
   *
   * @param edgeId 连接线 ID
   * @param updates 要更新的数据
   */
  updateEdge(edgeId: string, updates: Partial<FlowEdge>): void {
    // ✅ O(1) 查找
    const edge = this.edgesMap.get(edgeId);
    if (!edge) {
      console.warn(`Edge with id "${edgeId}" not found`);
      return;
    }

    // 更新连接线
    Object.assign(edge, updates);

    // 触发响应式更新
    this.edges.value = [...this.edges.value];

    // 更新 Map
    this.edgesMap.set(edgeId, edge);
  }

  /**
   * 删除连接线
   *
   * @param edgeId 连接线 ID
   */
  removeEdge(edgeId: string): void {
    const index = this.edges.value.findIndex(e => e.id === edgeId);
    if (index === -1) {
      return;
    }

    this.edges.value.splice(index, 1);

    // 从选中列表中移除
    const selectedIndex = this.selectedEdgeIds.value.indexOf(edgeId);
    if (selectedIndex > -1) {
      this.selectedEdgeIds.value.splice(selectedIndex, 1);
    }
  }

  /**
   * 批量删除连接线
   *
   * @param edgeIds 连接线 ID 数组
   */
  removeEdges(edgeIds: string[]): void {
    edgeIds.forEach(edgeId => this.removeEdge(edgeId));
  }

  /**
   * 获取连接线
   *
   * @param edgeId 连接线 ID
   * @returns 连接线数据，如果不存在则返回 undefined
   */
  getEdge(edgeId: string): FlowEdge | undefined {
    return this.edges.value.find(e => e.id === edgeId);
  }

  /**
   * 获取节点的所有连接线
   *
   * @param nodeId 节点 ID
   * @returns 连接线数组
   */
  getNodeEdges(nodeId: string): FlowEdge[] {
    return this.edges.value.filter(
      edge => edge.source === nodeId || edge.target === nodeId
    );
  }

  // ==================== 视口操作 ====================

  /**
   * 更新视口
   *
   * @param viewport 视口数据
   */
  setViewport(viewport: Partial<FlowViewport>): void {
    this.viewport.value = {
      ...this.viewport.value,
      ...viewport
    };
  }

  /**
   * 平移视口
   *
   * @param deltaX 水平偏移
   * @param deltaY 垂直偏移
   */
  panViewport(deltaX: number, deltaY: number): void {
    this.viewport.value.x += deltaX;
    this.viewport.value.y += deltaY;
  }

  /**
   * 缩放视口
   *
   * @param zoom 缩放比例
   * @param centerX 缩放中心 X（可选）
   * @param centerY 缩放中心 Y（可选）
   */
  zoomViewport(zoom: number, centerX?: number, centerY?: number): void {
    const oldZoom = this.viewport.value.zoom;
    this.viewport.value.zoom = zoom;

    // 如果提供了缩放中心，需要调整视口位置
    if (centerX !== undefined && centerY !== undefined) {
      const scale = zoom / oldZoom;
      this.viewport.value.x = centerX - (centerX - this.viewport.value.x) * scale;
      this.viewport.value.y = centerY - (centerY - this.viewport.value.y) * scale;
    }
  }

  // ==================== 选择操作 ====================

  /**
   * 选择节点
   *
   * @param nodeId 节点 ID
   * @param addToSelection 是否添加到当前选择（多选）
   */
  selectNode(nodeId: string, addToSelection: boolean = false): void {
    if (!this.hasNode(nodeId)) {
      return;
    }

    if (addToSelection) {
      if (!this.selectedNodeIds.value.includes(nodeId)) {
        this.selectedNodeIds.value.push(nodeId);
      }
    } else {
      this.selectedNodeIds.value = [nodeId];
      this.selectedEdgeIds.value = [];
    }
  }

  /**
   * 选择多个节点
   *
   * @param nodeIds 节点 ID 数组
   */
  selectNodes(nodeIds: string[]): void {
    this.selectedNodeIds.value = nodeIds.filter(id => this.hasNode(id));
    this.selectedEdgeIds.value = [];
  }

  /**
   * 选择连接线
   *
   * @param edgeId 连接线 ID
   * @param addToSelection 是否添加到当前选择（多选）
   */
  selectEdge(edgeId: string, addToSelection: boolean = false): void {
    if (!this.edges.value.some(e => e.id === edgeId)) {
      return;
    }

    if (addToSelection) {
      if (!this.selectedEdgeIds.value.includes(edgeId)) {
        this.selectedEdgeIds.value.push(edgeId);
      }
    } else {
      this.selectedEdgeIds.value = [edgeId];
      this.selectedNodeIds.value = [];
    }
  }

  /**
   * 取消选择
   */
  deselectAll(): void {
    this.selectedNodeIds.value = [];
    this.selectedEdgeIds.value = [];
  }

  /**
   * 获取选中的节点
   *
   * @returns 选中的节点数组
   */
  getSelectedNodes(): FlowNode[] {
    return this.nodes.value.filter(node =>
      this.selectedNodeIds.value.includes(node.id)
    );
  }

  /**
   * 获取选中的连接线
   *
   * @returns 选中的连接线数组
   */
  getSelectedEdges(): FlowEdge[] {
    return this.edges.value.filter(edge =>
      this.selectedEdgeIds.value.includes(edge.id)
    );
  }

  // ==================== 历史记录操作 ====================

  /**
   * 保存状态到历史记录
   */
  pushHistory(): void {
    const snapshot: FlowStateSnapshot = {
      nodes: this.nodes.value.map(node => ({ ...node })),
      edges: this.edges.value.map(edge => ({ ...edge })),
      viewport: { ...this.viewport.value },
      selectedNodeIds: [...this.selectedNodeIds.value],
      selectedEdgeIds: [...this.selectedEdgeIds.value],
      timestamp: Date.now()
    };

    // 删除当前指针之后的历史记录（如果有撤销操作）
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // 添加新的历史记录
    this.history.push(snapshot);

    // 限制历史记录数量
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  /**
   * 撤销操作
   *
   * @returns 是否成功撤销
   */
  undo(): boolean {
    if (this.historyIndex <= 0) {
      return false;
    }

    this.historyIndex--;
    this.restoreSnapshotInternal(this.history[this.historyIndex]);
    return true;
  }

  /**
   * 重做操作
   *
   * @returns 是否成功重做
   */
  redo(): boolean {
    if (this.historyIndex >= this.history.length - 1) {
      return false;
    }

    this.historyIndex++;
    this.restoreSnapshotInternal(this.history[this.historyIndex]);
    return true;
  }

  /**
   * 检查是否可以撤销
   *
   * @returns 是否可以撤销
   */
  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  /**
   * 检查是否可以重做
   *
   * @returns 是否可以重做
   */
  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  /**
   * 恢复状态快照（内部方法）
   *
   * @param snapshot 状态快照
   */
  private restoreSnapshotInternal(snapshot: FlowStateSnapshot): void {
    this.nodes.value = snapshot.nodes.map(node => ({ ...node }));
    this.edges.value = snapshot.edges.map(edge => ({ ...edge }));
    this.viewport.value = { ...snapshot.viewport };
    this.selectedNodeIds.value = [...snapshot.selectedNodeIds];
    this.selectedEdgeIds.value = [...snapshot.selectedEdgeIds];
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
  }

  /**
   * 获取历史记录数量
   *
   * @returns 历史记录数量
   */
  getHistorySize(): number {
    return this.history.length;
  }

  // ==================== 状态快照 ====================

  /**
   * 创建状态快照
   *
   * @returns 状态快照
   */
  createSnapshot(): FlowStateSnapshot {
    return {
      nodes: this.nodes.value.map(node => ({ ...node })),
      edges: this.edges.value.map(edge => ({ ...edge })),
      viewport: { ...this.viewport.value },
      selectedNodeIds: [...this.selectedNodeIds.value],
      selectedEdgeIds: [...this.selectedEdgeIds.value],
      timestamp: Date.now()
    };
  }

  /**
   * 恢复状态快照
   *
   * @param snapshot 状态快照
   */
  restoreSnapshot(snapshot: FlowStateSnapshot): void {
    this.nodes.value = snapshot.nodes.map(node => ({ ...node }));
    this.edges.value = snapshot.edges.map(edge => ({ ...edge }));
    this.viewport.value = { ...snapshot.viewport };
    this.selectedNodeIds.value = [...snapshot.selectedNodeIds];
    this.selectedEdgeIds.value = [...snapshot.selectedEdgeIds];
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.nodes.value = [];
    this.edges.value = [];
    this.viewport.value = { x: 0, y: 0, zoom: 1 };
    this.selectedNodeIds.value = [];
    this.selectedEdgeIds.value = [];
    this.clearHistory();
  }
}

