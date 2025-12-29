/**
 * Flow 主画布组件
 *
 * 整合所有功能的核心画布组件，提供完整的图形编辑器功能
 */

import { defineComponent, ref, computed, watch, onMounted, onUnmounted, shallowRef, type PropType, CSSProperties } from 'vue';
import { useFlowConfig } from '../hooks/useFlowConfig';
import { useFlowState } from '../hooks/useFlowState';
import { FlowEventEmitter } from '../core/events/FlowEventEmitter';
import FlowNodes from './FlowNodes';
import FlowEdges from './FlowEdges';
import FlowBackground from './FlowBackground';
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

    // ✅ 性能优化：高效的 ID 比较函数 O(n log n) → O(n)
    const compareNodeIds = (arr1: FlowNode[], arr2: FlowNode[]): boolean => {
      if (arr1.length !== arr2.length) return false;

      const set1 = new Set(arr1.map(n => n.id));
      const set2 = new Set(arr2.map(n => n.id));

      if (set1.size !== set2.size) return false;

      for (const id of set1) {
        if (!set2.has(id)) return false;
      }

      return true;
    };

    const compareEdgeIds = (arr1: FlowEdge[], arr2: FlowEdge[]): boolean => {
      if (arr1.length !== arr2.length) return false;

      const set1 = new Set(arr1.map(e => e.id));
      const set2 = new Set(arr2.map(e => e.id));

      if (set1.size !== set2.size) return false;

      for (const id of set1) {
        if (!set2.has(id)) return false;
      }

      return true;
    };

    // 监听 props 变化，同步到内部状态
    watch(
      () => props.initialNodes,
      (newNodes) => {
        if (newNodes && newNodes.length > 0) {
          // ✅ 使用优化的比较函数
          if (!compareNodeIds(nodes.value, newNodes)) {
            nodes.value = [...newNodes];
          }
        }
      },
      { deep: false }
    );

    watch(
      () => props.initialEdges,
      (newEdges) => {
        if (newEdges && newEdges.length > 0) {
          // ✅ 使用优化的比较函数
          if (!compareEdgeIds(edges.value, newEdges)) {
            edges.value = [...newEdges];
          }
        }
      },
      { deep: false }
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

    // 鼠标事件处理
    let isPanning = false;
    let isNodeDragging = false;
    let panStartX = 0;
    let panStartY = 0;
    let panStartViewportX = 0;
    let panStartViewportY = 0;

    // RAF 节流优化
    let rafId: number | null = null;
    let pendingMouseEvent: MouseEvent | null = null;

    const handleMouseDown = (event: MouseEvent) => {
      // 如果点击在节点上，不处理画布拖拽
      const target = event.target as HTMLElement;
      if (target.closest('.flow-node')) {
        return;
      }

      // 检查是否允许拖拽画布
      const panOnDrag = config.value.canvas?.panOnDrag;
      const enableCanvasPan = config.value.interaction?.enableCanvasPan !== false;

      // 如果两个配置都禁用，则不处理
      if (panOnDrag === false && enableCanvasPan === false) {
        return;
      }

      // 检查鼠标按键
      // 如果 panOnDrag 是数组，使用配置的按键
      // 如果 panOnDrag 是 true 或 enableCanvasPan 为 true，允许左键
      let allowedButtons: number[] = [];
      if (Array.isArray(panOnDrag)) {
        allowedButtons = panOnDrag;
      } else if (panOnDrag === true || (panOnDrag !== false && enableCanvasPan)) {
        allowedButtons = [0]; // 左键
      } else {
        allowedButtons = [1, 2]; // 中键和右键（默认）
      }

      if (!allowedButtons.includes(event.button)) {
        return;
      }

      isPanning = true;
      panStartX = event.clientX;
      panStartY = event.clientY;
      panStartViewportX = viewport.value.x;
      panStartViewportY = viewport.value.y;

      event.preventDefault();
      event.stopPropagation();
    };

    // 连接预览线的当前鼠标位置
    const connectionPreviewPos = ref<{ x: number; y: number } | null>(null);

    const handleMouseMove = (event: MouseEvent) => {
      // 存储最新的鼠标事件
      pendingMouseEvent = event;

      // 如果已经有待处理的 RAF，直接返回
      if (rafId !== null) {
        return;
      }

      // 使用 RAF 节流
      rafId = requestAnimationFrame(() => {
        rafId = null;

        if (!pendingMouseEvent) {
          return;
        }

        const evt = pendingMouseEvent;
        pendingMouseEvent = null;

        // 优先处理连接创建
        if (connectionDraft.value) {
          // 更新连接预览位置
          connectionPreviewPos.value = {
            x: evt.clientX,
            y: evt.clientY
          };
          return;
        }

        // 清除预览位置
        connectionPreviewPos.value = null;

        // 优先处理节点拖拽
        if (isNodeDragging) {
          handleNodeMouseMove(evt);
          return;
        }

        if (!isPanning) {
          return;
        }

        const deltaX = evt.clientX - panStartX;
        const deltaY = evt.clientY - panStartY;

        panViewport(deltaX, deltaY);

        // 重置起始位置
        panStartX = evt.clientX;
        panStartY = evt.clientY;
        panStartViewportX = viewport.value.x;
        panStartViewportY = viewport.value.y;

        // 触发视口变化事件
        emit('viewport-change', viewport.value);
        eventEmitter.emit('onCanvasPan', viewport.value);
      });
    };

    const handleMouseUp = (event: MouseEvent) => {
      // 处理连接完成
      if (connectionDraft.value) {
        const target = event.target as HTMLElement;
        const handleElement = target.closest('.flow-handle');

        if (handleElement) {
          const handleId = handleElement.getAttribute('data-handle-id');
          const handleType = handleElement.getAttribute('data-handle-type');
          const nodeId = handleElement.closest('.flow-node')?.getAttribute('data-node-id');

          if (nodeId && handleId && handleType === 'target' && nodeId !== connectionDraft.value.sourceNodeId) {
            // 创建连接
            const newEdge: FlowEdge = {
              id: `edge-${connectionDraft.value.sourceNodeId}-${nodeId}-${Date.now()}`,
              source: connectionDraft.value.sourceNodeId,
              target: nodeId,
              sourceHandle: connectionDraft.value.sourceHandleId,
              targetHandle: handleId,
              type: config.value.edges?.defaultType || 'bezier'
            };

            addEdge(newEdge);
            emit('connect', newEdge);
            eventEmitter.emit('onConnect', newEdge);
          }
        }

        connectionDraft.value = null;
        connectionPreviewPos.value = null;
        return;
      }

      if (isNodeDragging) {
        handleNodeMouseUp();
      }
      isPanning = false;
    };

    // 滚轮缩放
    const handleWheel = (event: WheelEvent) => {
      if (!config.value.canvas?.zoomOnScroll) {
        return;
      }

      event.preventDefault();

      const delta = event.deltaY > 0 ? -1 : 1;
      const zoomStep = config.value.canvas?.zoomStep || 0.1;
      const minZoom = config.value.canvas?.minZoom || 0.1;
      const maxZoom = config.value.canvas?.maxZoom || 4;

      const newZoom = Math.max(
        minZoom,
        Math.min(maxZoom, viewport.value.zoom + delta * zoomStep)
      );

      // 获取鼠标位置（相对于画布）
      const rect = canvasRef.value?.getBoundingClientRect();
      if (rect) {
        const centerX = event.clientX - rect.left;
        const centerY = event.clientY - rect.top;

        zoomViewport(newZoom, centerX, centerY);
      } else {
        zoomViewport(newZoom);
      }

      // 触发视口变化事件
      emit('viewport-change', viewport.value);
      eventEmitter.emit('onCanvasZoom', viewport.value);
    };

    // 节点拖拽状态
    let nodeDragState: {
      nodeId: string;
      startX: number;
      startY: number;
      startNodeX: number;
      startNodeY: number;
      hasMoved: boolean; // 标记是否发生了移动
    } | null = null;

    // 节点点击标志（用于区分拖拽和点击）
    let nodeClickBlocked = false;
    let nodeClickBlockTimeout: number | null = null;

    // 节点事件处理
    const handleNodeClick = (node: FlowNode, event: MouseEvent) => {
      // 如果点击被阻止（因为发生了拖拽），则不处理点击事件
      if (nodeClickBlocked) {
        nodeClickBlocked = false;
        if (nodeClickBlockTimeout) {
          clearTimeout(nodeClickBlockTimeout);
          nodeClickBlockTimeout = null;
        }
        return;
      }

      // 阻止事件冒泡到画布，避免触发画布点击事件
      event.stopPropagation();

      // 检查是否是多选模式（Ctrl/Cmd 键）
      const isMultiSelect = event.ctrlKey || event.metaKey;

      if (isMultiSelect) {
        // 多选模式：添加到当前选择
        selectNode(node.id, true);
      } else {
        // 单选模式：选中当前节点，取消其他所有选中（包括其他节点和连接线）
        selectNode(node.id, false);
      }

      emit('node-click', node, event);
      eventEmitter.emit('onNodeClick', node, event);
    };

    // 连接创建状态（响应式）
    const connectionDraft = ref<{
      sourceNodeId: string;
      sourceHandleId: string;
      startX: number;
      startY: number;
    } | null>(null);

    // 处理端口鼠标按下事件
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

        // 初始化预览位置
        connectionPreviewPos.value = {
          x: event.clientX,
          y: event.clientY
        };

        // 阻止节点拖拽和其他事件
        event.stopPropagation();
        event.preventDefault();
      }
    };

    // ✅ 性能优化：追踪拖拽节点 ID，用于 z-index 层级管理
    const draggingNodeId = ref<string | null>(null);

    const handleNodeMouseDown = (node: FlowNode, event: MouseEvent) => {
      // 检查是否点击在端口上（通过检查事件目标）
      const target = event.target as HTMLElement;
      if (target.closest('.flow-handle')) {
        // 端口事件会通过 onPortMouseDown 处理，这里不处理
        return;
      }

      // 检查节点是否可拖拽
      const draggable = node.draggable !== false && config.value.nodes?.draggable !== false;
      if (!draggable || node.locked) {
        return;
      }

      // ✅ 记录拖拽节点 ID（用于提升 z-index）
      draggingNodeId.value = node.id;

      isNodeDragging = true;
      nodeDragState = {
        nodeId: node.id,
        startX: event.clientX,
        startY: event.clientY,
        startNodeX: node.position.x,
        startNodeY: node.position.y,
        hasMoved: false // 初始化为未移动
      };

      event.stopPropagation();
    };

    // ✅ 性能优化：RAF 节流拖拽更新
    let isDraggingRaf = false;
    let pendingDragUpdate: { x: number; y: number } | null = null;

    const handleNodeMouseMove = (event: MouseEvent) => {
      if (!isNodeDragging || !nodeDragState) {
        return;
      }

      // 性能优化：使用 Map 查找，O(1) 复杂度
      const node = nodesMap.value.get(nodeDragState!.nodeId);
      if (!node) {
        isNodeDragging = false;
        nodeDragState = null;
        return;
      }

      // 计算屏幕坐标的偏移（用于判断是否移动）
      const screenDeltaX = event.clientX - nodeDragState.startX;
      const screenDeltaY = event.clientY - nodeDragState.startY;

      // 如果移动距离超过阈值（5px），标记为已移动
      const dragThreshold = 5;
      if (Math.abs(screenDeltaX) > dragThreshold || Math.abs(screenDeltaY) > dragThreshold) {
        nodeDragState.hasMoved = true;
      }

      // 计算画布坐标的偏移
      const deltaX = screenDeltaX / viewport.value.zoom;
      const deltaY = screenDeltaY / viewport.value.zoom;

      // 更新节点位置
      const newX = nodeDragState.startNodeX + deltaX;
      const newY = nodeDragState.startNodeY + deltaY;

      // 网格吸附（暂时不支持，可以通过配置扩展）
      const gridSize = config.value.canvas?.gridSize || 20;
      const finalX = newX;
      const finalY = newY;

      // ✅ 性能优化：保存待更新的位置，但不立即更新
      pendingDragUpdate = { x: finalX, y: finalY };

      // ✅ 性能优化：如果已经有 RAF 在执行，跳过（避免过度更新）
      if (isDraggingRaf) return;

      isDraggingRaf = true;
      requestAnimationFrame(() => {
        if (pendingDragUpdate && nodeDragState) {
          // ✅ 批量更新：位置更新
          const draggedNode = nodesMap.value.get(nodeDragState.nodeId);
          if (draggedNode) {
            draggedNode.position.x = pendingDragUpdate.x;
            draggedNode.position.y = pendingDragUpdate.y;
          }
          pendingDragUpdate = null;
        }
        isDraggingRaf = false;
      });
    };

    const handleNodeMouseUp = () => {
      const wasDragging = isNodeDragging;
      const hadMoved = nodeDragState?.hasMoved || false;

      // ✅ 清除拖拽节点 ID（恢复 z-index）
      draggingNodeId.value = null;

      isNodeDragging = false;
      nodeDragState = null;

      // 如果发生了拖拽移动，阻止后续的点击事件
      if (wasDragging && hadMoved) {
        nodeClickBlocked = true;
        // 在短时间内清除阻止标志（300ms 后清除）
        if (nodeClickBlockTimeout) {
          clearTimeout(nodeClickBlockTimeout);
        }
        nodeClickBlockTimeout = window.setTimeout(() => {
          nodeClickBlocked = false;
          nodeClickBlockTimeout = null;
        }, 300);
      }
    };

    const handleNodeDoubleClick = (node: FlowNode, event: MouseEvent) => {
      emit('node-double-click', node, event);
      eventEmitter.emit('onNodeDoubleClick', node, event);
    };

    // 连接线事件处理
    const handleEdgeClick = (edge: FlowEdge, event: MouseEvent) => {
      // 阻止事件冒泡到画布，避免触发画布点击事件
      event.stopPropagation();

      // 检查是否是多选模式（Ctrl/Cmd 键）
      const isMultiSelect = event.ctrlKey || event.metaKey;

      if (isMultiSelect) {
        // 多选模式：添加到当前选择
        selectEdge(edge.id, true);
      } else {
        // 单选模式：选中当前连接线，取消其他所有选中（包括所有节点和其他连接线）
        selectEdge(edge.id, false);
      }

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

      // 检查点击目标是否是节点、连接线或端口
      // 注意：由于背景和连接线 SVG 设置了 pointerEvents: 'none'，点击它们时事件会穿透
      const isNode = target.closest('.flow-node');
      const isEdge = target.closest('.flow-edge') || target.closest('path[stroke]');
      const isHandle = target.closest('.flow-handle');

      // 如果点击的不是节点、连接线或端口，则取消选中
      // 这包括点击背景、画布空白区域、或其他任何地方
      if (!isNode && !isEdge && !isHandle) {
        deselectAll();
        emit('viewport-change', viewport.value);
        eventEmitter.emit('onCanvasClick', event);
      }
    };

    // 生命周期
    onMounted(() => {
      if (canvasRef.value) {
        canvasRef.value.addEventListener('mousedown', handleMouseDown);
        // 使用 document 监听 mousemove 和 mouseup，确保在画布外也能响应
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        canvasRef.value.addEventListener('wheel', handleWheel);
        canvasRef.value.addEventListener('click', handleCanvasClick);
      }
    });

    onUnmounted(() => {
      // 清理 RAF
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (canvasRef.value) {
        canvasRef.value.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        canvasRef.value.removeEventListener('wheel', handleWheel);
        canvasRef.value.removeEventListener('click', handleCanvasClick);
      }
    });

    // 暴露给父组件的方法
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
        {connectionDraft.value && connectionPreviewPos.value && (() => {
          const sourceNode = nodes.value.find(n => n.id === connectionDraft.value!.sourceNodeId);
          if (!sourceNode) return null;

          // 计算源端口位置
          const sourceHandle = sourceNode.handles?.find(h => h.id === connectionDraft.value!.sourceHandleId);
          if (!sourceHandle) return null;

          const nodeX = sourceNode.position.x;
          const nodeY = sourceNode.position.y;
          const nodeWidth = sourceNode.size?.width || 220;
          const nodeHeight = sourceNode.size?.height || 72;

          let sourceX = 0;
          let sourceY = 0;

          switch (sourceHandle.position) {
            case 'top':
              sourceX = nodeX + nodeWidth / 2;
              sourceY = nodeY;
              break;
            case 'bottom':
              sourceX = nodeX + nodeWidth / 2;
              sourceY = nodeY + nodeHeight;
              break;
            case 'left':
              sourceX = nodeX;
              sourceY = nodeY + nodeHeight / 2;
              break;
            case 'right':
              sourceX = nodeX + nodeWidth;
              sourceY = nodeY + nodeHeight / 2;
              break;
          }

          // 获取画布容器的位置
          const canvasRect = canvasRef.value?.getBoundingClientRect();
          if (!canvasRect) return null;

          // 转换为屏幕坐标（相对于画布容器）
          const screenSourceX = sourceX * viewport.value.zoom + viewport.value.x;
          const screenSourceY = sourceY * viewport.value.zoom + viewport.value.y;
          // 鼠标位置需要转换为相对于画布容器的坐标
          const screenTargetX = connectionPreviewPos.value.x - canvasRect.left;
          const screenTargetY = connectionPreviewPos.value.y - canvasRect.top;

          // 生成预览路径（贝塞尔曲线）
          const dx = screenTargetX - screenSourceX;
          const controlOffset = 0.5;
          const controlX1 = screenSourceX + dx * controlOffset;
          const controlY1 = screenSourceY;
          const controlX2 = screenTargetX - dx * controlOffset;
          const controlY2 = screenTargetY;
          const previewPath = `M ${screenSourceX},${screenSourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${screenTargetX},${screenTargetY}`;

          return (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1000,
                overflow: 'visible'
              }}
            >
              {(() => {
                const zoom = viewport.value.zoom;

                // 预览线宽度（随缩放调整，但限制最小和最大值）
                const baseStrokeWidth = 2.5;
                const minStrokeWidth = 1;
                const maxStrokeWidth = 5;
                const previewStrokeWidth = Math.max(minStrokeWidth, Math.min(maxStrokeWidth, baseStrokeWidth * zoom));

                // 预览箭头大小（随缩放调整，但限制最小和最大值）
                const baseArrowSize = 12;
                const minArrowSize = 6;
                const maxArrowSize = 24;
                const previewArrowSize = Math.max(minArrowSize, Math.min(maxArrowSize, baseArrowSize * zoom));

                // 箭头参考点和路径大小（按比例缩放）
                const refX = (2 / baseArrowSize) * previewArrowSize;
                const refY = (6 / baseArrowSize) * previewArrowSize;
                const pathSize = (8 / baseArrowSize) * previewArrowSize;

                return (
                  <>
                    <defs>
                      <marker
                        id="flow-preview-arrow"
                        markerWidth={previewArrowSize}
                        markerHeight={previewArrowSize}
                        refX={refX}
                        refY={refY}
                        orient="auto"
                        markerUnits="userSpaceOnUse"
                      >
                        <path
                          d={`M${refX},${refX} L${refX},${refX + pathSize} L${refX + pathSize},${refY} z`}
                          fill="#2080f0"
                        />
                      </marker>
                    </defs>
                    <path
                      d={previewPath}
                      stroke="#2080f0"
                      stroke-width={previewStrokeWidth}
                      fill="none"
                      stroke-dasharray="5,5"
                      marker-end="url(#flow-preview-arrow)"
                    />
                  </>
                );
              })()}
            </svg>
          );
        })()}

        {/* 其他插槽内容（工具栏、小地图等） */}
        {slots.default && slots.default()}
      </div>
    );
  }
});

