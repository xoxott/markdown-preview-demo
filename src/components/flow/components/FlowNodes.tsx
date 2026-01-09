/**
 * Flow 节点列表组件
 *
 * 负责渲染所有节点，支持视口裁剪、虚拟滚动等性能优化
 */

import { computed, toRef, defineComponent, type PropType, type CSSProperties } from 'vue';
import { useNodeState } from '../hooks/useNodeState';
import { useNodeStyle } from '../hooks/useNodeStyle';
import { useSpatialIndex } from '../hooks/useSpatialIndex';
import { useViewportCulling } from '../hooks/useViewportCulling';
import { createNodeEventDelegation } from '../utils/event-utils';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';
import { performanceMonitor } from '../utils/performance-monitor';
import type { FlowNode, FlowViewport, FlowConfig } from '../types';
import BaseNode from './nodes/BaseNode';

/**
 * FlowNodes 组件属性
 */
export interface FlowNodesProps {
  /** 节点列表 */
  nodes: FlowNode[];
  /** 选中的节点 ID 列表 */
  selectedNodeIds?: string[];
  /** 锁定的节点 ID 列表 */
  lockedNodeIds?: string[];
  /** 正在拖拽的节点 ID（用于 z-index 层级管理） */
  draggingNodeId?: string | null;
  /** 已提升层级的节点 ID 映射（节点 ID -> z-index 值，包括拖拽释放和选中的节点） */
  elevatedNodeIds?: Map<string, number>;
  /** 分配递增的 z-index（用于拖拽释放和选中节点） */
  allocateZIndex?: (nodeId: string) => number;
  /** 移除节点的 z-index */
  removeZIndex?: (nodeId: string) => void;
  /** 视口状态 */
  viewport?: FlowViewport;
  /** 配置（用于判断是否启用拖拽后提升层级） */
  config?: Readonly<FlowConfig>;
  /** 是否启用视口裁剪 */
  enableViewportCulling?: boolean;
  /** 视口裁剪缓冲区（像素） */
  viewportCullingBuffer?: number;
  /** 是否正在平移画布（平移时暂停视口裁剪更新以优化性能） */
  isPanning?: boolean;
  /** 节点点击事件 */
  onNodeClick?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点双击事件 */
  onNodeDoubleClick?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽开始 */
  onNodeDragStart?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽 */
  onNodeDrag?: (node: FlowNode, event: MouseEvent) => void;
  /** 节点拖拽结束 */
  onNodeDragStop?: (node: FlowNode, event: MouseEvent) => void;
  /** 端口鼠标按下 */
  onPortMouseDown?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标抬起 */
  onPortMouseUp?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标进入 */
  onPortMouseEnter?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 端口鼠标离开 */
  onPortMouseLeave?: (nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void;
  /** 节点鼠标按下 */
  onNodeMouseDown?: (node: FlowNode, event: MouseEvent) => void;
}

/**
 * Flow 节点列表组件
 */
export default defineComponent({
  name: 'FlowNodes',
  props: {
    nodes: {
      type: Array as PropType<FlowNode[]>,
      required: true
    },
    selectedNodeIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    lockedNodeIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    draggingNodeId: {
      type: String as PropType<string | null>,
      default: null
    },
    elevatedNodeIds: {
      type: Object as PropType<Map<string, number>>,
      default: () => new Map()
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
    },
    config: {
      type: Object as PropType<Readonly<FlowConfig>>,
      default: undefined
    },
    enableViewportCulling: {
      type: Boolean,
      default: true
    },
    viewportCullingBuffer: {
      type: Number,
      default: 200
    },
    isPanning: {
      type: Boolean,
      default: false
    },
    onNodeClick: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDoubleClick: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDragStart: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDrag: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onNodeDragStop: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseDown: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseUp: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseEnter: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onPortMouseLeave: {
      type: Function as PropType<(nodeId: string, handleId: string, handleType: 'source' | 'target', event: MouseEvent) => void>,
      default: undefined
    },
    onNodeMouseDown: {
      type: Function as PropType<(node: FlowNode, event: MouseEvent) => void>,
      default: undefined
    },
    allocateZIndex: {
      type: Function as PropType<(nodeId: string) => number>,
      default: undefined
    },
    removeZIndex: {
      type: Function as PropType<(nodeId: string) => void>,
      default: undefined
    }
  },
  setup(props) {

    const nodesRef = toRef(props, 'nodes');
    const selectedNodeIdsRef = computed(() => props.selectedNodeIds || []);
    const lockedNodeIdsRef = computed(() => props.lockedNodeIds || []);
    const draggingNodeIdRef = toRef(props, 'draggingNodeId');
    const elevatedNodeIdsRef = computed(() => props.elevatedNodeIds || new Map());
    const configRef = computed(() => props.config);
    const viewportRef = computed(() => props.viewport || { x: 0, y: 0, zoom: 1 });
    const enableViewportCullingRef = computed(() => props.enableViewportCulling ?? true);
    const isPanningRef = computed(() => props.isPanning ?? false);


    // 空间索引管理
    const { spatialIndex } = useSpatialIndex({
      nodes: nodesRef,
      enabled: enableViewportCullingRef
    });

    // 视口裁剪
    const { visibleNodes } = useViewportCulling({
      nodes: nodesRef,
      viewport: viewportRef,
      enabled: enableViewportCullingRef,
      buffer: props.viewportCullingBuffer,
      spatialIndex,
      spatialIndexThreshold: PERFORMANCE_CONSTANTS.SPATIAL_INDEX_THRESHOLD,
      isPanning: isPanningRef
    });

    // 节点状态管理
    const { getNodeState } = useNodeState({
      nodes: nodesRef,
      selectedNodeIds: selectedNodeIdsRef,
      lockedNodeIds: lockedNodeIdsRef,
      draggingNodeId: draggingNodeIdRef
    });

    // 节点样式管理
    const { getNodeStyle } = useNodeStyle({
      nodes: nodesRef,
      selectedNodeIds: selectedNodeIdsRef,
      draggingNodeId: draggingNodeIdRef,
      elevatedNodeIds: elevatedNodeIdsRef,
      allocateZIndex: props.allocateZIndex,
      removeZIndex: props.removeZIndex,
      config: configRef
    });

    const handleNodeClick = createNodeEventDelegation(
      visibleNodes,
      props.onNodeClick
    );

    const handleNodeDoubleClick = createNodeEventDelegation(
      visibleNodes,
      props.onNodeDoubleClick
    );

    const handleNodeMouseDown = createNodeEventDelegation(
      visibleNodes,
      props.onNodeMouseDown,
      { excludeSelector: '.flow-handle' } // 排除端口点击
    );

    const containerStyle: CSSProperties = {
      position: 'relative',
      width: '100%',
      height: '100%',
      pointerEvents: 'auto'
    };

    // 使用 ref 缓存上一次渲染的节点 ID 列表和关键 props，用于检测是否真的需要重新渲染
    let lastRenderedNodeIds: string[] = [];
    let lastSelectedNodeIds: string[] = [];
    let lastDraggingNodeId: string | null = null;
    let lastViewport: FlowViewport | null = null;
    let renderCount = 0;
    // 缓存上一次的 VNode 数组，用于在节点列表未变化时复用
    let lastVNodes: any[] = [];
    // 缓存上一次的节点位置映射，用于检测节点位置是否变化
    let lastNodePositions: Map<string, { x: number; y: number }> = new Map();

    return () => {
      const renderStart = performance.now();
      const nodeCount = visibleNodes.value.length;
      const currentNodeIds = visibleNodes.value.map(n => n.id);
      const currentSelectedNodeIds = props.selectedNodeIds || [];
      const currentDraggingNodeId = props.draggingNodeId || null;
      const currentViewport = props.viewport;

      // 检查节点列表是否真的变化了
      const nodesChanged =
        currentNodeIds.length !== lastRenderedNodeIds.length ||
        currentNodeIds.some((id, index) => id !== lastRenderedNodeIds[index]);

      // 检查选中状态是否变化
      const selectionChanged =
        currentSelectedNodeIds.length !== lastSelectedNodeIds.length ||
        currentSelectedNodeIds.some((id, index) => id !== lastSelectedNodeIds[index]);

      // 检查拖拽状态是否变化
      const draggingChanged = currentDraggingNodeId !== lastDraggingNodeId;

      // 检查 viewport 是否变化
      const viewportChanged =
        !lastViewport ||
        lastViewport.x !== currentViewport?.x ||
        lastViewport.y !== currentViewport?.y ||
        lastViewport.zoom !== currentViewport?.zoom;

      // 检查节点位置是否变化（重要：拖拽节点时位置会变化）
      let nodePositionsChanged = false;
      if (!nodesChanged && lastNodePositions.size > 0) {
        // 如果节点列表没变，检查每个节点的位置是否变化
        for (const node of visibleNodes.value) {
          const lastPos = lastNodePositions.get(node.id);
          if (!lastPos || lastPos.x !== node.position.x || lastPos.y !== node.position.y) {
            nodePositionsChanged = true;
            // 调试：输出位置变化信息
            if (lastPos) {
              console.log('[Debug] 节点位置变化:', {
                nodeId: node.id,
                oldPos: { x: lastPos.x, y: lastPos.y },
                newPos: { x: node.position.x, y: node.position.y }
              });
            }
            break;
          }
        }
      } else if (nodesChanged) {
        // 如果节点列表变化了，位置肯定也变化了
        nodePositionsChanged = true;
      } else if (lastNodePositions.size === 0) {
        // 第一次渲染，位置肯定变化了
        nodePositionsChanged = true;
      }

      // 调试：输出检查结果
      if (nodePositionsChanged) {
        console.log('[Debug] 节点位置变化检测:', {
          nodesChanged,
          selectionChanged,
          draggingChanged,
          nodePositionsChanged,
          nodeCount,
          lastVNodesLength: lastVNodes.length,
          lastNodePositionsSize: lastNodePositions.size
        });
      }

      // 性能优化：如果节点列表、选中状态、拖拽状态、节点位置都没变化，可以复用 VNode
      // 因为节点位置通过 CSS transform 控制，viewport 变化不需要重新渲染节点
      if (!nodesChanged && !selectionChanged && !draggingChanged && !nodePositionsChanged && lastVNodes.length === nodeCount) {
        const renderTime = performance.now() - renderStart;

        if (viewportChanged) {
          console.log('[Performance] FlowNodes 复用 VNode（节点未变化，仅 viewport 变化）:', {
            time: renderTime.toFixed(3) + 'ms',
            nodeCount,
            isPanning: props.isPanning,
            viewportX: currentViewport?.x,
            viewportY: currentViewport?.y
          });
        }

        // 更新 viewport 缓存
        lastViewport = currentViewport ? { ...currentViewport } : null;

        // 复用上一次的 VNode 数组（Vue 会自动处理 key 匹配）
        return (
          <div
            class="flow-nodes"
            style={containerStyle}
            onClick={props.onNodeClick ? handleNodeClick : undefined}
            onDblclick={props.onNodeDoubleClick ? handleNodeDoubleClick : undefined}
            onMousedown={props.onNodeMouseDown ? handleNodeMouseDown : undefined}
          >
            {lastVNodes}
          </div>
        );
      }

      renderCount++;

      // 性能优化：批量计算节点状态和样式，减少函数调用开销
      const nodesStart = performance.now();

      // 预计算选中和拖拽状态 Set，避免在循环中重复访问 computed
      const selectedNodeIdsSet = new Set(currentSelectedNodeIds);
      const draggingNodeId = currentDraggingNodeId;

      const nodes = visibleNodes.value.map((node: FlowNode) => {
        // 使用缓存的 getNodeState 和 getNodeStyle（它们内部有缓存）
        const state = getNodeState(node);
        const style = getNodeStyle(node);

        return (
          <div
            key={node.id}
            data-node-id={node.id}
            style={style}
          >
            <BaseNode
              node={node}
              selected={state.selected}
              locked={state.locked}
              hovered={state.hovered}
              dragging={state.dragging}
              onPort-mousedown={props.onPortMouseDown}
              onPort-mouseup={props.onPortMouseUp}
              onPort-mouseenter={props.onPortMouseEnter}
              onPort-mouseleave={props.onPortMouseLeave}
            />
          </div>
        );
      });
      const nodesTime = performance.now() - nodesStart;

      // 缓存 VNode 数组
      lastVNodes = nodes;

      const renderTime = performance.now() - renderStart;

      // 记录渲染性能
      performanceMonitor.record('nodesRender', renderTime, {
        nodeCount,
        isPanning: props.isPanning,
        nodesChanged,
        selectionChanged,
        draggingChanged,
        renderCount,
        nodesTime
      });

      // 记录所有渲染（用于调试）
      console.log('[Performance] FlowNodes 渲染:', {
        time: renderTime.toFixed(3) + 'ms',
        nodesTime: nodesTime.toFixed(3) + 'ms',
        nodeCount,
        avgPerNode: (nodesTime / nodeCount).toFixed(3) + 'ms',
        nodesChanged,
        selectionChanged,
        draggingChanged,
        isPanning: props.isPanning,
        renderCount
      });

      // 如果渲染耗时超过阈值，输出详细警告
      if (renderTime > 10) {
        console.warn('[Performance] FlowNodes 渲染过慢:', {
          total: renderTime.toFixed(2) + 'ms',
          nodesTime: nodesTime.toFixed(2) + 'ms',
          nodeCount,
          avgPerNode: (nodesTime / nodeCount).toFixed(3) + 'ms',
          nodesChanged,
          selectionChanged,
          draggingChanged
        });
      }

      // 更新缓存的节点 ID 列表和状态
      lastRenderedNodeIds = currentNodeIds;
      lastSelectedNodeIds = [...currentSelectedNodeIds];
      lastDraggingNodeId = currentDraggingNodeId;
      lastViewport = currentViewport ? { ...currentViewport } : null;

      // 更新节点位置缓存（重要：用于检测拖拽时节点位置变化）
      lastNodePositions.clear();
      for (const node of visibleNodes.value) {
        lastNodePositions.set(node.id, {
          x: node.position.x,
          y: node.position.y
        });
      }

      return (
        <div
          class="flow-nodes"
          style={containerStyle}
          onClick={props.onNodeClick ? handleNodeClick : undefined}
          onDblclick={props.onNodeDoubleClick ? handleNodeDoubleClick : undefined}
          onMousedown={props.onNodeMouseDown ? handleNodeMouseDown : undefined}
        >
          {nodes}
        </div>
      );
    };
  }
});

