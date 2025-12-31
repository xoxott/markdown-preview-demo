/**
 * 连接创建 Hook
 *
 * 处理连接线的创建和预览
 * 基于 FlowConnectionHandler 核心逻辑，提供 Vue 响应式封装
 */

import { ref, watch, onUnmounted, type Ref } from 'vue';
import { FlowConnectionHandler } from '../core/interaction/FlowConnectionHandler';
import type { FlowConfig, FlowEdge, FlowNode } from '../types';
import type { ConnectionDraft, PreviewPosition } from '../core/interaction/FlowConnectionHandler';

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
  /** 连接草稿状态（响应式） */
  connectionDraft: Ref<ConnectionDraft | null>;
  /** 连接预览位置（响应式） */
  connectionPreviewPos: Ref<PreviewPosition | null>;
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

  /** 连接草稿状态（响应式） */
  const connectionDraft = ref<ConnectionDraft | null>(null);
  /** 连接预览位置（响应式） */
  const connectionPreviewPos = ref<PreviewPosition | null>(null);

  /** 创建连接处理器实例 */
  const connectionHandler = new FlowConnectionHandler();

  /** 配置连接处理器 */
  connectionHandler.setConfig(config.value);
  connectionHandler.setOptions({
    useRAF: true,
    onCreateEdge,
    onConnect
  });

  /** 同步处理器状态到响应式 ref */
  const syncState = () => {
    const draft = connectionHandler.getDraft();
    const preview = connectionHandler.getPreviewPosition();
    connectionDraft.value = draft;
    connectionPreviewPos.value = preview;
  };

  /** 监听配置变化，更新处理器配置 */
  watch(
    () => config.value,
    (newConfig) => {
      connectionHandler.setConfig(newConfig);
    },
    { deep: true }
  );

  /**
   * 处理端口鼠标按下事件
   */
  const handlePortMouseDown = (
    nodeId: string,
    handleId: string,
    handleType: 'source' | 'target',
    event: MouseEvent
  ) => {
    // 只有 source 端口可以开始连接
    if (handleType === 'source') {
      connectionHandler.startConnection(
        nodeId,
        handleId,
        event.clientX,
        event.clientY
      );
      syncState();

      // 阻止节点拖拽和其他事件
      event.stopPropagation();
      event.preventDefault();
    }
  };

  /**
   * 处理鼠标移动事件（更新预览位置）
   */
  const handleMouseMove = (event: MouseEvent) => {
    if (connectionHandler.isConnecting()) {
      connectionHandler.updatePreviewPosition(event);
      syncState();
    }
  };

  /**
   * 处理鼠标抬起事件（完成连接）
   */
  const handleMouseUp = async (event: MouseEvent) => {
    if (!connectionHandler.isConnecting()) {
      return;
    }

    // 从事件中提取目标信息并完成连接
    const edge = await connectionHandler.finishConnectionFromEvent(event, nodes.value);
    syncState();

    // 如果连接成功，edge 已经在 finishConnectionFromEvent 中通过回调处理
    // 这里只需要确保状态已同步
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    connectionHandler.cleanup();
  });

  return {
    connectionDraft,
    connectionPreviewPos,
    handlePortMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}

