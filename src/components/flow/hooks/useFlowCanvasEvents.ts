/**
 * FlowCanvas 事件处理 Hook
 *
 * 负责统一管理画布事件，处理事件优先级
 */

import { type Ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import type { FlowNode, FlowEdge, FlowViewport } from '../types';
import type { FlowEventEmitter } from '../core/events/FlowEventEmitter';

/**
 * 连接创建事件处理器
 */
export interface ConnectionHandlers {
  /** 连接草稿状态 */
  connectionDraft: Ref<any>;
  /** 处理鼠标移动 */
  handleMouseMove: (event: MouseEvent) => void;
  /** 处理鼠标抬起 */
  handleMouseUp: (event: MouseEvent) => void;
}

/**
 * 节点拖拽事件处理器
 */
export interface NodeDragHandlers {
  /** 正在拖拽的节点 ID */
  draggingNodeId: Ref<string | null>;
  /** 处理节点鼠标按下 */
  handleNodeMouseDown: (node: FlowNode, event: MouseEvent) => void;
  /** 处理鼠标移动 */
  handleMouseMove: (event: MouseEvent) => void;
  /** 处理鼠标抬起 */
  handleMouseUp: () => void;
  /** 点击是否被阻止（因为发生了拖拽） */
  nodeClickBlocked: Ref<boolean>;
}

/**
 * 画布平移事件处理器
 */
export interface CanvasPanHandlers {
  /** 处理鼠标按下 */
  handleMouseDown: (event: MouseEvent) => void;
  /** 处理鼠标移动 */
  handleMouseMove: (event: MouseEvent) => void;
  /** 处理鼠标抬起 */
  handleMouseUp: () => void;
}

/**
 * FlowCanvas 事件处理 Hook 选项
 */
export interface UseFlowCanvasEventsOptions {
  /** 画布容器引用 */
  canvasRef: Ref<HTMLElement | null>;
  /** 连接创建处理器 */
  connection: ConnectionHandlers;
  /** 节点拖拽处理器 */
  nodeDrag: NodeDragHandlers;
  /** 画布平移处理器 */
  canvasPan: CanvasPanHandlers;
  /** 画布缩放处理器 */
  handleWheel: (event: WheelEvent) => void;
  /** 视口状态 */
  viewport: Ref<FlowViewport>;
  /** 事件发射器 */
  eventEmitter: FlowEventEmitter;
  /** 选择相关方法 */
  selection: {
    shouldMultiSelect: (event: MouseEvent | KeyboardEvent) => boolean;
    selectNode: (nodeId: string, addToSelection?: boolean) => void;
    selectEdge: (edgeId: string, addToSelection?: boolean) => void;
    deselectAll: () => void;
  };
  /** 事件发射方法 */
  emit: {
    'node-click': (node: FlowNode, event: MouseEvent) => void;
    'node-double-click': (node: FlowNode, event: MouseEvent) => void;
    'edge-click': (edge: FlowEdge, event: MouseEvent) => void;
    'edge-double-click': (edge: FlowEdge, event: MouseEvent) => void;
    'viewport-change': (viewport: FlowViewport) => void;
  };
}

/**
 * FlowCanvas 事件处理 Hook 返回值
 */
export interface UseFlowCanvasEventsReturn {
  /** 节点点击处理 */
  handleNodeClick: (node: FlowNode, event: MouseEvent) => void;
  /** 节点鼠标按下处理 */
  handleNodeMouseDown: (node: FlowNode, event: MouseEvent) => void;
  /** 节点双击处理 */
  handleNodeDoubleClick: (node: FlowNode, event: MouseEvent) => void;
  /** 连接线点击处理 */
  handleEdgeClick: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线双击处理 */
  handleEdgeDoubleClick: (edge: FlowEdge, event: MouseEvent) => void;
  /** 清理事件监听器 */
  cleanup: () => void;
}

/**
 * FlowCanvas 事件处理 Hook
 *
 * 统一管理画布事件，处理事件优先级（连接创建 > 节点拖拽 > 画布平移）
 *
 * @param options Hook 选项
 * @returns 事件处理方法和清理函数
 *
 * @example
 * ```typescript
 * const {
 *   handleNodeClick,
 *   handleEdgeClick,
 *   cleanup
 * } = useFlowCanvasEvents({
 *   canvasRef,
 *   connection: { ... },
 *   nodeDrag: { ... },
 *   canvasPan: { ... },
 *   handleWheel,
 *   viewport,
 *   eventEmitter,
 *   selection: { ... },
 *   emit: { ... }
 * });
 *
 * onUnmounted(() => cleanup());
 * ```
 */
export function useFlowCanvasEvents(
  options: UseFlowCanvasEventsOptions
): UseFlowCanvasEventsReturn {
  const {
    canvasRef,
    connection,
    nodeDrag,
    canvasPan,
    handleWheel,
    viewport,
    eventEmitter,
    selection,
    emit
  } = options;

  // ==================== 统一的鼠标事件处理（优先级：连接创建 > 节点拖拽 > 画布平移）====================

  /**
   * 处理鼠标按下
   */
  const handleMouseDown = (event: MouseEvent) => {
    // 优先处理连接创建（如果正在创建连接，不处理平移）
    if (connection.connectionDraft.value) {
      return;
    }

    // 检查是否点击在节点上（节点拖拽由节点自己的事件处理，这里不处理）
    const target = event.target as HTMLElement;
    if (target.closest('.flow-node')) {
      return; // 节点拖拽由节点自己的 mousedown 事件处理
    }

    // 处理画布平移
    canvasPan.handleMouseDown(event);
  };

  /**
   * 处理鼠标移动
   */
  const handleMouseMove = (event: MouseEvent) => {
    // 优先处理连接创建
    if (connection.connectionDraft.value) {
      connection.handleMouseMove(event);
      return;
    }

    // 处理节点拖拽
    if (nodeDrag.draggingNodeId.value) {
      nodeDrag.handleMouseMove(event);
      return;
    }

    // 处理画布平移
    canvasPan.handleMouseMove(event);
  };

  /**
   * 处理鼠标抬起
   */
  const handleMouseUp = (event: MouseEvent) => {
    // 优先处理连接创建
    if (connection.connectionDraft.value) {
      connection.handleMouseUp(event);
      return;
    }

    // 处理节点拖拽
    if (nodeDrag.draggingNodeId.value) {
      nodeDrag.handleMouseUp();
    }

    // 处理画布平移
    canvasPan.handleMouseUp();
  };

  // ==================== 节点事件处理 ====================

  /**
   * 处理节点点击
   */
  const handleNodeClick = (node: FlowNode, event: MouseEvent) => {
    // 如果点击被阻止（因为发生了拖拽），则不处理点击事件
    if (nodeDrag.nodeClickBlocked.value) return;

    event.stopPropagation();
    const isMultiSelect = selection.shouldMultiSelect(event);
    selection.selectNode(node.id, isMultiSelect);
    emit['node-click'](node, event);
    eventEmitter.emit('onNodeClick', node, event);
  };

  /**
   * 处理节点鼠标按下
   */
  const handleNodeMouseDown = (node: FlowNode, event: MouseEvent) => {
    nodeDrag.handleNodeMouseDown(node, event);
  };

  /**
   * 处理端口鼠标按下
   *
   * 注意：这个方法需要从外部传入，因为涉及到连接创建的具体逻辑
   * 在 FlowCanvas 中会直接使用 useConnectionCreation 的 handlePortMouseDown
   */

  /**
   * 处理节点双击
   */
  const handleNodeDoubleClick = (node: FlowNode, event: MouseEvent) => {
    emit['node-double-click'](node, event);
    eventEmitter.emit('onNodeDoubleClick', node, event);
  };

  // ==================== 连接线事件处理 ====================

  /**
   * 处理连接线点击
   */
  const handleEdgeClick = (edge: FlowEdge, event: MouseEvent) => {
    event.stopPropagation();
    const isMultiSelect = selection.shouldMultiSelect(event);
    selection.selectEdge(edge.id, isMultiSelect);
    emit['edge-click'](edge, event);
    eventEmitter.emit('onEdgeClick', edge, event);
  };

  /**
   * 处理连接线双击
   */
  const handleEdgeDoubleClick = (edge: FlowEdge, event: MouseEvent) => {
    emit['edge-double-click'](edge, event);
    eventEmitter.emit('onEdgeDoubleClick', edge, event);
  };

  // ==================== 画布点击（取消选择）====================

  /**
   * 处理画布点击
   */
  const handleCanvasClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const isNode = target.closest('.flow-node');
    const isEdge = target.closest('.flow-edge') || target.closest('path[stroke]');
    const isHandle = target.closest('.flow-handle');

    if (!isNode && !isEdge && !isHandle) {
      selection.deselectAll();
      emit['viewport-change'](viewport.value);
      eventEmitter.emit('onCanvasClick', event);
    }
  };

  // ==================== 注册事件监听器 ====================

  const stopMouseDown = useEventListener(canvasRef, 'mousedown', handleMouseDown);
  const stopWheel = useEventListener(canvasRef, 'wheel', handleWheel);
  const stopClick = useEventListener(canvasRef, 'click', handleCanvasClick);
  const stopMouseMove = useEventListener(document, 'mousemove', handleMouseMove);
  const stopMouseUp = useEventListener(document, 'mouseup', handleMouseUp);

  /**
   * 清理事件监听器
   */
  const cleanup = () => {
    stopMouseDown();
    stopWheel();
    stopClick();
    stopMouseMove();
    stopMouseUp();
  };

  return {
    handleNodeClick,
    handleNodeMouseDown,
    handleNodeDoubleClick,
    handleEdgeClick,
    handleEdgeDoubleClick,
    cleanup
  };
}

