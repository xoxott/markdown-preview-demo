/**
 * 连接线样式计算工具函数
 *
 * 提供统一的箭头大小、箭头标记配置、线条宽度等计算函数
 */

import {
  ARROW_SIZES,
  ARROW_PATH_RATIOS,
  STROKE_WIDTHS
} from '../constants/edge-constants';

/**
 * 计算箭头大小
 *
 * @param zoom 视口缩放比例
 * @returns 箭头大小（像素）
 */
export function calculateArrowSize(zoom: number): number {
  return Math.max(
    ARROW_SIZES.MIN,
    Math.min(ARROW_SIZES.MAX, ARROW_SIZES.BASE * zoom)
  );
}

/**
 * 箭头标记配置
 */
export interface ArrowMarkerConfig {
  /** 箭头大小 */
  arrowSize: number;
  /** 参考点 X */
  refX: number;
  /** 参考点 Y */
  refY: number;
  /** 路径大小 */
  pathSize: number;
  /** 箭头路径 */
  path: string;
}

/**
 * 计算箭头标记配置
 *
 * @param zoom 视口缩放比例
 * @returns 箭头标记配置
 */
export function calculateArrowMarkerConfig(zoom: number): ArrowMarkerConfig {
  const arrowSize = calculateArrowSize(zoom);
  const refX = ARROW_PATH_RATIOS.REF_X * arrowSize;
  const refY = ARROW_PATH_RATIOS.REF_Y * arrowSize;
  const pathSize = ARROW_PATH_RATIOS.PATH_SIZE * arrowSize;
  // 箭头路径：从 (refX, refX) 到 (refX, refX + pathSize) 再到 (refX + pathSize, refY)
  const path = `M${refX},${refX} L${refX},${refX + pathSize} L${refX + pathSize},${refY} z`;

  return {
    arrowSize,
    refX,
    refY,
    pathSize,
    path
  };
}

/**
 * 计算线条宽度
 *
 * @param baseWidth 基础线条宽度（如 STROKE_WIDTHS.BASE, STROKE_WIDTHS.SELECTED 等）
 * @param zoom 视口缩放比例
 * @returns 缩放后的线条宽度
 */
export function calculateStrokeWidth(baseWidth: number, zoom: number): number {
  return Math.max(
    STROKE_WIDTHS.MIN,
    Math.min(STROKE_WIDTHS.MAX, baseWidth * zoom)
  );
}

