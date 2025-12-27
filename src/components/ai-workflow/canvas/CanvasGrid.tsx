import { defineComponent, computed, type PropType } from 'vue';

/**
 * 网格组件常量配置
 */
const GRID_CONFIG = {
  /** 大网格相对于小网格的倍数 */
  LARGE_GRID_MULTIPLIER: 5,
  /** 小网格点的半径 */
  SMALL_DOT_RADIUS: 0.8,
  /** 小网格点的中心位置 */
  SMALL_DOT_CENTER: 1,
  /** 小网格点的透明度 */
  SMALL_GRID_OPACITY: 0.4,
  /** 大网格线的宽度 */
  LARGE_GRID_STROKE_WIDTH: 0.5,
  /** 大网格线的透明度 */
  LARGE_GRID_OPACITY: 0.3,
  /** 默认网格大小（像素） */
  DEFAULT_GRID_SIZE: 20,
  /** 默认网格颜色 */
  DEFAULT_GRID_COLOR: '#e5e7eb',
  /** 默认缩放比例 */
  DEFAULT_ZOOM: 1
} as const;

/**
 * CanvasGrid 组件
 *
 * 用于在 AI 工作流画布中显示背景网格，帮助用户对齐和定位节点。
 * 采用双层网格设计：
 * 1. 小网格点：细密的点状网格，提供精确的对齐参考
 * 2. 大网格线：粗网格线，提供主要的结构参考
 *
 * 功能特性：
 * - 支持缩放：网格大小随画布缩放自动调整
 * - 支持平移：网格位置随画布平移同步移动
 * - 双层视觉层次：小点 + 大线，清晰而不干扰
 * - 性能优化：使用 SVG pattern 实现，性能高效
 * - 不拦截事件：pointer-events: none，不影响交互
 *
 * @example
 * ```tsx
 * <CanvasGrid
 *   size={20}
 *   color="#e5e7eb"
 *   offsetX={100}
 *   offsetY={50}
 *   zoom={1.5}
 * />
 * ```
 */
export default defineComponent({
  name: 'CanvasGrid',
  props: {
    /**
     * 网格基础大小（像素）
     * 小网格的间距，会根据 zoom 自动缩放
     * @default 20
     */
    size: {
      type: Number as PropType<number>,
      default: GRID_CONFIG.DEFAULT_GRID_SIZE
    },
    /**
     * 网格颜色
     * 用于小网格点和大网格线的颜色
     * @default '#e5e7eb'
     */
    color: {
      type: String as PropType<string>,
      default: GRID_CONFIG.DEFAULT_GRID_COLOR
    },
    /**
     * 画布水平偏移量（像素）
     * 用于同步网格位置与画布平移
     * @default 0
     */
    offsetX: {
      type: Number as PropType<number>,
      default: 0
    },
    /**
     * 画布垂直偏移量（像素）
     * 用于同步网格位置与画布平移
     * @default 0
     */
    offsetY: {
      type: Number as PropType<number>,
      default: 0
    },
    /**
     * 画布缩放比例
     * 网格大小会随缩放比例自动调整，保持视觉一致性
     * @default 1
     */
    zoom: {
      type: Number as PropType<number>,
      default: GRID_CONFIG.DEFAULT_ZOOM
    }
  },
  setup(props) {
    /**
     * 计算小网格的实际大小
     * 基础大小乘以缩放比例，确保网格随画布缩放
     */
    const smallPatternSize = computed(() => props.size * props.zoom);

    /**
     * 计算大网格的实际大小
     * 小网格大小乘以倍数，形成粗网格参考线
     */
    const largePatternSize = computed(() => props.size * GRID_CONFIG.LARGE_GRID_MULTIPLIER * props.zoom);

    /**
     * 计算小网格模式的 X 偏移
     * 使用取模运算实现网格的连续滚动效果
     */
    const patternX = computed(() => props.offsetX % smallPatternSize.value);

    /**
     * 计算小网格模式的 Y 偏移
     * 使用取模运算实现网格的连续滚动效果
     */
    const patternY = computed(() => props.offsetY % smallPatternSize.value);

    /**
     * 计算大网格模式的 X 偏移
     * 使用取模运算实现网格的连续滚动效果
     */
    const largePatternX = computed(() => props.offsetX % largePatternSize.value);

    /**
     * 计算大网格模式的 Y 偏移
     * 使用取模运算实现网格的连续滚动效果
     */
    const largePatternY = computed(() => props.offsetY % largePatternSize.value);

    return () => (
      <svg
        class="canvas-grid"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none', // 不拦截鼠标事件，让交互事件穿透到画布
          zIndex: 0 // 确保网格在最底层
        }}
      >
        <defs>
          {/* 小网格点模式定义 */}
          {/* 使用 SVG pattern 实现高效的重复渲染 */}
          <pattern
            id="small-grid-pattern"
            x={patternX.value}
            y={patternY.value}
            width={smallPatternSize.value}
            height={smallPatternSize.value}
            patternUnits="userSpaceOnUse" // 使用用户空间单位，确保缩放正确
          >
            {/* 小网格点：圆形点，位于模式中心 */}
            <circle
              cx={GRID_CONFIG.SMALL_DOT_CENTER}
              cy={GRID_CONFIG.SMALL_DOT_CENTER}
              r={GRID_CONFIG.SMALL_DOT_RADIUS}
              fill={props.color}
              opacity={GRID_CONFIG.SMALL_GRID_OPACITY}
            />
          </pattern>

          {/* 大网格线模式定义 */}
          {/* 绘制 L 形路径，形成网格线的交叉效果 */}
          <pattern
            id="large-grid-pattern"
            x={largePatternX.value}
            y={largePatternY.value}
            width={largePatternSize.value}
            height={largePatternSize.value}
            patternUnits="userSpaceOnUse" // 使用用户空间单位，确保缩放正确
          >
            {/* 大网格线：L 形路径，绘制右下角的网格线 */}
            {/* 路径：从右下角 -> 左下角 -> 左上角 */}
            <path
              d={`M ${largePatternSize.value} 0 L 0 0 0 ${largePatternSize.value}`}
              fill="none"
              stroke={props.color}
              stroke-width={GRID_CONFIG.LARGE_GRID_STROKE_WIDTH}
              opacity={GRID_CONFIG.LARGE_GRID_OPACITY}
            />
          </pattern>
        </defs>

        {/* 应用小网格点模式到整个画布 */}
        <rect width="100%" height="100%" fill="url(#small-grid-pattern)" />

        {/* 应用大网格线模式到整个画布 */}
        <rect width="100%" height="100%" fill="url(#large-grid-pattern)" />
      </svg>
    );
  }
});

