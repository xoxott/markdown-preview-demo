/**
 * Flow 主画布组件
 *
 * 整合所有功能的核心画布组件，提供完整的图形编辑器功能
 */

import { defineComponent, ref, computed, watch, onUnmounted, type PropType, CSSProperties } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useFlowConfig } from '../hooks/useFlowConfig';
import { useFlowState } from '../hooks/useFlowState';
import { useCanvasPan } from '../hooks/useCanvasPan';
import { useCanvasZoom } from '../hooks/useCanvasZoom';
import { useNodeDrag } from '../hooks/useNodeDrag';
import { useConnectionCreation } from '../hooks/useConnectionCreation';
import { FlowEventEmitter } from '../core/events/FlowEventEmitter';
import { compareIds } from '../utils/array-utils';
import FlowNodes from './FlowNodes';
import FlowEdges from './FlowEdges';
import FlowBackground from './FlowBackground';
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
    // 配置管理
    const { config, updateConfig } = useFlowConfig({
      id: props.id,
      initialConfig: props.config
    });

    // 状态管理
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
      selectNode,
      selectEdge,
      deselectAll
    } = useFlowState({
      initialNodes: props.initialNodes,
      initialEdges: props.initialEdges,
      initialViewport: props.initialViewport,
      maxHistorySize: config.value.performance?.maxHistorySize || 50
    });

    // ✅ 性能优化：使用 computed 但避免在拖拽时重建
    const nodesMap = computed(() => {
      return new Map(nodes.value.map(n => [n.id, n]));
    });

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

    // 事件系统
    const eventEmitter = new FlowEventEmitter();

    // 画布容器引用
    const canvasRef = ref<HTMLElement | null>(null);

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

    // 统一的鼠标事件处理
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

    /**
     * 处理选择逻辑（节点或连接线）
     *
     * 根据是否按下 Ctrl/Cmd 键决定是多选还是单选
     *
     * @param event 鼠标事件
     * @param id 要选择的 ID
     * @param selectFn 选择函数（接收 id 和是否多选）
     */
    const handleSelection = (
      event: MouseEvent,
      id: string,
      selectFn: (id: string, multi: boolean) => void
    ) => {
      // 检查是否是多选模式（Ctrl/Cmd 键）
      const isMultiSelect = event.ctrlKey || event.metaKey;
      selectFn(id, isMultiSelect);
    };

    // 节点事件处理
    const handleNodeClick = (node: FlowNode, event: MouseEvent) => {
      // 如果点击被阻止（因为发生了拖拽），则不处理点击事件
      if (nodeClickBlocked.value) {
        return;
      }

      // 阻止事件冒泡到画布，避免触发画布点击事件
      event.stopPropagation();

      // 处理选择逻辑
      handleSelection(event, node.id, (id, multi) => {
        if (multi) {
          // 多选模式：添加到当前选择
          selectNode(id, true);
        } else {
          // 单选模式：选中当前节点，取消其他所有选中（包括其他节点和连接线）
          selectNode(id, false);
        }
      });

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

      // 处理选择逻辑
      handleSelection(event, edge.id, (id, multi) => {
        if (multi) {
          // 多选模式：添加到当前选择
          selectEdge(id, true);
        } else {
          // 单选模式：选中当前连接线，取消其他所有选中（包括所有节点和其他连接线）
          selectEdge(id, false);
        }
      });

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
        deselectAll();
        emit('viewport-change', viewport.value);
        eventEmitter.emit('onCanvasClick', event);
      }
    };

    useEventListener(canvasRef, 'mousedown', handleMouseDown);
    useEventListener(canvasRef, 'wheel', handleWheel);
    useEventListener(canvasRef, 'click', handleCanvasClick);
    useEventListener(document, 'mousemove', handleMouseMove);
    useEventListener(document, 'mouseup', handleMouseUp);

    onUnmounted(() => {
      cleanupPan();
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
      selectEdge,
      deselectAll,
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
        <div
          style={{
            transform: `translate(${viewport.value.x}px, ${viewport.value.y}px) scale(${viewport.value.zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
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
        </div>

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

