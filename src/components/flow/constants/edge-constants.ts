/**
 * 连接线相关常量
 *
 * 集中管理连接线渲染相关的所有常量，提高可维护性
 */

/**
 * 连接线颜色常量
 *
 * 注意：这些值仅作为默认值，实际颜色应该从 CSS 变量中获取
 * 使用 getCssVariable() 函数可以获取当前主题的颜色值
 * CSS 变量名：--flow-edge-default, --flow-edge-selected, --flow-edge-hovered, --flow-edge-label
 */
export const EDGE_COLORS = {
  /** 默认连接线颜色 */
  DEFAULT: '#cbd5e1',
  /** 选中连接线颜色 */
  SELECTED: '#f5576c',
  /** 悬停连接线颜色 */
  HOVERED: '#94a3b8',
  /** 标签文字颜色 */
  LABEL: '#64748b'
} as const;

/**
 * 箭头尺寸常量
 */
export const ARROW_SIZES = {
  /** 基础箭头大小 */
  BASE: 12,
  /** 最小箭头大小 */
  MIN: 6,
  /** 最大箭头大小 */
  MAX: 24,
  /** 箭头长度比例（相对于箭头大小） */
  LENGTH_RATIO: 8
} as const;

/**
 * 线条宽度常量
 */
export const STROKE_WIDTHS = {
  /** 基础线条宽度 */
  BASE: 2.5,
  /** 选中线条宽度 */
  SELECTED: 3.5,
  /** 悬停线条宽度 */
  HOVERED: 3,
  /** 最小线条宽度 */
  MIN: 1,
  /** 最大线条宽度 */
  MAX: 5
} as const;

/**
 * 贝塞尔曲线常量
 */
export const BEZIER_CONSTANTS = {
  /** 基础最小偏移量 */
  BASE_MIN_OFFSET: 50,
  /** 控制点偏移比例 */
  CONTROL_OFFSET_RATIO: 0.5,
  /** 切线计算倍数 */
  TANGENT_MULTIPLIER: 3
} as const;

/**
 * 箭头路径比例常量
 */
export const ARROW_PATH_RATIOS = {
  /** 参考点 X 比例 */
  REF_X: 2 / 12,
  /** 参考点 Y 比例 */
  REF_Y: 6 / 12,
  /** 路径大小比例 */
  PATH_SIZE: 8 / 12
} as const;

/**
 * 连接线类型常量
 */
export const EDGE_TYPES = {
  /** 直线类型 */
  STRAIGHT: 'straight',
  /** 贝塞尔曲线类型 */
  BEZIER: 'bezier'
} as const;

/**
 * CSS 类名常量
 */
export const EDGE_CLASS_NAMES = {
  /** 连接线容器类名 */
  CONTAINER: 'flow-edges',
  /** 连接线基础类名 */
  BASE: 'flow-edge',
  /** 选中状态类名 */
  SELECTED: 'flow-edge-selected',
  /** 悬停状态类名 */
  HOVERED: 'flow-edge-hovered',
  /** 动画状态类名 */
  ANIMATED: 'flow-edge-animated'
} as const;

/**
 * ID 前缀常量
 */
export const ID_PREFIXES = {
  /** 箭头标记前缀 */
  ARROW: 'flow-arrow-',
  /** 默认实例 ID */
  DEFAULT_INSTANCE: 'default'
} as const;

/**
 * 标记类型常量
 */
export const MARKER_TYPES = {
  /** 默认标记 */
  DEFAULT: 'default',
  /** 选中标记 */
  SELECTED: 'selected',
  /** 悬停标记 */
  HOVERED: 'hovered'
} as const;

/**
 * 标记路径后缀常量
 */
export const MARKER_PATH_SUFFIXES = {
  /** 默认路径 */
  DEFAULT: '-path-default',
  /** 选中路径 */
  SELECTED: '-path-selected',
  /** 悬停路径 */
  HOVERED: '-path-hovered'
} as const;

/**
 * 标记后缀常量
 */
export const MARKER_SUFFIXES = {
  /** 默认标记 */
  DEFAULT: '-marker-default',
  /** 选中标记 */
  SELECTED: '-marker-selected',
  /** 悬停标记 */
  HOVERED: '-marker-hovered'
} as const;

/**
 * 动画常量
 */
export const ANIMATION_CONSTANTS = {
  /** 虚线样式 */
  DASH_ARRAY: '5,5',
  /** 动画名称 */
  NAME: 'flow-edge-dash',
  /** 动画时长 */
  DURATION: '1.5s',
  /** 动画缓动函数 */
  TIMING_FUNCTION: 'linear',
  /** 动画重复次数 */
  ITERATION_COUNT: 'infinite'
} as const;

/**
 * 标签样式常量
 */
export const LABEL_STYLES = {
  /** 字体大小 */
  FONT_SIZE: '12px',
  /** 文字对齐方式 */
  TEXT_ANCHOR: 'middle',
  /** 基线对齐方式 */
  DOMINANT_BASELINE: 'middle'
} as const;

/**
 * Canvas 渲染常量
 */
export const CANVAS_CONSTANTS = {
  /** 线条端点样式 */
  LINE_CAP: 'round' as CanvasLineCap,
  /** 线条连接样式 */
  LINE_JOIN: 'round' as CanvasLineJoin
} as const;

