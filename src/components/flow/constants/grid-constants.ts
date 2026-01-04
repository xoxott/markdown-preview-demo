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
  MODULO_PRECISION: 0.01
} as const;

