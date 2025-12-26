import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';

export interface ConnectionDraft {
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId?: string;
  targetPortId?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function useNodeConnection() {
  const connections = ref<Api.Workflow.Connection[]>([]);
  const connectionDraft = ref<ConnectionDraft | null>(null);
  const isConnecting = computed(() => connectionDraft.value !== null);

  /** 开始连接 */
  function startConnection(nodeId: string, portId: string, x: number, y: number) {
    connectionDraft.value = {
      sourceNodeId: nodeId,
      sourcePortId: portId,
      startX: x,
      startY: y,
      endX: x,
      endY: y
    };
  }

  /** 更新连接位置 */
  function updateConnection(x: number, y: number) {
    if (connectionDraft.value) {
      connectionDraft.value.endX = x;
      connectionDraft.value.endY = y;
    }
  }

  /** 完成连接 */
  function finishConnection(targetNodeId: string, targetPortId: string): boolean {
    if (!connectionDraft.value) {
      return false;
    }

    // 验证：不能连接到自己
    if (connectionDraft.value.sourceNodeId === targetNodeId) {
      cancelConnection();
      return false;
    }

    // 验证：不能重复连接
    const exists = connections.value.some(
      conn =>
        conn.source === connectionDraft.value!.sourceNodeId &&
        conn.sourceHandle === connectionDraft.value!.sourcePortId &&
        conn.target === targetNodeId &&
        conn.targetHandle === targetPortId
    );

    if (exists) {
      cancelConnection();
      return false;
    }

    // 创建连接
    const newConnection: Api.Workflow.Connection = {
      id: uuidv4(),
      source: connectionDraft.value.sourceNodeId,
      sourceHandle: connectionDraft.value.sourcePortId,
      target: targetNodeId,
      targetHandle: targetPortId,
      type: 'bezier'
    };

    connections.value.push(newConnection);
    connectionDraft.value = null;
    return true;
  }

  /** 取消连接 */
  function cancelConnection() {
    connectionDraft.value = null;
  }

  /** 删除连接 */
  function removeConnection(connectionId: string) {
    const index = connections.value.findIndex(conn => conn.id === connectionId);
    if (index !== -1) {
      connections.value.splice(index, 1);
    }
  }

  /** 删除节点相关的所有连接 */
  function removeNodeConnections(nodeId: string) {
    connections.value = connections.value.filter(
      conn => conn.source !== nodeId && conn.target !== nodeId
    );
  }

  /** 设置连接列表 */
  function setConnections(newConnections: Api.Workflow.Connection[]) {
    connections.value = newConnections;
  }

  /** 清空所有连接 */
  function clearConnections() {
    connections.value = [];
    connectionDraft.value = null;
  }

  return {
    connections,
    connectionDraft,
    isConnecting,
    startConnection,
    updateConnection,
    finishConnection,
    cancelConnection,
    removeConnection,
    removeNodeConnections,
    setConnections,
    clearConnections
  };
}

