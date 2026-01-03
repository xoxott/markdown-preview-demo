/**
 * 状态存储接口（框架无关）
 *
 * 定义状态存储的标准接口，允许外部实现自定义状态管理
 * （如 Pinia、Vuex、Zustand 等）
 */

import type { FlowNode } from '../../../types/flow-node';
import type { FlowEdge } from '../../../types/flow-edge';
import type { FlowViewport } from '../../../types/flow-config';

/**
 * 取消订阅函数类型
 */
export type Unsubscribe = () => void;

/**
 * 状态存储接口
 *
 * 所有状态存储实现必须实现此接口
 */
export interface IStateStore {
  // ==================== 节点操作 ====================

  /**
   * 获取所有节点
   *
   * @returns 节点列表
   */
  getNodes(): FlowNode[];

  /**
   * 设置所有节点
   *
   * @param nodes 节点列表
   */
  setNodes(nodes: FlowNode[]): void;

  /**
   * 添加节点
   *
   * @param node 节点数据
   */
  addNode(node: FlowNode): void;

  /**
   * 批量添加节点
   *
   * @param nodes 节点数据数组
   */
  addNodes(nodes: FlowNode[]): void;

  /**
   * 更新节点
   *
   * @param nodeId 节点 ID
   * @param updates 更新数据
   */
  updateNode(nodeId: string, updates: Partial<FlowNode>): void;

  /**
   * 删除节点
   *
   * @param nodeId 节点 ID
   */
  removeNode(nodeId: string): void;

  /**
   * 批量删除节点
   *
   * @param nodeIds 节点 ID 数组
   */
  removeNodes(nodeIds: string[]): void;

  /**
   * 获取节点
   *
   * @param nodeId 节点 ID
   * @returns 节点数据，如果不存在则返回 undefined
   */
  getNode(nodeId: string): FlowNode | undefined;

  /**
   * 检查节点是否存在
   *
   * @param nodeId 节点 ID
   * @returns 是否存在
   */
  hasNode(nodeId: string): boolean;

  // ==================== 连接线操作 ====================

  /**
   * 获取所有连接线
   *
   * @returns 连接线列表
   */
  getEdges(): FlowEdge[];

  /**
   * 设置所有连接线
   *
   * @param edges 连接线列表
   */
  setEdges(edges: FlowEdge[]): void;

  /**
   * 添加连接线
   *
   * @param edge 连接线数据
   */
  addEdge(edge: FlowEdge): void;

  /**
   * 批量添加连接线
   *
   * @param edges 连接线数据数组
   */
  addEdges(edges: FlowEdge[]): void;

  /**
   * 更新连接线
   *
   * @param edgeId 连接线 ID
   * @param updates 更新数据
   */
  updateEdge(edgeId: string, updates: Partial<FlowEdge>): void;

  /**
   * 删除连接线
   *
   * @param edgeId 连接线 ID
   */
  removeEdge(edgeId: string): void;

  /**
   * 批量删除连接线
   *
   * @param edgeIds 连接线 ID 数组
   */
  removeEdges(edgeIds: string[]): void;

  /**
   * 获取连接线
   *
   * @param edgeId 连接线 ID
   * @returns 连接线数据，如果不存在则返回 undefined
   */
  getEdge(edgeId: string): FlowEdge | undefined;

  /**
   * 获取节点的所有连接线
   *
   * @param nodeId 节点 ID
   * @returns 连接线列表
   */
  getNodeEdges(nodeId: string): FlowEdge[];

  // ==================== 视口操作 ====================

  /**
   * 获取视口状态
   *
   * @returns 视口状态
   */
  getViewport(): FlowViewport;

  /**
   * 设置视口状态
   *
   * @param viewport 视口状态（部分更新）
   */
  setViewport(viewport: Partial<FlowViewport>): void;

  // ==================== 选择操作（可选）====================

  /**
   * 获取选中的节点 ID 列表
   *
   * @returns 节点 ID 数组
   */
  getSelectedNodeIds?(): string[];

  /**
   * 设置选中的节点 ID 列表
   *
   * @param ids 节点 ID 数组
   */
  setSelectedNodeIds?(ids: string[]): void;

  /**
   * 获取选中的连接线 ID 列表
   *
   * @returns 连接线 ID 数组
   */
  getSelectedEdgeIds?(): string[];

  /**
   * 设置选中的连接线 ID 列表
   *
   * @param ids 连接线 ID 数组
   */
  setSelectedEdgeIds?(ids: string[]): void;

  // ==================== 订阅机制（可选）====================

  /**
   * 订阅状态变化
   *
   * 用于实现响应式更新（如 Vue、React 等）
   * 支持细粒度变化通知，避免不必要的深度监听
   *
   * @param callback 变化回调函数，接收变化类型参数
   * @returns 取消订阅函数
   */
  subscribe?(callback: (changeType: StateChangeType) => void): Unsubscribe;
}

/**
 * 状态变化类型
 */
export type StateChangeType = 'nodes' | 'edges' | 'viewport' | 'selectedNodeIds' | 'selectedEdgeIds' | 'all';

