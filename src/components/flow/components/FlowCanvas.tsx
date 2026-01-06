/**
 * Flow 主画布组件
 *
 * 整合所有功能的核心画布组件，提供完整的图形编辑器功能
 */

// 导入 Flow 主题样式（在使用 FlowCanvas 时自动加载）
import '../styles/index.scss';

import { defineComponent, ref, computed, onMounted, onUnmounted, type PropType, CSSProperties, h } from 'vue';
import { useFlowConfig } from '../hooks/useFlowConfig';
import { useFlowState } from '../hooks/useFlowState';
import { useKeyboard } from '../hooks/useKeyboard';
import { useCanvasPan } from '../hooks/useCanvasPan';
import { useCanvasZoom } from '../hooks/useCanvasZoom';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useConnectionCreation } from '../hooks/useConnectionCreation';
import { useNodesMap } from '../hooks/useNodesMap';
import { useFlowCanvasPropsSync } from '../hooks/useFlowCanvasPropsSync';
import { useFlowCanvasConfigSync } from '../hooks/useFlowCanvasConfigSync';
import { useFlowCanvasEvents } from '../hooks/useFlowCanvasEvents';
import { FlowEventEmitter } from '../core/events/FlowEventEmitter';
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
      type: Object as PropType<CSSProperties | Record<string, string | number>>,
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

    // 状态管理（负责状态存储和选择逻辑）
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
      // 选择操作
      selectNode,
      selectNodes,
      selectEdge,
      deselectAll,
      getSelectedNodes,
      getSelectedEdges,
      isNodeSelected,
      isEdgeSelected,
      shouldMultiSelect,
      shouldBoxSelect,
      startBoxSelection,
      updateBoxSelection,
      finishBoxSelection,
      cancelBoxSelection,
      isBoxSelecting,
      setSelectionOptions,
      // 内部实现，不对外暴露
      stateStore,
      historyManager
    } = useFlowState({
      initialNodes: props.initialNodes,
      initialEdges: props.initialEdges,
      initialViewport: props.initialViewport,
      maxHistorySize: config.value.performance?.maxHistorySize || 50,
      selectionOptions: {
        enableMultiSelection: config.value.interaction?.enableMultiSelection !== false,
        multiSelectKey: config.value.interaction?.multiSelectKey || 'ctrl',
        enableBoxSelection: config.value.interaction?.enableBoxSelection !== false,
        boxSelectionKey: config.value.interaction?.boxSelectionKey || 'shift'
      }
    });

    // 配置同步
    const { start: startConfigSync, stop: stopConfigSync } = useFlowCanvasConfigSync({
      config,
      setSelectionOptions
    });

    const { nodesMap } = useNodesMap({ nodes });

    // 画布容器引用
    const canvasRef = ref<HTMLElement | null>(null);

    const emptyLockedNodeIds: string[] = [];

    const defaultInstanceId = computed(() => props.id || 'default');

    // 事件系统
    const eventEmitter = new FlowEventEmitter();

    // 连接创建
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

    // 节点拖拽
    const {
      draggingNodeId,
      elevatedNodeIds,
      allocateZIndex,
      removeZIndex,
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
        updateNode(nodeId, {
          position: { x, y }
        });
      }
    });

    // 画布平移
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

    // 画布缩放
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
        getSelectedNodes,
        getSelectedEdges,
        selectNodes,
        selectEdge,
        deselectAll,
        isEdgeSelected
      },
      historyOperations: {
        undo: () => historyManager.undo(),
        redo: () => historyManager.redo(),
        canUndo: () => historyManager.canUndo(),
        canRedo: () => historyManager.canRedo()
      },
      selectedNodeIds,
      selectedEdgeIds,
      nodes,
      edges,
      removeNode,
      removeEdge
    });

    const { start: startPropsSync, stop: stopPropsSync } = useFlowCanvasPropsSync({
      initialNodes: computed(() => props.initialNodes),
      initialEdges: computed(() => props.initialEdges),
      stateStore,
      nodes,
      edges
    });

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

    const {
      handleNodeClick,
      handleNodeMouseDown,
      handleNodeDoubleClick,
      handleEdgeClick,
      handleEdgeDoubleClick,
      cleanup: cleanupEvents
    } = useFlowCanvasEvents({
      canvasRef,
      connection: {
        connectionDraft,
        handleMouseMove: handleConnectionMouseMove,
        handleMouseUp: handleConnectionMouseUp
      },
      nodeDrag: {
        draggingNodeId,
        handleNodeMouseDown: handleNodeMouseDownHook,
        handleMouseMove: handleNodeMouseMoveHook,
        handleMouseUp: handleNodeMouseUpHook,
        nodeClickBlocked
      },
      canvasPan: {
        handleMouseDown: handlePanMouseDown,
        handleMouseMove: handlePanMouseMove,
        handleMouseUp: handlePanMouseUp
      },
      handleWheel,
      viewport,
      eventEmitter,
      selection: {
        shouldMultiSelect,
        selectNode,
        selectEdge,
        deselectAll
      },
      emit: {
        'node-click': (node, event) => emit('node-click', node, event),
        'node-double-click': (node, event) => emit('node-double-click', node, event),
        'edge-click': (edge, event) => emit('edge-click', edge, event),
        'edge-double-click': (edge, event) => emit('edge-double-click', edge, event),
        'viewport-change': (vp) => emit('viewport-change', vp)
      }
    });

    // 端口鼠标按下处理（需要直接使用连接创建 hook 的方法）
    const handlePortMouseDown = (
      nodeId: string,
      handleId: string,
      handleType: 'source' | 'target',
      event: MouseEvent
    ) => {
      handlePortMouseDownHook(nodeId, handleId, handleType, event);
    };


    // 启动同步
    onMounted(() => {
      startPropsSync();
      startConfigSync();
    });

    onUnmounted(() => {
      stopPropsSync();
      stopConfigSync();
      cleanupPan();
      cleanupEvents();
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
      // 选择操作
      selectNode,
      selectNodes,
      selectEdge,
      deselectAll,
      // 框选相关方法
      startBoxSelection,
      updateBoxSelection,
      finishBoxSelection,
      cancelBoxSelection,
      isBoxSelecting,
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
          slots.background({ viewport:viewport.value })
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
              instanceId={defaultInstanceId.value}
            />
          )
        )}

        {/* 节点容器 */}
        <FlowViewportContainer viewport={viewport.value}>
          <FlowNodes
            nodes={nodes.value}
            selectedNodeIds={selectedNodeIds.value}
            lockedNodeIds={emptyLockedNodeIds}
            draggingNodeId={draggingNodeId.value}
            elevatedNodeIds={elevatedNodeIds.value}
            allocateZIndex={allocateZIndex}
            removeZIndex={removeZIndex}
            viewport={viewport.value}
            enableViewportCulling={config.value.performance?.enableViewportCulling}
            viewportCullingBuffer={config.value.performance?.virtualScrollBuffer}
            config={config.value}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeMouseDown={handleNodeMouseDown}
            onPortMouseDown={handlePortMouseDown}
          />
        </FlowViewportContainer>

        {/* 连接线层（在 DOM 中位于节点之后，但 z-index=0 确保视觉上在节点下方） */}
        <FlowEdges
          edges={edges.value}
          nodes={nodes.value}
          selectedEdgeIds={selectedEdgeIds.value}
          viewport={viewport.value}
          instanceId={defaultInstanceId.value}
          enableViewportCulling={config.value.performance?.enableViewportCulling}
          enableCanvasRendering={config.value.performance?.enableEdgeCanvasRendering}
          canvasThreshold={config.value.performance?.edgeCanvasThreshold}
          config={config.value}
          onEdgeClick={handleEdgeClick}
          onEdgeDoubleClick={handleEdgeDoubleClick}
        />

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

