/**
 * Flow 基础连接线组件
 *
 * 提供通用的连接线容器，支持路径渲染、箭头、样式、动画等
 */

import { defineComponent, computed, type PropType } from 'vue';
import type { FlowEdge } from '../../types/flow-edge';

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
  /** 自定义样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
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
    style: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    class: {
      type: String,
      default: ''
    }
  },
  emits: ['click', 'double-click', 'mouseenter', 'mouseleave', 'contextmenu'],
  setup(props, { emit, slots }) {
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

      // 基础线条宽度（随缩放调整，但限制最小和最大值）
      const baseStrokeWidth = 2.5;
      const minStrokeWidth = 1;
      const maxStrokeWidth = 5;
      const scaledStrokeWidth = Math.max(minStrokeWidth, Math.min(maxStrokeWidth, baseStrokeWidth * zoom));

      const baseStyle: Record<string, any> = {
        fill: 'none',
        strokeWidth: scaledStrokeWidth,
        stroke: '#cbd5e1',
        pointerEvents: 'stroke',
        cursor: 'pointer',
        ...props.edge.style,
        ...props.style
      };

      // 选中状态样式
      if (props.selected) {
        const baseSelectedWidth = 3.5;
        baseStyle.strokeWidth = Math.max(minStrokeWidth, Math.min(maxStrokeWidth, baseSelectedWidth * zoom));
        baseStyle.stroke = '#f5576c';
      }

      // 悬停状态样式
      if (props.hovered) {
        const baseHoverWidth = 3;
        baseStyle.strokeWidth = Math.max(minStrokeWidth, Math.min(maxStrokeWidth, baseHoverWidth * zoom));
        baseStyle.stroke = '#94a3b8';
      }

      // 动画
      if (props.edge.animated) {
        baseStyle.strokeDasharray = '5,5';
        baseStyle.animation = 'flow-edge-dash 1.5s linear infinite';
      }

      return baseStyle;
    });

    // 计算连接线类名
    const edgeClass = computed(() => {
      const classes = ['flow-edge', props.edge.class, props.class];

      if (props.selected) classes.push('flow-edge-selected');
      if (props.hovered) classes.push('flow-edge-hovered');
      if (props.edge.animated) classes.push('flow-edge-animated');

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

    // 计算箭头标记 ID（使用共享标记）
    const markerEndId = computed(() => {
      if (props.edge.showArrow === false) {
        return undefined;
      }
      // 根据状态选择对应的共享标记
      if (props.selected) {
        return 'flow-arrow-marker-selected';
      }
      if (props.hovered) {
        return 'flow-arrow-marker-hovered';
      }
      return 'flow-arrow-marker-default';
    });

    // 检查是否显示箭头（默认显示）
    const showArrow = computed(() => {
      return props.edge.showArrow !== false;
    });

    return () => {
      return (
        <g
          class={edgeClass.value}
          data-edge-id={props.edge.id}
          style={{
            // GPU 加速优化（在 g 元素上应用）
            willChange: 'transform',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        >
        {/* 连接线路径（使用共享的箭头标记） */}
        <path
          d={pathData.value}
          style={edgeStyle.value}
          marker-end={showArrow.value && markerEndId.value ? `url(#${markerEndId.value})` : undefined}
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
            text-anchor="middle"
            dominant-baseline="middle"
            style={{
              fontSize: '12px',
              fill: '#64748b',
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

