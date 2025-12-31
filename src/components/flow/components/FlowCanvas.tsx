/**
 * Flow 主画布组件
 *
 * 整合所有功能的核心画布组件，提供完整的图形编辑器功能
 */

import { defineComponent, ref, computed, watch, onUnmounted, type PropType, CSSProperties } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useFlowConfig } from '../hooks/useFlowConfig';
import { useFlowState } from '../hooks/useFlowState';
import { useSelection } from '../hooks/useSelection';
import { useKeyboard } from '../hooks/useKeyboard';
import { useCanvasPan } from '../hooks/useCanvasPan';
import { useCanvasZoom } from '../hooks/useCanvasZoom';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useConnectionCreation } from '../hooks/useConnectionCreation';
import { useNodesMap } from '../hooks/useNodesMap';
import { FlowEventEmitter } from '../core/events/FlowEventEmitter';
import { compareIds } from '../utils/array-utils';
import { registerFlowCanvasShortcuts } from './useFlowCanvasKeyboard';
import FlowNodes from './FlowNodes';
import FlowEdges from './FlowEdges';
import FlowBackground from './FlowBackground';
import FlowViewportContainer from './FlowViewportContainer';
import ConnectionPreview from './ConnectionPreview';
import type { FlowConfig, FlowViewport, FlowNode, FlowEdge } from '../types';

/**
 * FlowCanvas 组件属性
 */
export interface FlowCanvasProps {
  /** 配置 ID（用于多实例） */
  id?: string;
  /** 初始配置 */
  config?: Partial<FlowConfig>;
  /** 初始节点列表 */
  initialNodes?: FlowNode[];
  /** 初始连接线列表 */
  initialEdges?: FlowEdge[];
  /** 初始视口 */
  initialViewport?: FlowViewport;
  /** 画布宽度 */
  width?: string | number;
  /** 画布高度 */
  height?: string | number;
  /** 自定义样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
}

/**
 * Flow 主画布组件
 */
export default defineComponent({
  name: 'FlowCanvas',
  props: {
    id: {
      type: String,
      default: undefined
    },
    config: {
      type: Object as PropType<Partial<FlowConfig>>,
      default: () => ({})
    },
    initialNodes: {
      type: Array as PropType<FlowNode[]>,
      default: () => []
    },
    initialEdges: {
      type: Array as PropType<FlowEdge[]>,
      default: () => []
    },
    initialViewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
    },
    width: {
      type: [String, Number] as PropType<string | number>,
      default: '100%'
    },
    height: {
      type: [String, Number] as PropType<string | number>,
      default: '100%'
    },
    style: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    class: {
      type: String,
      default: ''
    }
  },
  emits: [
    'node-click',
    'node-double-click',
    'edge-click',
    'edge-double-click',
    'connect',
    'viewport-change'
  ],
  setup(props, { emit, expose, slots }) {
    // ==================== 一、配置和状态初始化 ====================

    // 配置管理
    const { config, updateConfig } = useFlowConfig({
      id: props.id,
      initialConfig: props.config
    });

    // 状态管理（负责状态存储）
    const {
      nodes,
      edges,
      viewport,
      selectedNodeIds,
      selectedEdgeIds,
      addNode,
      removeNode,
      updateNode,
      addEdge,
      removeEdge,
      setViewport,
      panViewport,
      zoomViewport,
      stateManager
    } = useFlowState({
      initialNodes: props.initialNodes,
      initialEdges: props.initialEdges,
      initialViewport: props.initialViewport,
      maxHistorySize: config.value.performance?.maxHistorySize || 50
    });

    // 选择管理（负责选择逻辑：多选判断、框选等）
    // 采用单向数据流：useSelection 作为单一数据源，useFlowState 只负责读取
    const selection = useSelection({
      initialSelectedNodeIds: selectedNodeIds.value,
      initialSelectedEdgeIds: selectedEdgeIds.value,
      nodes,
      viewport,
      selectionOptions: {
        enableMultiSelection: config.value.interaction?.enableMultiSelection !== false,
        multiSelectKey: config.value.interaction?.multiSelectKey || 'ctrl',
        enableBoxSelection: config.value.interaction?.enableBoxSelection !== false,
        boxSelectionKey: config.value.interaction?.boxSelectionKey || 'shift'
      },
      onSelectionChange: undefined
    });

    // 单向同步：从 useSelection 同步到 useFlowState
    watch(
      () => selection.selectedNodeIds.value,
      (newIds) => {
        stateManager.selectedNodeIds.value = newIds;
      },
      { immediate: true, deep: true }
    );

    watch(
      () => selection.selectedEdgeIds.value,
      (newIds) => {
        stateManager.selectedEdgeIds.value = newIds;
      },
      { immediate: true, deep: true }
    );

    const { nodesMap } = useNodesMap({ nodes });

    // 画布容器引用
    const canvasRef = ref<HTMLElement | null>(null);

    // 事件系统
    const eventEmitter = new FlowEventEmitter();

    // ==================== 二、Hooks 初始化 ====================

    // 连接创建 Hook
    const {
      connectionDraft,
      connectionPreviewPos,
      handlePortMouseDown: handlePortMouseDownHook,
      handleMouseMove: handleConnectionMouseMove,
      handleMouseUp: handleConnectionMouseUp
    } = useConnectionCreation({
      config,
      nodes,
      onCreateEdge: (edge) => {
        addEdge(edge);
        emit('connect', edge);
        eventEmitter.emit('onConnect', edge);
      },
      onConnect: (edge) => {
        emit('connect', edge);
        eventEmitter.emit('onConnect', edge);
      }
    });

    // 节点拖拽 Hook
    const {
      draggingNodeId,
      nodeClickBlocked,
      handleNodeMouseDown: handleNodeMouseDownHook,
      handleNodeMouseMove: handleNodeMouseMoveHook,
      handleNodeMouseUp: handleNodeMouseUpHook
    } = useNodeDrag({
      config,
      viewport,
      nodes,
      nodesMap,
      onNodePositionUpdate: (nodeId, x, y) => {
        const node = nodesMap.value.get(nodeId);
        if (node) {
          node.position.x = x;
          node.position.y = y;
        }
      }
    });

    // 画布平移 Hook
    const {
      isPanning,
      handleMouseDown: handlePanMouseDown,
      handleMouseMove: handlePanMouseMove,
      handleMouseUp: handlePanMouseUp,
      cleanup: cleanupPan
    } = useCanvasPan({
      config,
      viewport,
      onPan: (deltaX, deltaY) => {
        panViewport(deltaX, deltaY);
      },
      onViewportChange: (newViewport) => {
        emit('viewport-change', newViewport);
        eventEmitter.emit('onCanvasPan', newViewport);
      }
    });

    // 画布缩放 Hook
    const { handleWheel } = useCanvasZoom({
      config,
      viewport,
      canvasRef,
      onZoom: (zoom, centerX, centerY) => {
        zoomViewport(zoom, centerX, centerY);
      },
      onViewportChange: (newViewport) => {
        emit('viewport-change', newViewport);
        eventEmitter.emit('onCanvasZoom', newViewport);
      }
    });

    // 键盘快捷键管理
    const keyboard = useKeyboard({
      enabled: true,
      target: canvasRef
    });

    // 注册默认快捷键
    const unregisterShortcuts = registerFlowCanvasShortcuts(keyboard, {
      selection: {
        getSelectedNodes: selection.getSelectedNodes,
        getSelectedEdges: selection.getSelectedEdges,
        selectNodes: selection.selectNodes,
        selectEdge: selection.selectEdge,
        deselectAll: selection.deselectAll,
        isEdgeSelected: selection.isEdgeSelected
      },
      stateManager,
      nodes,
      edges,
      removeNode,
      removeEdge
    });

    // ==================== 三、Props 监听和样式计算 ====================

    // 监听 props 变化，同步到内部状态
    watch(
      () => props.initialNodes,
      (newNodes) => {
        if (newNodes && newNodes.length > 0) {
          if (!compareIds(nodes.value, newNodes)) {
            nodes.value = [...newNodes];
          }
        }
      }
    );

    watch(
      () => props.initialEdges,
      (newEdges) => {
        if (newEdges && newEdges.length > 0) {
          if (!compareIds(edges.value, newEdges)) {
            edges.value = [...newEdges];
          }
        }
      }
    );

    // 计算画布样式
    const canvasStyle = computed(() => {
      return {
        position: 'relative',
        width: typeof props.width === 'number' ? `${props.width}px` : props.width,
        height: typeof props.height === 'number' ? `${props.height}px` : props.height,
        overflow: 'hidden',
        backgroundColor: config.value.canvas?.backgroundColor || '#ffffff',
        ...props.style
      };
    });

    // ==================== 四、事件处理函数 ====================

    // 统一的鼠标事件处理（优先级：连接创建 > 节点拖拽 > 画布平移）
    const handleMouseDown = (event: MouseEvent) => {
      // 优先处理连接创建（如果正在创建连接，不处理平移）
      if (connectionDraft.value) {
        return;
      }

      // 处理画布平移
      handlePanMouseDown(event);
    };

    const handleMouseMove = (event: MouseEvent) => {
      // 优先处理连接创建
      if (connectionDraft.value) {
        handleConnectionMouseMove(event);
        return;
      }

      // 处理节点拖拽
      if (draggingNodeId.value) {
        handleNodeMouseMoveHook(event);
        return;
      }

      // 处理画布平移
      handlePanMouseMove(event);
    };

    const handleMouseUp = (event: MouseEvent) => {
      // 优先处理连接创建
      if (connectionDraft.value) {
        handleConnectionMouseUp(event);
        return;
      }

      // 处理节点拖拽
      if (draggingNodeId.value) {
        handleNodeMouseUpHook();
      }

      // 处理画布平移
      handlePanMouseUp();
    };

    // 节点事件处理
    const handleNodeClick = (node: FlowNode, event: MouseEvent) => {
      // 如果点击被阻止（因为发生了拖拽），则不处理点击事件
      if (nodeClickBlocked.value) return;

      event.stopPropagation();

      // 使用 useSelection 处理选择逻辑（自动判断多选）
      const isMultiSelect = selection.shouldMultiSelect(event);
      selection.selectNode(node.id, isMultiSelect);

      emit('node-click', node, event);
      eventEmitter.emit('onNodeClick', node, event);
    };

    const handleNodeMouseDown = (node: FlowNode, event: MouseEvent) => {
      handleNodeMouseDownHook(node, event);
    };

    const handlePortMouseDown = (
      nodeId: string,
      handleId: string,
      handleType: 'source' | 'target',
      event: MouseEvent
    ) => {
      handlePortMouseDownHook(nodeId, handleId, handleType, event);
    };

    const handleNodeDoubleClick = (node: FlowNode, event: MouseEvent) => {
      emit('node-double-click', node, event);
      eventEmitter.emit('onNodeDoubleClick', node, event);
    };

    // 连接线事件处理
    const handleEdgeClick = (edge: FlowEdge, event: MouseEvent) => {
      // 阻止事件冒泡到画布，避免触发画布点击事件
      event.stopPropagation();

      // 使用 useSelection 处理选择逻辑（自动判断多选）
      const isMultiSelect = selection.shouldMultiSelect(event);
      selection.selectEdge(edge.id, isMultiSelect);

      emit('edge-click', edge, event);
      eventEmitter.emit('onEdgeClick', edge, event);
    };

    const handleEdgeDoubleClick = (edge: FlowEdge, event: MouseEvent) => {
      emit('edge-double-click', edge, event);
      eventEmitter.emit('onEdgeDoubleClick', edge, event);
    };

    // 画布点击（取消选择）
    const handleCanvasClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 检查点击目标是否是节点、连接线或端口 注意：由于背景和连接线 SVG 设置了 pointerEvents: 'none'，点击它们时事件会穿透
      const isNode = target.closest('.flow-node');
      const isEdge = target.closest('.flow-edge') || target.closest('path[stroke]');
      const isHandle = target.closest('.flow-handle');

      // 如果点击的不是节点、连接线或端口，则取消选中
      if (!isNode && !isEdge && !isHandle) {
        selection.deselectAll();
        emit('viewport-change', viewport.value);
        eventEmitter.emit('onCanvasClick', event);
      }
    };

    useEventListener(canvasRef, 'mousedown', handleMouseDown);
    useEventListener(canvasRef, 'wheel', handleWheel);
    useEventListener(canvasRef, 'click', handleCanvasClick);
    useEventListener(document, 'mousemove', handleMouseMove);
    useEventListener(document, 'mouseup', handleMouseUp);

    // ==================== 六、清理和暴露 ====================

    onUnmounted(() => {
      cleanupPan();
      unregisterShortcuts();
    });

    expose({
      // 配置
      config,
      updateConfig,
      // 状态
      nodes,
      edges,
      viewport,
      selectedNodeIds,
      selectedEdgeIds,
      // 节点操作
      addNode,
      removeNode,
      // 连接线操作
      addEdge,
      removeEdge,
      // 视口操作
      setViewport,
      panViewport,
      zoomViewport,
      // 选择操作（使用 useSelection 的方法）
      selectNode: selection.selectNode,
      selectNodes: selection.selectNodes,
      selectEdge: selection.selectEdge,
      deselectAll: selection.deselectAll,
      // 框选相关方法
      startBoxSelection: selection.startBoxSelection,
      updateBoxSelection: selection.updateBoxSelection,
      finishBoxSelection: selection.finishBoxSelection,
      cancelBoxSelection: selection.cancelBoxSelection,
      isBoxSelecting: selection.isBoxSelecting,
      // 键盘快捷键
      registerKeyboardShortcut: keyboard.register,
      unregisterKeyboardShortcut: keyboard.unregister,
      // 事件
      eventEmitter
    });

    return () => (
      <div
        ref={canvasRef}
        class={`flow-canvas ${props.class}`}
        style={canvasStyle.value as CSSProperties}
      >
        {/* 背景层（最底层） */}
        {slots.background ? (
          slots.background()
        ) : (
          config.value.canvas?.showGrid !== false && (
            <FlowBackground
              showGrid={config.value.canvas?.showGrid}
              gridType={config.value.canvas?.gridType || 'dots'}
              gridSize={config.value.canvas?.gridSize || 20}
              gridColor={config.value.canvas?.gridColor}
              gridOpacity={config.value.canvas?.gridOpacity}
              backgroundColor={config.value.canvas?.backgroundColor}
              viewport={viewport.value}
              instanceId={props.id || 'default'}
            />
          )
        )}

        {/* 连接线层（在节点下方，使用屏幕坐标） */}
        <FlowEdges
          edges={edges.value}
          nodes={nodes.value}
          selectedEdgeIds={selectedEdgeIds.value}
          viewport={viewport.value}
          instanceId={props.id || 'default'}
          enableViewportCulling={config.value.performance?.enableViewportCulling}
          enableCanvasRendering={config.value.performance?.enableEdgeCanvasRendering}
          canvasThreshold={config.value.performance?.edgeCanvasThreshold}
          onEdgeClick={handleEdgeClick}
          onEdgeDoubleClick={handleEdgeDoubleClick}
        />

        {/* 节点容器（使用 CSS transform 缩放） */}
        <FlowViewportContainer viewport={viewport.value}>
          <FlowNodes
            nodes={nodes.value}
            selectedNodeIds={selectedNodeIds.value}
            lockedNodeIds={[]}
            draggingNodeId={draggingNodeId.value}
            viewport={viewport.value}
            enableViewportCulling={config.value.performance?.enableViewportCulling}
            viewportCullingBuffer={config.value.performance?.virtualScrollBuffer}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeMouseDown={handleNodeMouseDown}
            onPortMouseDown={handlePortMouseDown}
          />
        </FlowViewportContainer>

        {/* 连接预览线 */}
        {connectionDraft.value && connectionPreviewPos.value && (
          <ConnectionPreview
            sourceNodeId={connectionDraft.value.sourceNodeId}
            sourceHandleId={connectionDraft.value.sourceHandleId}
            previewPos={connectionPreviewPos.value}
            nodes={nodes.value}
            viewport={viewport.value}
            canvasRef={canvasRef.value}
          />
        )}

        {/* 其他插槽内容（工具栏、小地图等） */}
        {slots.default && slots.default()}
      </div>
    );
  }
});

