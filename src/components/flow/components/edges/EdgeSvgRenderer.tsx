/**
 * 连接线 SVG 渲染器组件
 *
 * 负责使用 SVG 渲染连接线，支持贝塞尔曲线和箭头
 */

import { defineComponent, computed, type PropType, CSSProperties } from 'vue';
import { getGpuAccelerationStyle } from '../../utils/style-utils';
import { useEventHandlers } from '../../hooks/useEventHandlers';
import { generateEdgePath } from '../../utils/edge-path-generator';
import BaseEdge from './BaseEdge';
import type { FlowEdge, FlowViewport } from '../../types';
import type { EdgePositions } from '../../hooks/useEdgePositions';
import {
  ARROW_PATH_RATIOS,
  ARROW_SIZES,
  EDGE_CLASS_NAMES,
  EDGE_COLORS,
  ID_PREFIXES,
  MARKER_PATH_SUFFIXES,
  MARKER_SUFFIXES
} from '../../constants/edge-constants';

/**
 * EdgeSvgRenderer 组件属性
 */
export interface EdgeSvgRendererProps {
  /** 可见连接线列表 */
  visibleEdges: FlowEdge[];
  /** 连接线位置计算函数 */
  getEdgePositions: (edge: FlowEdge) => EdgePositions | null;
  /** 选中的连接线 ID 集合 */
  selectedEdgeIdsSet: Set<string>;
  /** 视口状态 */
  viewport: FlowViewport;
  /** 实例 ID（用于生成唯一的 SVG ID） */
  instanceId: string;
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
 * 计算箭头大小
 */
function calculateArrowSize(zoom: number): number {
  return Math.max(
    ARROW_SIZES.MIN,
    Math.min(ARROW_SIZES.MAX, ARROW_SIZES.BASE * zoom)
  );
}

/**
 * 连接线 SVG 渲染器组件
 */
export default defineComponent({
  name: 'EdgeSvgRenderer',
  props: {
    visibleEdges: {
      type: Array as PropType<FlowEdge[]>,
      required: true
    },
    getEdgePositions: {
      type: Function as PropType<(edge: FlowEdge) => EdgePositions | null>,
      required: true
    },
    selectedEdgeIdsSet: {
      type: Object as PropType<Set<string>>,
      required: true
    },
    viewport: {
      type: Object as PropType<FlowViewport>,
      required: true
    },
    instanceId: {
      type: String,
      required: true
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
    const idPrefix = computed(() => `${ID_PREFIXES.ARROW}${props.instanceId}`);
    const zoom = computed(() => props.viewport?.zoom ?? 1);
    const arrowSize = computed(() => calculateArrowSize(zoom.value));

    // 箭头参考点和路径大小（按比例缩放）
    const refX = computed(() => ARROW_PATH_RATIOS.REF_X * arrowSize.value);
    const refY = computed(() => ARROW_PATH_RATIOS.REF_Y * arrowSize.value);
    const pathSize = computed(() => ARROW_PATH_RATIOS.PATH_SIZE * arrowSize.value);

    // 箭头路径定义
    const arrowPath = computed(() => {
      const rx = refX.value;
      const ps = pathSize.value;
      return `M${rx},${rx} L${rx},${rx + ps} L${rx + ps},${refY.value} z`;
    });

    // GPU 加速样式
    const svgStyle = computed<CSSProperties>(() => ({
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: 1,
      ...getGpuAccelerationStyle({
        enabled: true,
        includeBackfaceVisibility: true,
        includePerspective: true
      })
    }));

    const { eventHandlers } = useEventHandlers({
      items: computed(() => props.visibleEdges),
      getId: (edge) => edge.id,
      handlers: {
        onClick: props.onEdgeClick,
        onDoubleClick: props.onEdgeDoubleClick,
        onMouseEnter: props.onEdgeMouseEnter,
        onMouseLeave: props.onEdgeMouseLeave
      }
    });

    return () => {
      const handlers = eventHandlers.value;

      return (
        <svg
          class={EDGE_CLASS_NAMES.CONTAINER}
          style={svgStyle.value}
        >
        {/* 共享的箭头标记定义 */}
        <defs>
          {/* 共享的箭头路径定义 */}
          <path
            id={`${idPrefix.value}${MARKER_PATH_SUFFIXES.DEFAULT}`}
            d={arrowPath.value}
            fill={EDGE_COLORS.DEFAULT}
          />
          <path
            id={`${idPrefix.value}${MARKER_PATH_SUFFIXES.SELECTED}`}
            d={arrowPath.value}
            fill={EDGE_COLORS.SELECTED}
          />
          <path
            id={`${idPrefix.value}${MARKER_PATH_SUFFIXES.HOVERED}`}
            d={arrowPath.value}
            fill={EDGE_COLORS.HOVERED}
          />

          {/* 箭头标记 */}
          <marker
            id={`${idPrefix.value}${MARKER_SUFFIXES.DEFAULT}`}
            markerWidth={arrowSize.value}
            markerHeight={arrowSize.value}
            refX={refX.value}
            refY={refY.value}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <use href={`#${idPrefix.value}${MARKER_PATH_SUFFIXES.DEFAULT}`} />
          </marker>

          <marker
            id={`${idPrefix.value}${MARKER_SUFFIXES.SELECTED}`}
            markerWidth={arrowSize.value}
            markerHeight={arrowSize.value}
            refX={refX.value}
            refY={refY.value}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <use href={`#${idPrefix.value}${MARKER_PATH_SUFFIXES.SELECTED}`} />
          </marker>

          <marker
            id={`${idPrefix.value}${MARKER_SUFFIXES.HOVERED}`}
            markerWidth={arrowSize.value}
            markerHeight={arrowSize.value}
            refX={refX.value}
            refY={refY.value}
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <use href={`#${idPrefix.value}${MARKER_PATH_SUFFIXES.HOVERED}`} />
          </marker>
        </defs>

        {/* 渲染连接线 */}
        {props.visibleEdges.map(edge => {
          const positions = props.getEdgePositions(edge);
          if (!positions) {
            return null;
          }

          const isSelected = props.selectedEdgeIdsSet.has(edge.id);
          const path = generateEdgePath(edge, positions, {
            showArrow: edge.showArrow !== false,
            viewport: props.viewport
          });

          const handler = handlers?.get(edge.id);

          return (
            <BaseEdge
              key={edge.id}
              edge={edge}
              sourceX={positions.sourceX}
              sourceY={positions.sourceY}
              targetX={positions.targetX}
              targetY={positions.targetY}
              sourceHandleX={positions.sourceHandleX}
              sourceHandleY={positions.sourceHandleY}
              targetHandleX={positions.targetHandleX}
              targetHandleY={positions.targetHandleY}
              path={path}
              viewport={props.viewport}
              instanceId={props.instanceId}
              selected={isSelected}
              onClick={handler?.onClick}
              onDouble-click={handler?.onDoubleClick}
              onMouseenter={handler?.onMouseEnter}
              onMouseleave={handler?.onMouseLeave}
            />
          );
        })}
        </svg>
      );
    };
  }
});

