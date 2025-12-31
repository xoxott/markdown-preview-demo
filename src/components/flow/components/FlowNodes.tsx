/**
 * Flow 节点列表组件
 *
 * 负责渲染所有节点，支持视口裁剪、虚拟滚动等性能优化
 */

import { defineComponent, computed, ref, type PropType } from 'vue';
import BaseNode from './nodes/BaseNode';
import { useSpatialIndex } from '../hooks/useSpatialIndex';
import { useViewportCulling } from '../hooks/useViewportCulling';
import { useNodeState } from '../hooks/useNodeState';
import { useNodeStyle } from '../hooks/useNodeStyle';
import type { FlowNode, FlowViewport } from '../types';

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
  /** 视口状态 */
  viewport?: FlowViewport;
  /** 是否启用视口裁剪 */
  enableViewportCulling?: boolean;
  /** 视口裁剪缓冲区（像素） */
  viewportCullingBuffer?: number;
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
    viewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
    },
    enableViewportCulling: {
      type: Boolean,
      default: true
    },
    viewportCullingBuffer: {
      type: Number,
      default: 200
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
    }
  },
  setup(props) {
    // 创建响应式引用
    const nodesRef = computed(() => props.nodes);
    const selectedNodeIdsRef = computed(() => props.selectedNodeIds || []);
    const lockedNodeIdsRef = computed(() => props.lockedNodeIds || []);
    const draggingNodeIdRef = computed(() => props.draggingNodeId);
    const viewportRef = computed(() => props.viewport);
    const enableViewportCullingRef = computed(() => props.enableViewportCulling ?? true);

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
      spatialIndexThreshold: 50
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
      draggingNodeId: draggingNodeIdRef
    });
    return () => (
      <div class="flow-nodes" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {visibleNodes.value.map((node: FlowNode) => {
          const state = getNodeState(node);
          const style = getNodeStyle(node);

          return (
            <div
              key={node.id}
              style={style}
              onClick={props.onNodeClick ? (event: MouseEvent) => props.onNodeClick!(node, event) : undefined}
              onDblclick={props.onNodeDoubleClick ? (event: MouseEvent) => props.onNodeDoubleClick!(node, event) : undefined}
              onMousedown={props.onNodeMouseDown ? (event: MouseEvent) => props.onNodeMouseDown!(node, event) : undefined}
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
        })}
      </div>
    );
  }
});

