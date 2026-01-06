/**
 * Flow 基础连接线组件
 *
 * 提供通用的连接线容器，支持路径渲染、箭头、样式、动画等
 */

import { defineComponent, computed, type PropType } from 'vue';
import { getConditionalGpuAccelerationStyle } from '../../utils/style-utils';
import type { FlowEdge } from '../../types/flow-edge';
import {
  ANIMATION_CONSTANTS,
  EDGE_CLASS_NAMES,
  EDGE_COLORS,
  ID_PREFIXES,
  LABEL_STYLES,
  MARKER_SUFFIXES,
  STROKE_WIDTHS
} from '../../constants/edge-constants';
import {
  calculateStrokeWidth
} from '../../utils/edge-style-utils';

/**
 * BaseEdge 组件属性
 */
export interface BaseEdgeProps {
  /** 连接线数据 */
  edge: FlowEdge;
  /** 源节点位置 */
  sourceX: number;
  sourceY: number;
  /** 目标节点位置 */
  targetX: number;
  targetY: number;
  /** 源端口位置（可选） */
  sourceHandleX?: number;
  sourceHandleY?: number;
  /** 目标端口位置（可选） */
  targetHandleX?: number;
  targetHandleY?: number;
  /** 是否选中 */
  selected?: boolean;
  /** 是否悬停 */
  hovered?: boolean;
  /** 路径数据（SVG path d 属性） */
  path?: string;
  /** 视口状态（用于计算缩放后的线条粗细和箭头大小） */
  viewport?: { zoom: number };
  /** 实例 ID（用于生成唯一的箭头标记 ID） */
  instanceId?: string;
  /** 自定义样式 */
  style?: Record<string, any>;
    /** CSS 类名 */
    class?: string;
    /** 自定义箭头标记 ID（覆盖默认的标记 ID） */
    markerEnd?: string;
}

/**
 * 基础连接线组件
 */
export default defineComponent({
  name: 'BaseEdge',
  props: {
    edge: {
      type: Object as PropType<FlowEdge>,
      required: true
    },
    sourceX: {
      type: Number,
      required: true
    },
    sourceY: {
      type: Number,
      required: true
    },
    targetX: {
      type: Number,
      required: true
    },
    targetY: {
      type: Number,
      required: true
    },
    sourceHandleX: {
      type: Number,
      default: undefined
    },
    sourceHandleY: {
      type: Number,
      default: undefined
    },
    targetHandleX: {
      type: Number,
      default: undefined
    },
    targetHandleY: {
      type: Number,
      default: undefined
    },
    selected: {
      type: Boolean,
      default: false
    },
    hovered: {
      type: Boolean,
      default: false
    },
    path: {
      type: String,
      default: undefined
    },
    viewport: {
      type: Object as PropType<{ zoom: number }>,
      default: () => ({ zoom: 1 })
    },
    instanceId: {
      type: String,
      default: 'default'
    },
    style: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    class: {
      type: String,
      default: ''
    },
    markerEnd: {
      type: String,
      default: undefined
    }
  },
  emits: ['click', 'double-click', 'mouseenter', 'mouseleave', 'contextmenu'],
  setup(props, { emit, slots }) {

    const arrowIdPrefix = computed(() => `${ID_PREFIXES.ARROW}${props.instanceId}`);

    // 计算实际起点和终点（如果有端口位置，使用端口位置）
    const startX = computed(() => props.sourceHandleX ?? props.sourceX);
    const startY = computed(() => props.sourceHandleY ?? props.sourceY);
    const endX = computed(() => props.targetHandleX ?? props.targetX);
    const endY = computed(() => props.targetHandleY ?? props.targetY);

    // 计算路径（如果没有提供，使用直线）
    const pathData = computed(() => {
      if (props.path) {
        return props.path;
      }

      // 默认直线路径
      return `M ${startX.value},${startY.value} L ${endX.value},${endY.value}`;
    });

    // 计算连接线样式
    const edgeStyle = computed(() => {
      const zoom = props.viewport?.zoom || 1;

      // 使用工具函数计算基础线条宽度
      const scaledStrokeWidth = calculateStrokeWidth(STROKE_WIDTHS.BASE, zoom);

      const baseStyle: Record<string, any> = {
        fill: 'none',
        strokeWidth: scaledStrokeWidth,
        stroke: EDGE_COLORS.DEFAULT,
        pointerEvents: 'stroke',
        cursor: 'pointer',
        ...props.edge.style,
        ...props.style
      };

      // 选中状态样式
      if (props.selected) {
        baseStyle.strokeWidth = calculateStrokeWidth(STROKE_WIDTHS.SELECTED, zoom);
        baseStyle.stroke = EDGE_COLORS.SELECTED;
      }

      // 悬停状态样式
      if (props.hovered) {
        baseStyle.strokeWidth = calculateStrokeWidth(STROKE_WIDTHS.HOVERED, zoom);
        baseStyle.stroke = EDGE_COLORS.HOVERED;
      }

      // 动画
      if (props.edge.animated) {
        baseStyle.strokeDasharray = ANIMATION_CONSTANTS.DASH_ARRAY;
        baseStyle.animation = `${ANIMATION_CONSTANTS.NAME} ${ANIMATION_CONSTANTS.DURATION} ${ANIMATION_CONSTANTS.TIMING_FUNCTION} ${ANIMATION_CONSTANTS.ITERATION_COUNT}`;
      }

      return baseStyle;
    });

    // 计算连接线类名
    const edgeClass = computed(() => {
      const classes = [EDGE_CLASS_NAMES.BASE, props.edge.class, props.class];

      if (props.selected) classes.push(EDGE_CLASS_NAMES.SELECTED);
      if (props.hovered) classes.push(EDGE_CLASS_NAMES.HOVERED);
      if (props.edge.animated) classes.push(EDGE_CLASS_NAMES.ANIMATED);

      return classes.filter(Boolean).join(' ');
    });

    // 事件处理
    const handleClick = (event: MouseEvent) => {
      emit('click', event);
    };

    const handleDoubleClick = (event: MouseEvent) => {
      emit('double-click', event);
    };

    const handleMouseEnter = (event: MouseEvent) => {
      emit('mouseenter', event);
    };

    const handleMouseLeave = (event: MouseEvent) => {
      emit('mouseleave', event);
    };

    const handleContextMenu = (event: MouseEvent) => {
      emit('contextmenu', event);
    };

    // 计算箭头标记 ID（使用共享标记，带实例 ID）
    // 如果提供了自定义 markerEnd，优先使用它
    const markerEndId = computed(() => {
      // 如果提供了自定义 markerEnd，直接使用
      if (props.markerEnd !== undefined) {
        return props.markerEnd;
      }

      if (props.edge.showArrow === false) {
        return undefined;
      }
      const prefix = arrowIdPrefix.value;
      // 根据状态选择对应的共享标记
      if (props.selected) {
        return `${prefix}${MARKER_SUFFIXES.SELECTED}`;
      }
      if (props.hovered) {
        return `${prefix}${MARKER_SUFFIXES.HOVERED}`;
      }
      return `${prefix}${MARKER_SUFFIXES.DEFAULT}`;
    });

    // 检查是否显示箭头（默认显示）
    const showArrow = computed(() => {
      return props.edge.showArrow !== false;
    });

    /**
     * 判断是否需要 GPU 加速优化
     *
     * 仅在以下情况启用优化：
     * - 连接线被选中（可能频繁更新样式）
     * - 连接线被悬停（交互状态变化）
     * - 连接线有动画（持续变化）
     *
     * 这样可以减少不必要的内存占用，同时保证需要时的性能
     */
    const shouldOptimize = computed(() => {
      return props.selected || props.hovered || props.edge.animated === true;
    });

    /**
     * 计算容器样式（仅在需要时应用 GPU 加速）
     */
    const containerStyle = computed(() => {
      return getConditionalGpuAccelerationStyle(shouldOptimize.value, {
        includeBackfaceVisibility: false // SVG 中效果有限
      });
    });

    return () => {
      return (
        <g
          class={edgeClass.value}
          data-edge-id={props.edge.id}
          style={containerStyle.value}
        >
        {/* 连接线路径（使用共享的箭头标记） */}
        <path
          d={pathData.value}
          style={edgeStyle.value}
          marker-end={showArrow.value && markerEndId.value ? (markerEndId.value.startsWith('url(') ? markerEndId.value : `url(#${markerEndId.value})`) : undefined}
          onClick={handleClick}
          onDblclick={handleDoubleClick}
          onMouseenter={handleMouseEnter}
          onMouseleave={handleMouseLeave}
          onContextmenu={handleContextMenu}
        />

        {/* 连接线标签 */}
        {props.edge.label && (
          <text
            x={(startX.value + endX.value) / 2}
            y={(startY.value + endY.value) / 2}
            text-anchor={LABEL_STYLES.TEXT_ANCHOR}
            dominant-baseline={LABEL_STYLES.DOMINANT_BASELINE}
            style={{
              fontSize: LABEL_STYLES.FONT_SIZE,
              fill: EDGE_COLORS.LABEL,
              pointerEvents: 'none',
              ...props.edge.labelStyle
            }}
          >
            {props.edge.label}
          </text>
        )}

        {/* 自定义内容插槽 */}
        {slots.default && slots.default()}
        </g>
      );
    };
  }
});

