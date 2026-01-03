/**
 * Flow 连接线列表组件
 *
 * 负责渲染所有连接线，支持 Canvas/SVG 混合渲染、视口裁剪等性能优化
 * 重构后：逻辑解耦，性能优化
 */

import { computed, toRef, defineComponent, type PropType } from 'vue';
import { useEdgeViewportCulling } from '../hooks/useEdgeViewportCulling';
import { useEdgePositions } from '../hooks/useEdgePositions';
import { useCachedSet } from '../utils/set-utils';
import EdgeCanvasRenderer from './edges/EdgeCanvasRenderer';
import EdgeSvgRenderer from './edges/EdgeSvgRenderer';
import type { FlowEdge, FlowNode, FlowViewport } from '../types';

/**
 * FlowEdges 组件属性
 */
export interface FlowEdgesProps {
  /** 连接线列表 */
  edges: FlowEdge[];
  /** 节点列表（用于计算连接线位置） */
  nodes: FlowNode[];
  /** 选中的连接线 ID 列表 */
  selectedEdgeIds?: string[];
  /** 视口状态 */
  viewport?: FlowViewport;
  /** 实例 ID（用于生成唯一的 SVG ID） */
  instanceId?: string;
  /** 是否启用视口裁剪 */
  enableViewportCulling?: boolean;
  /** 是否启用 Canvas 渲染（大量连接线时性能更好） */
  enableCanvasRendering?: boolean;
  /** Canvas 渲染阈值（连接线数量超过此值使用 Canvas） */
  canvasThreshold?: number;
  /** 连接线点击事件 */
  onEdgeClick?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线双击事件 */
  onEdgeDoubleClick?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线鼠标进入 */
  onEdgeMouseEnter?: (edge: FlowEdge, event: MouseEvent) => void;
  /** 连接线鼠标离开 */
  onEdgeMouseLeave?: (edge: FlowEdge, event: MouseEvent) => void;
}


/**
 * Flow 连接线列表组件
 */
export default defineComponent({
  name: 'FlowEdges',
  props: {
    edges: {
      type: Array as PropType<FlowEdge[]>,
      required: true
    },
    nodes: {
      type: Array as PropType<FlowNode[]>,
      required: true
    },
    selectedEdgeIds: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      default: () => ({ x: 0, y: 0, zoom: 1 })
    },
    instanceId: {
      type: String,
      default: 'default'
    },
    enableViewportCulling: {
      type: Boolean,
      default: true
    },
    enableCanvasRendering: {
      type: Boolean,
      default: false
    },
    canvasThreshold: {
      type: Number,
      default: 200
    },
    onEdgeClick: {
      type: Function as PropType<(edge: FlowEdge, event: MouseEvent) => void>,
      default: undefined
    },
    onEdgeDoubleClick: {
      type: Function as PropType<(edge: FlowEdge, event: MouseEvent) => void>,
      default: undefined
    },
    onEdgeMouseEnter: {
      type: Function as PropType<(edge: FlowEdge, event: MouseEvent) => void>,
      default: undefined
    },
    onEdgeMouseLeave: {
      type: Function as PropType<(edge: FlowEdge, event: MouseEvent) => void>,
      default: undefined
    }
  },
  setup(props) {

    const edgesRef = toRef(props, 'edges');
    const nodesRef = toRef(props, 'nodes');
    const viewportRef = computed(() => props.viewport || { x: 0, y: 0, zoom: 1 });

    // 是否使用 Canvas 渲染
    const useCanvas = computed(() => {
      return props.enableCanvasRendering && props.edges.length >= props.canvasThreshold;
    });

    const selectedEdgeIdsRef = computed(() => props.selectedEdgeIds || []);
    const selectedEdgeIdsSet = useCachedSet(selectedEdgeIdsRef);

    const defaultInstanceId = computed(() => props.instanceId || 'default');

    // 视口裁剪
    const { visibleEdges } = useEdgeViewportCulling({
      edges: edgesRef,
      nodes: nodesRef,
      viewport: viewportRef,
      enabled: props.enableViewportCulling !== false
    });

    // 位置计算
    const { getEdgePositions } = useEdgePositions({
      edges: edgesRef,
      nodes: nodesRef,
      viewport: viewportRef
    });


    return () => {
      // 使用 Canvas 渲染
      if (useCanvas.value) {
        return (
          <EdgeCanvasRenderer
            visibleEdges={visibleEdges.value}
            getEdgePositions={getEdgePositions}
            selectedEdgeIdsSet={selectedEdgeIdsSet.value}
            viewport={viewportRef.value}
          />
        );
      }

      // 使用 SVG 渲染
      return (
        <EdgeSvgRenderer
          visibleEdges={visibleEdges.value}
          getEdgePositions={getEdgePositions}
          selectedEdgeIdsSet={selectedEdgeIdsSet.value}
          viewport={viewportRef.value}
          instanceId={defaultInstanceId.value}
          onEdgeClick={props.onEdgeClick}
          onEdgeDoubleClick={props.onEdgeDoubleClick}
          onEdgeMouseEnter={props.onEdgeMouseEnter}
          onEdgeMouseLeave={props.onEdgeMouseLeave}
        />
      );
    };
  }
});
