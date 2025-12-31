/**
 * 连接创建 Hook
 *
 * 处理连接线的创建和预览
 */

import { ref, type Ref } from 'vue';
import { useRafThrottle } from './useRafThrottle';
import type { FlowConfig, FlowEdge, FlowNode } from '../types';

/**
 * 连接草稿状态（内部使用，不导出以避免与 core/interaction 中的 ConnectionDraft 冲突）
 */
interface ConnectionDraft {
  sourceNodeId: string;
  sourceHandleId: string;
  startX: number;
  startY: number;
}

export interface UseConnectionCreationOptions {
  /** 画布配置 */
  config: Ref<Readonly<FlowConfig>>;
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 创建连接的回调 */
  onCreateEdge: (edge: FlowEdge) => void;
  /** 连接创建事件 */
  onConnect?: (edge: FlowEdge) => void;
}

export interface UseConnectionCreationReturn {
  /** 连接草稿状态 */
  connectionDraft: Ref<ConnectionDraft | null>;
  /** 连接预览位置 */
  connectionPreviewPos: Ref<{ x: number; y: number } | null>;
  /** 处理端口鼠标按下事件 */
  handlePortMouseDown: (
    nodeId: string,
    handleId: string,
    handleType: 'source' | 'target',
    event: MouseEvent
  ) => void;
  /** 处理鼠标移动事件（更新预览位置） */
  handleMouseMove: (event: MouseEvent) => void;
  /** 处理鼠标抬起事件（完成连接） */
  handleMouseUp: (event: MouseEvent) => void;
}

/**
 * 连接创建 Hook
 */
export function useConnectionCreation(
  options: UseConnectionCreationOptions
): UseConnectionCreationReturn {
  const { config, nodes, onCreateEdge, onConnect } = options;

  const connectionDraft = ref<ConnectionDraft | null>(null);
  const connectionPreviewPos = ref<{ x: number; y: number } | null>(null);

  /**
   * 更新预览位置（RAF 节流版本）
   *
   * 使用 RAF 节流确保预览线更新不会过度渲染
   */
  const { throttled: throttledUpdatePreview, cancel: cancelPreviewUpdate } = useRafThrottle(
    (event: MouseEvent) => {
      if (connectionDraft.value) {
        connectionPreviewPos.value = {
          x: event.clientX,
          y: event.clientY
        };
      }
    }
  );

  const handlePortMouseDown = (
    nodeId: string,
    handleId: string,
    handleType: 'source' | 'target',
    event: MouseEvent
  ) => {
    // 只有 source 端口可以开始连接
    if (handleType === 'source') {
      connectionDraft.value = {
        sourceNodeId: nodeId,
        sourceHandleId: handleId,
        startX: event.clientX,
        startY: event.clientY
      };

      // 初始化预览位置（立即更新，不使用节流）
      connectionPreviewPos.value = {
        x: event.clientX,
        y: event.clientY
      };

      // 阻止节点拖拽和其他事件
      event.stopPropagation();
      event.preventDefault();
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (connectionDraft.value) {
      // 使用 RAF 节流更新预览位置
      throttledUpdatePreview(event);
    }
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (!connectionDraft.value) {
      return;
    }

    const target = event.target as HTMLElement;
    const handleElement = target.closest('.flow-handle');

    if (handleElement) {
      const handleId = handleElement.getAttribute('data-handle-id');
      const handleType = handleElement.getAttribute('data-handle-type');
      const nodeId = handleElement.closest('.flow-node')?.getAttribute('data-node-id');

      if (
        nodeId &&
        handleId &&
        handleType === 'target' &&
        nodeId !== connectionDraft.value.sourceNodeId
      ) {
        // 创建连接
        const newEdge: FlowEdge = {
          id: `edge-${connectionDraft.value.sourceNodeId}-${nodeId}-${Date.now()}`,
          source: connectionDraft.value.sourceNodeId,
          target: nodeId,
          sourceHandle: connectionDraft.value.sourceHandleId,
          targetHandle: handleId,
          type: config.value.edges?.defaultType || 'bezier'
        };

        onCreateEdge(newEdge);
        if (onConnect) {
          onConnect(newEdge);
        }
      }
    }

    connectionDraft.value = null;
    connectionPreviewPos.value = null;

    // 取消待执行的预览更新
    cancelPreviewUpdate();
  };

  return {
    connectionDraft,
    connectionPreviewPos,
    handlePortMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}

