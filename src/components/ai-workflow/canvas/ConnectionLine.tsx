import { defineComponent, computed, type PropType } from 'vue';
import type { ConnectionLineStyle } from '../types/canvas-settings';

/**
 * 连接线位置坐标接口
 */
interface ConnectionPosition {
  x: number;
  y: number;
}

/**
 * 草稿连接线数据接口
 */
interface ConnectionDraft {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * 连接线组件常量配置
 */
const CONNECTION_LINE_CONFIG = {
  /** 贝塞尔曲线控制点偏移比例 */
  BEZIER_CONTROL_OFFSET: 0.5,
  /** 默认描边颜色 */
  DEFAULT_STROKE_COLOR: '#cbd5e1',
  /** 默认描边宽度 */
  DEFAULT_STROKE_WIDTH: 2.5,
  /** 草稿状态描边宽度 */
  DRAFT_STROKE_WIDTH: 3,
  /** 选中状态描边宽度 */
  SELECTED_STROKE_WIDTH: 3.5,
  /** 点击区域扩展宽度（用于提高点击体验） */
  CLICK_AREA_WIDTH: 24,
  /** 发光效果扩展宽度 */
  GLOW_EXTRA_WIDTH: 4,
  /** 发光效果透明度 */
  GLOW_OPACITY: 0.3,
  /** 草稿状态渐变色起始 */
  DRAFT_GRADIENT_START: '#667eea',
  /** 草稿状态渐变色结束 */
  DRAFT_GRADIENT_END: '#764ba2',
  /** 选中状态渐变色起始 */
  SELECTED_GRADIENT_START: '#f093fb',
  /** 选中状态渐变色结束 */
  SELECTED_GRADIENT_END: '#f5576c',
  /** 箭头填充色（未选中） */
  ARROW_FILL_DEFAULT: '#94a3b8',
  /** 箭头填充色（选中） */
  ARROW_FILL_SELECTED: '#f5576c',
  /** 箭头长度（需要从终点缩短的距离） */
  ARROW_LENGTH: 10,
  /** 动画虚线间隔 */
  ANIMATION_DASH_ARRAY: '8, 6',
  /** 动画速度 */
  ANIMATION_DURATION: '1.5s',
  /** 过渡动画时长 */
  TRANSITION_DURATION: '0.2s'
} as const;

/**
 * ConnectionLine 组件
 *
 * 用于在 AI 工作流画布中渲染节点之间的连接线。
 * 支持两种模式：
 * 1. 已建立的连接线：使用 connection、sourcePos、targetPos 属性
 * 2. 正在绘制的草稿连接线：使用 draft 属性
 *
 * 功能特性：
 * - 使用贝塞尔曲线绘制平滑的连接线
 * - 支持选中状态高亮显示
 * - 支持动画效果（流动的虚线）
 * - 支持点击删除连接
 * - 自动显示箭头指示方向
 * - 发光效果增强视觉反馈
 *
 * @example
 * ```tsx
 * // 已建立的连接线
 * <ConnectionLine
 *   connection={connection}
 *   sourcePos={{ x: 100, y: 50 }}
 *   targetPos={{ x: 300, y: 150 }}
 *   selected={true}
 *   animated={false}
 *   onClick={(id) => handleDelete(id)}
 * />
 *
 * // 正在绘制的草稿连接线
 * <ConnectionLine
 *   draft={{ startX: 100, startY: 50, endX: 200, endY: 100 }}
 * />
 * ```
 */
export default defineComponent({
  name: 'ConnectionLine',
  props: {
    /**
     * 连接线数据对象
     * 包含连接的源节点、目标节点等信息
     * 仅在已建立的连接线模式下使用
     */
    connection: {
      type: Object as PropType<Api.Workflow.Connection>,
      required: false,
      default: undefined
    },
    /**
     * 草稿连接线数据
     * 用于正在绘制中的连接线，包含起始和结束坐标
     * 与 connection/sourcePos/targetPos 互斥
     */
    draft: {
      type: Object as PropType<ConnectionDraft>,
      required: false,
      default: undefined
    },
    /**
     * 源节点端口位置坐标
     * 连接线的起始点位置
     * 仅在已建立的连接线模式下使用，需与 targetPos 同时提供
     */
    sourcePos: {
      type: Object as PropType<ConnectionPosition>,
      required: false,
      default: undefined
    },
    /**
     * 目标节点端口位置坐标
     * 连接线的结束点位置
     * 仅在已建立的连接线模式下使用，需与 sourcePos 同时提供
     */
    targetPos: {
      type: Object as PropType<ConnectionPosition>,
      required: false,
      default: undefined
    },
    /**
     * 是否选中状态
     * 选中时会显示高亮颜色和更粗的线条
     * @default false
     */
    selected: {
      type: Boolean,
      default: false
    },
    /**
     * 是否启用动画效果
     * 启用后会显示流动的虚线动画
     * @default false
     */
    animated: {
      type: Boolean,
      default: false
    },
    /**
     * 点击连接线时的回调函数
     * 参数为连接线的 ID
     * 通常用于删除连接线
     */
    onClick: {
      type: Function as PropType<(id: string) => void>,
      required: false,
      default: undefined
    },
    /**
     * 连接线样式配置
     * 包含颜色、宽度、类型等样式信息
     */
    style: {
      type: Object as PropType<ConnectionLineStyle>,
      required: false,
      default: undefined
    }
  },
  setup(props) {
    /**
     * 计算贝塞尔曲线在 t=1 时的切线方向（用于箭头对齐）
     */
    const getBezierTangent = (x1: number, y1: number, cx1: number, cy1: number, cx2: number, cy2: number, x2: number, y2: number) => {
      // 三次贝塞尔曲线在 t=1 处的导数
      // B'(1) = 3(P3 - P2)
      const dx = 3 * (x2 - cx2);
      const dy = 3 * (y2 - cy2);
      const length = Math.sqrt(dx * dx + dy * dy);
      return { dx: dx / length, dy: dy / length };
    };

    /**
     * 计算 SVG 路径数据
     * 根据起始点和结束点生成贝塞尔曲线路径
     * 使用三次贝塞尔曲线（Cubic Bezier）实现平滑的连接效果
     */
    const pathData = computed(() => {
      let x1: number, y1: number, x2: number, y2: number;
      let isDraft = false;

      // 优先使用草稿数据（正在绘制中）
      if (props.draft) {
        x1 = props.draft.startX;
        y1 = props.draft.startY;
        x2 = props.draft.endX;
        y2 = props.draft.endY;
        isDraft = true;
      }
      // 使用已建立的连接线数据
      else if (props.sourcePos && props.targetPos) {
        x1 = props.sourcePos.x;
        y1 = props.sourcePos.y;
        x2 = props.targetPos.x;
        y2 = props.targetPos.y;
      }
      // 数据不足，返回空路径
      else {
        return '';
      }

      // 判断是否显示箭头
      const showArrow = !isDraft && (props.style?.showArrow !== false);

      // 获取线条类型
      const lineType = props.style?.type || 'bezier';

      // 根据线条类型生成路径
      switch (lineType) {
        case 'straight': {
          // 直线
          let endX = x2;
          let endY = y2;

          if (showArrow) {
            // 缩短线条以留出箭头空间
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
              endX = x2 - (dx / length) * CONNECTION_LINE_CONFIG.ARROW_LENGTH;
              endY = y2 - (dy / length) * CONNECTION_LINE_CONFIG.ARROW_LENGTH;
            }
          }

          return `M ${x1},${y1} L ${endX},${endY}`;
        }

        case 'step': {
          // 阶梯线（直角转折）
          const midX = (x1 + x2) / 2;
          let endX = x2;
          let endY = y2;

          if (showArrow) {
            endX = x2 - CONNECTION_LINE_CONFIG.ARROW_LENGTH;
          }

          return `M ${x1},${y1} H ${midX} V ${y2} H ${endX}`;
        }

        case 'smoothstep': {
          // 平滑阶梯线
          const midX = (x1 + x2) / 2;
          const radius = 10;
          let endX = x2;
          let endY = y2;

          if (showArrow) {
            endX = x2 - CONNECTION_LINE_CONFIG.ARROW_LENGTH;
          }

          return `M ${x1},${y1} H ${midX - radius} Q ${midX},${y1} ${midX},${y1 + radius} V ${y2 - radius} Q ${midX},${y2} ${midX + radius},${y2} H ${endX}`;
        }

        case 'bezier':
        default: {
          // 贝塞尔曲线（默认）
          const dx = x2 - x1;
          const minOffset = 50;
          const controlOffset = Math.max(Math.abs(dx) * CONNECTION_LINE_CONFIG.BEZIER_CONTROL_OFFSET, minOffset);

          const cx1 = x1 + controlOffset;
          const cy1 = y1;
          const cx2 = x2 - controlOffset;
          const cy2 = y2;

          let endX = x2;
          let endY = y2;

          if (showArrow) {
            const tangent = getBezierTangent(x1, y1, cx1, cy1, cx2, cy2, x2, y2);
            endX = x2 - tangent.dx * CONNECTION_LINE_CONFIG.ARROW_LENGTH;
            endY = y2 - tangent.dy * CONNECTION_LINE_CONFIG.ARROW_LENGTH;
          }

          return `M ${x1},${y1} C ${cx1},${cy1} ${cx2},${cy2} ${endX},${endY}`;
        }
      }
    });

    /**
     * 计算描边颜色
     * 根据状态和样式配置返回不同的颜色或渐变
     */
    const strokeColor = computed(() => {
      if (props.draft) {
        // 草稿线条：优先使用草稿颜色配置，其次使用默认渐变
        return props.style?.draftColor || 'url(#gradient-draft)';
      }
      if (props.selected) {
        return 'url(#gradient-selected)';
      }
      // 使用自定义样式颜色或默认颜色
      return props.style?.color || CONNECTION_LINE_CONFIG.DEFAULT_STROKE_COLOR;
    });

    /**
     * 计算描边宽度
     * 根据状态和样式配置返回不同的线条粗细
     */
    const strokeWidth = computed(() => {
      if (props.selected) {
        return CONNECTION_LINE_CONFIG.SELECTED_STROKE_WIDTH;
      }
      if (props.draft) {
        // 草稿线条：优先使用草稿宽度配置，其次使用默认宽度
        return props.style?.draftWidth || CONNECTION_LINE_CONFIG.DRAFT_STROKE_WIDTH;
      }
      // 使用自定义样式宽度或默认宽度
      return props.style?.width || CONNECTION_LINE_CONFIG.DEFAULT_STROKE_WIDTH;
    });

    /**
     * 判断是否启用动画
     * 根据 props 和样式配置
     */
    const isAnimated = computed(() => {
      return props.animated || props.style?.animated || false;
    });

    /**
     * 处理连接线点击事件
     * 阻止事件冒泡，并调用 onClick 回调
     */
    const handleClick = (e: MouseEvent) => {
      e.stopPropagation();
      if (props.connection?.id && props.onClick) {
        props.onClick(props.connection.id);
      }
    };

    return () => {
      // 如果没有有效的路径数据，不渲染任何内容
      if (!pathData.value) {
        return null;
      }

      // 正在绘制的连接线不拦截鼠标事件，让事件穿透到端口
      // 这样可以避免在绘制过程中误触其他元素
      const pointerEvents = props.draft ? 'none' : 'auto';

      // 生成唯一的箭头标记 ID，避免多个连接线实例之间的冲突
      const arrowMarkerId = `arrowhead-${props.connection?.id || `draft-${Date.now()}`}`;

      return (
        <g class="connection-line" onClick={handleClick} style={{ pointerEvents }}>
          {/* SVG 渐变和滤镜定义 */}
          <defs>
            {/* 草稿状态渐变（紫色系） */}
            <linearGradient id="gradient-draft" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: CONNECTION_LINE_CONFIG.DRAFT_GRADIENT_START, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: CONNECTION_LINE_CONFIG.DRAFT_GRADIENT_END, stopOpacity: 1 }} />
            </linearGradient>
            {/* 选中状态渐变（粉色系） */}
            <linearGradient id="gradient-selected" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: CONNECTION_LINE_CONFIG.SELECTED_GRADIENT_START, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: CONNECTION_LINE_CONFIG.SELECTED_GRADIENT_END, stopOpacity: 1 }} />
            </linearGradient>
            {/* 发光效果滤镜 */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* 箭头标记（仅在已建立的连接线上显示，且配置为显示箭头） */}
            {!props.draft && props.sourcePos && props.targetPos && (props.style?.showArrow !== false) && (
              <marker
                id={arrowMarkerId}
                markerWidth="12"
                markerHeight="12"
                refX="1"
                refY="6"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path
                  d="M2,2 L2,10 L10,6 z"
                  fill={
                    props.selected
                      ? CONNECTION_LINE_CONFIG.ARROW_FILL_SELECTED
                      : (props.style?.color || CONNECTION_LINE_CONFIG.ARROW_FILL_DEFAULT)
                  }
                  style={{ transition: `fill ${CONNECTION_LINE_CONFIG.TRANSITION_DURATION}` }}
                />
              </marker>
            )}
          </defs>

          {/* 透明的宽路径用于提高点击体验 */}
          {/* 连接线本身较细，通过增加透明点击区域让用户更容易点击 */}
          <path
            d={pathData.value}
            stroke="transparent"
            stroke-width={CONNECTION_LINE_CONFIG.CLICK_AREA_WIDTH}
            fill="none"
            style={{ cursor: props.draft ? 'default' : 'pointer' }}
          />

          {/* 发光效果背景层 */}
          {/* 仅在选中或草稿状态下显示，增强视觉反馈 */}
          {(props.selected || props.draft) && (
            <path
              d={pathData.value}
              stroke={props.draft ? CONNECTION_LINE_CONFIG.DRAFT_GRADIENT_START : CONNECTION_LINE_CONFIG.SELECTED_GRADIENT_END}
              stroke-width={strokeWidth.value + CONNECTION_LINE_CONFIG.GLOW_EXTRA_WIDTH}
              fill="none"
              stroke-linecap="round"
              opacity={CONNECTION_LINE_CONFIG.GLOW_OPACITY}
              filter="url(#glow)"
              style={{
                vectorEffect: 'non-scaling-stroke'
              }}
            />
          )}

          {/* 实际显示的连接线路径 */}
          <path
            d={pathData.value}
            stroke={strokeColor.value}
            stroke-width={strokeWidth.value}
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={isAnimated.value ? 'workflow-connection-animated' : ''}
            marker-end={!props.draft && props.sourcePos && props.targetPos && (props.style?.showArrow !== false) ? `url(#${arrowMarkerId})` : undefined}
            style={{
              filter: props.selected || props.draft ? 'drop-shadow(0 0 4px rgba(0,0,0,0.2))' : 'none',
              vectorEffect: 'non-scaling-stroke'
            }}
          />
        </g>
      );
    };
  }
});

