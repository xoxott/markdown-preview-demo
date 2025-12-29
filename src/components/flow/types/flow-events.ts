/**
 * Flow 事件类型定义
 *
 * 定义图形编辑器的所有事件回调接口
 * 类似 VueFlow/ReactFlow 的事件系统
 */

import type { FlowNode } from './flow-node';
import type { FlowEdge } from './flow-edge';
import type { FlowViewport } from './flow-config';

/**
 * 节点事件
 */
export interface FlowNodeEvents {
  /** 节点点击事件 */
  onNodeClick?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点双击事件 */
  onNodeDoubleClick?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽事件（拖拽过程中持续触发） */
  onNodeDrag?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点开始拖拽 */
  onNodeDragStart?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点结束拖拽 */
  onNodeDragStop?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点鼠标进入 */
  onNodeMouseEnter?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点鼠标离开 */
  onNodeMouseLeave?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点右键菜单 */
  onNodeContextMenu?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点添加 */
  onNodeAdd?: (node: FlowNode) => void;
  /** 节点删除 */
  onNodeRemove?: (node: FlowNode) => void;
  /** 节点更新 */
  onNodeUpdate?: (node: FlowNode) => void;
}

/**
 * 连接线事件
 */
export interface FlowEdgeEvents {
  /** 连接线点击事件 */
  onEdgeClick?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线双击事件 */
  onEdgeDoubleClick?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线鼠标进入 */
  onEdgeMouseEnter?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线鼠标离开 */
  onEdgeMouseLeave?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线右键菜单 */
  onEdgeContextMenu?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线添加 */
  onEdgeAdd?: (edge: FlowEdge) => void;
  /** 连接线删除 */
  onEdgeRemove?: (edge: FlowEdge) => void;
  /** 连接线更新 */
  onEdgeUpdate?: (edge: FlowEdge) => void;
}

/**
 * 连接事件
 */
export interface FlowConnectionEvents {
  /** 连接创建事件（返回 false 可阻止连接） */
  onConnect?: (connection: FlowEdge) => boolean | void | Promise<boolean | void>;
  /** 开始连接（从端口拖拽开始） */
  onConnectStart?: (event: MouseEvent, nodeId: string, handleId: string) => void;
  /** 连接结束（鼠标抬起） */
  onConnectEnd?: (event: MouseEvent) => void;
  /** 连接被拒绝（验证失败） */
  onConnectReject?: (connection: Partial<FlowEdge>, reason?: string) => void;
}

/**
 * 画布事件
 */
export interface FlowCanvasEvents {
  /** 画布点击事件 */
  onCanvasClick?: (event: MouseEvent) => void;
  /** 画布双击事件 */
  onCanvasDoubleClick?: (event: MouseEvent) => void;
  /** 画布右键菜单 */
  onCanvasContextMenu?: (event: MouseEvent) => void;
  /** 画布平移事件 */
  onCanvasPan?: (viewport: FlowViewport) => void;
  /** 画布缩放事件 */
  onCanvasZoom?: (viewport: FlowViewport) => void;
  /** 画布鼠标进入 */
  onCanvasMouseEnter?: (event: MouseEvent) => void;
  /** 画布鼠标离开 */
  onCanvasMouseLeave?: (event: MouseEvent) => void;
  /** 画布鼠标移动 */
  onCanvasMouseMove?: (event: MouseEvent) => void;
}

/**
 * 选择事件
 */
export interface FlowSelectionEvents {
  /** 选择变化事件 */
  onSelectionChange?: (selectedNodes: FlowNode[], selectedEdges: FlowEdge[]) => void;
  /** 开始选择（框选开始） */
  onSelectionStart?: (event: MouseEvent) => void;
  /** 结束选择（框选结束） */
  onSelectionEnd?: (event: MouseEvent) => void;
}

/**
 * 视口事件
 */
export interface FlowViewportEvents {
  /** 视口变化事件 */
  onViewportChange?: (viewport: FlowViewport) => void;
  /** 视口变化开始 */
  onViewportChangeStart?: (viewport: FlowViewport) => void;
  /** 视口变化结束 */
  onViewportChangeEnd?: (viewport: FlowViewport) => void;
}

/**
 * 数据变化事件
 */
export interface FlowDataEvents {
  /** 节点数据变化 */
  onNodesChange?: (nodes: FlowNode[]) => void;
  /** 连接线数据变化 */
  onEdgesChange?: (edges: FlowEdge[]) => void;
  /** 完整数据变化 */
  onDataChange?: (data: { nodes: FlowNode[]; edges: FlowEdge[] }) => void;
}

/**
 * 合并所有事件类型
 */
export interface FlowEvents
  extends FlowNodeEvents,
    FlowEdgeEvents,
    FlowConnectionEvents,
    FlowCanvasEvents,
    FlowSelectionEvents,
    FlowViewportEvents,
    FlowDataEvents {}

