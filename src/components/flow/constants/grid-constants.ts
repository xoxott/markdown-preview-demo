/**
 * 网格背景相关常量
 *
 * 统一管理网格背景渲染相关的所有常量
 */

/**
 * 网格背景常量
 */
export const GRID_CONSTANTS = {
  /** 默认网格大小（像素） */
  DEFAULT_GRID_SIZE: 20,
  /** 默认网格颜色 */
  DEFAULT_GRID_COLOR: '#d1d5db',
  /** 默认网格透明度 */
  DEFAULT_GRID_OPACITY: 0.8,
  /** 默认背景颜色 */
  DEFAULT_BACKGROUND_COLOR: '#ffffff',
  /** 点状网格圆的半径倍数（相对于缩放） */
  DOT_RADIUS_MULTIPLIER: 1.5,
  /** 线条网格的线宽倍数（相对于缩放） */
  LINE_STROKE_WIDTH_MULTIPLIER: 1,
  /** 网格图案中心位置比例（0.5 = 居中） */
  PATTERN_CENTER_RATIO: 0.5,
  /** 网格 Z-index */
  GRID_Z_INDEX: 0,
  /** GPU 加速优化阈值（缩放超过此值启用优化） */
  GPU_ACCELERATION_ZOOM_THRESHOLD: 1,
  /** 取模运算精度（用于优化取模运算性能） */
  MODULO_PRECISION: 0.01,
  /** 十字网格长度比例（相对于 patternSize） */
  CROSS_LENGTH_RATIO: 0.35
} as const;

/**
 * 网格类型常量
 */
export const GRID_TYPES = {
  /** 点状网格 */
  DOTS: 'dots',
  /** 线条网格 */
  LINES: 'lines',
  /** 十字网格 */
  CROSS: 'cross',
  /** 无网格 */
  NONE: 'none'
} as const;

/**
 * SVG 元素 ID 后缀常量
 */
export const GRID_ELEMENT_ID_SUFFIXES = {
  /** 点状网格圆形元素 ID 后缀 */
  DOT_SHAPE: 'dot-shape',
  /** 线条网格垂直线元素 ID 后缀 */
  LINE_V: 'line-v',
  /** 线条网格水平线元素 ID 后缀 */
  LINE_H: 'line-h',
  /** 十字网格垂直线元素 ID 后缀 */
  CROSS_V: 'cross-v',
  /** 十字网格水平线元素 ID 后缀 */
  CROSS_H: 'cross-h'
} as const;

/**
 * SVG Pattern 单位常量
 */
export const SVG_PATTERN_UNITS = {
  /** 使用用户空间单位 */
  USER_SPACE_ON_USE: 'userSpaceOnUse'
} as const;

