/**
 * 样式工具函数
 *
 * 提供通用的样式计算和优化功能
 */

import type { CSSProperties } from 'vue';

/**
 * GPU 加速样式选项
 */
export interface GpuAccelerationOptions {
  /** 是否启用 GPU 加速 */
  enabled?: boolean;
  /** 是否包含 backfaceVisibility（SVG 中效果有限） */
  includeBackfaceVisibility?: boolean;
  /** 是否包含 perspective */
  includePerspective?: boolean;
}

/**
 * 获取 GPU 加速样式
 *
 * 统一处理 GPU 加速相关的 CSS 属性，避免重复代码
 *
 * @param options 选项
 * @returns GPU 加速样式对象
 *
 * @example
 * ```typescript
 * const style = {
 *   ...baseStyle,
 *   ...getGpuAccelerationStyle({ enabled: true })
 * };
 * ```
 */
export function getGpuAccelerationStyle(
  options: GpuAccelerationOptions = {}
): CSSProperties {
  const {
    enabled = true,
    includeBackfaceVisibility = false,
    includePerspective = false
  } = options;

  if (!enabled) {
    return {};
  }

  const style: CSSProperties = {
    willChange: 'transform',
    transform: 'translateZ(0)'
  };

  // backfaceVisibility 在 SVG 中效果有限，默认不包含
  if (includeBackfaceVisibility) {
    style.backfaceVisibility = 'hidden';
  }

  // perspective 主要用于 3D 变换，默认不包含
  if (includePerspective) {
    style.perspective = '1000px';
  }

  return style;
}

/**
 * 条件性应用 GPU 加速样式
 *
 * 根据条件决定是否应用 GPU 加速
 *
 * @param shouldOptimize 是否应该优化
 * @param options 选项
 * @returns GPU 加速样式对象
 *
 * @example
 * ```typescript
 * const style = {
 *   ...baseStyle,
 *   ...getConditionalGpuAccelerationStyle(
 *     props.selected || props.hovered,
 *     { includeBackfaceVisibility: false }
 *   )
 * };
 * ```
 */
export function getConditionalGpuAccelerationStyle(
  shouldOptimize: boolean,
  options: GpuAccelerationOptions = {}
): CSSProperties {
  return getGpuAccelerationStyle({
    ...options,
    enabled: shouldOptimize
  });
}

