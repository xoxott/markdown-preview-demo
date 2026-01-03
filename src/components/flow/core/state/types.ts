/**
 * Flow 状态管理类型定义
 */

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

