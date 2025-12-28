/**
 * 数据转换工具
 *
 * 用于在 API 数据和 UI 数据之间转换
 * - API 数据：需要持久化到后端的业务数据
 * - UI 数据：前端缓存的界面状态，存储在 localStorage
 */

import type {
  WorkflowNodeWithUI,
  WorkflowConnectionWithUI,
  NodeUIData,
  ConnectionUIData,
  LocalWorkflowData,
  Viewport
} from '../types';
import { localStg } from '@/utils/storage';

// ==================== 本地存储 Key ====================

/**
 * 获取工作流 UI 数据的存储 Key
 */
function getWorkflowUIStorageKey(workflowId: string): `workflow_ui_${string}` {
  return `workflow_ui_${workflowId}`;
}

// ==================== 数据转换 ====================

/**
 * 从 API 数据创建完整的节点数据
 *
 * @param apiNode API 返回的节点数据（包含 position）
 * @param uiData 可选的 UI 数据，如果不提供则使用默认值
 * @returns 完整的节点数据（业务 + UI）
 */
export function createNodeWithUI(
  apiNode: Api.Workflow.WorkflowNode,
  uiData?: Partial<NodeUIData>
): WorkflowNodeWithUI {
  const defaultUIData: NodeUIData = {
    size: { width: 220, height: 72 },
    uiState: {
      selected: false,
      locked: false,
      hovered: false,
      dragging: false
    },
    zIndex: 1
  };

  return {
    business: apiNode,  // 包含 position
    ui: { ...defaultUIData, ...uiData }
  };
}

/**
 * 从 API 数据创建完整的连接线数据
 *
 * @param apiConnection API 返回的连接线数据
 * @param uiData 可选的 UI 数据，如果不提供则使用默认值
 * @returns 完整的连接线数据（业务 + UI）
 */
export function createConnectionWithUI(
  apiConnection: Api.Workflow.Connection,
  uiData?: Partial<ConnectionUIData>
): WorkflowConnectionWithUI {
  const defaultUIData: ConnectionUIData = {
    renderStrategy: 'bezier',
    uiState: {
      selected: false,
      hovered: false
    }
  };

  return {
    business: apiConnection,
    ui: { ...defaultUIData, ...uiData }
  };
}

/**
 * 提取节点的业务数据（用于保存到后端）
 *
 * @param nodeWithUI 完整的节点数据
 * @returns 只包含业务数据的节点
 */
export function extractNodeBusinessData(
  nodeWithUI: WorkflowNodeWithUI
): Api.Workflow.WorkflowNode {
  return nodeWithUI.business;
}

/**
 * 提取连接线的业务数据（用于保存到后端）
 *
 * @param connectionWithUI 完整的连接线数据
 * @returns 只包含业务数据的连接线
 */
export function extractConnectionBusinessData(
  connectionWithUI: WorkflowConnectionWithUI
): Api.Workflow.Connection {
  return connectionWithUI.business;
}

// ==================== 本地存储操作 ====================

/**
 * 保存工作流 UI 数据到本地存储
 *
 * 注意：只保存纯 UI 数据（样式、状态等）
 * 节点位置和视口状态已在后端保存，不需要在这里存储
 *
 * @param workflowId 工作流 ID
 * @param nodes 节点数据（含 UI）
 * @param connections 连接线数据（含 UI）
 */
export function saveWorkflowUIToLocal(
  workflowId: string,
  nodes: WorkflowNodeWithUI[],
  connections: WorkflowConnectionWithUI[]
): void {
  const nodesUI: Record<string, NodeUIData> = {};
  nodes.forEach(node => {
    nodesUI[node.business.id] = node.ui;
  });

  const connectionsUI: Record<string, ConnectionUIData> = {};
  connections.forEach(conn => {
    connectionsUI[conn.business.id] = conn.ui;
  });

  const localData: LocalWorkflowData = {
    workflowId,
    nodesUI,
    connectionsUI,
    lastUpdated: Date.now()
  };

  localStg.set(getWorkflowUIStorageKey(workflowId), localData);
}

/**
 * 从本地存储加载工作流 UI 数据
 *
 * @param workflowId 工作流 ID
 * @returns 本地存储的 UI 数据，如果不存在则返回 null
 */
export function loadWorkflowUIFromLocal(
  workflowId: string
): LocalWorkflowData | null {
  const localData = localStg.get(getWorkflowUIStorageKey(workflowId));
  if (!localData) return null;

  // 验证数据有效性
  if (localData.workflowId !== workflowId) {
    console.warn('Workflow ID mismatch in local storage');
    return null;
  }

  return localData as LocalWorkflowData;
}

/**
 * 清除工作流的本地 UI 数据
 *
 * @param workflowId 工作流 ID
 */
export function clearWorkflowUIFromLocal(workflowId: string): void {
  localStg.remove(getWorkflowUIStorageKey(workflowId));
}

/**
 * 合并 API 数据和本地 UI 数据
 *
 * @param apiNodes API 返回的节点数据（包含 position）
 * @param apiConnections API 返回的连接线数据
 * @param apiViewport API 返回的视口数据
 * @param localData 本地存储的 UI 数据（样式、状态等）
 * @returns 合并后的完整数据
 */
export function mergeAPIAndLocalData(
  apiNodes: Api.Workflow.WorkflowNode[],
  apiConnections: Api.Workflow.Connection[],
  apiViewport: Viewport | undefined,
  localData: LocalWorkflowData | null
): {
  nodes: WorkflowNodeWithUI[];
  connections: WorkflowConnectionWithUI[];
  viewport: Viewport;
} {
  // 合并节点数据：API 数据（包含 position）+ 本地 UI 数据（样式、状态）
  const nodes = apiNodes.map(apiNode => {
    const localUI = localData?.nodesUI[apiNode.id];
    return createNodeWithUI(apiNode, localUI);
  });

  // 合并连接线数据
  const connections = apiConnections.map(apiConn => {
    const localUI = localData?.connectionsUI[apiConn.id];
    return createConnectionWithUI(apiConn, localUI);
  });

  // 使用 API 返回的视口数据，如果没有则使用默认值
  const viewport: Viewport = apiViewport || {
    x: 0,
    y: 0,
    zoom: 1
  };

  return { nodes, connections, viewport };
}

/**
 * 准备保存到后端的数据
 *
 * @param nodes 节点数据（含 UI）
 * @param connections 连接线数据（含 UI）
 * @param viewport 视口状态
 * @returns 包含业务数据和位置信息的工作流定义
 */
export function prepareWorkflowForSave(
  nodes: WorkflowNodeWithUI[],
  connections: WorkflowConnectionWithUI[],
  viewport: Viewport
): Api.Workflow.WorkflowDefinition {
  return {
    nodes: nodes.map(extractNodeBusinessData),  // 包含 position
    connections: connections.map(extractConnectionBusinessData),
    viewport  // 视口状态也保存到后端
  };
}

