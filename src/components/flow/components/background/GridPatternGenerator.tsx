/**
 * 网格图案生成器
 *
 * 提供可扩展的网格图案生成功能，支持不同类型的网格和自定义扩展
 */

import type { VNode } from 'vue';
import { GRID_CONSTANTS } from '../../constants/grid-constants';
import type { FlowGridType } from '../../types';

/**
 * 网格图案生成选项
 */
export interface GridPatternGeneratorOptions {
  /** 网格大小（已缩放） */
  patternSize: number;
  /** 网格颜色 */
  gridColor: string;
  /** 网格透明度 */
  gridOpacity: number;
  /** 视口缩放 */
  zoom: number;
  /** ID 前缀 */
  idPrefix: string;
  /** 图案 X 偏移 */
  patternX: number;
  /** 图案 Y 偏移 */
  patternY: number;
  /** 图案中心位置 */
  patternCenter: number;
}

/**
 * 网格图案生成结果
 */
export interface GridPatternResult {
  /** SVG pattern 元素 */
  pattern: VNode;
  /** SVG defs 元素（网格形状定义） */
  defs: VNode;
}

/**
 * 网格图案生成器接口
 */
export interface GridPatternGenerator {
  /**
   * 生成网格图案
   *
   * @param options 生成选项
   * @returns 网格图案生成结果
   */
  generate(options: GridPatternGeneratorOptions): GridPatternResult;
}

/**
 * 点状网格生成器
 */
class DotsGridGenerator implements GridPatternGenerator {
  generate(options: GridPatternGeneratorOptions): GridPatternResult {
    const { patternSize, gridColor, gridOpacity, zoom, idPrefix, patternX, patternY, patternCenter } = options;
    const dotRadius = GRID_CONSTANTS.DOT_RADIUS_MULTIPLIER * zoom;

    const pattern = (
      <pattern
        id={`${idPrefix}-dots`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits="userSpaceOnUse"
      >
        <use href={`#${idPrefix}-dot-shape`} x={patternCenter} y={patternCenter} />
      </pattern>
    );

    const defs = (
      <circle
        id={`${idPrefix}-dot-shape`}
        r={dotRadius}
        fill={gridColor}
        opacity={gridOpacity}
      />
    );

    return { pattern, defs };
  }
}

/**
 * 线条网格生成器
 */
class LinesGridGenerator implements GridPatternGenerator {
  generate(options: GridPatternGeneratorOptions): GridPatternResult {
    const { patternSize, gridColor, gridOpacity, zoom, idPrefix, patternX, patternY } = options;
    const strokeWidth = GRID_CONSTANTS.LINE_STROKE_WIDTH_MULTIPLIER * zoom;

    const pattern = (
      <pattern
        id={`${idPrefix}-lines`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits="userSpaceOnUse"
      >
        <use href={`#${idPrefix}-line-v`} height={patternSize} />
        <use href={`#${idPrefix}-line-h`} width={patternSize} />
      </pattern>
    );

    const defs = (
      <>
        <line
          id={`${idPrefix}-line-v`}
          x1={0}
          y1={0}
          x2={0}
          y2="100%"
          stroke={gridColor}
          stroke-width={strokeWidth}
          opacity={gridOpacity}
        />
        <line
          id={`${idPrefix}-line-h`}
          x1={0}
          y1={0}
          x2="100%"
          y2={0}
          stroke={gridColor}
          stroke-width={strokeWidth}
          opacity={gridOpacity}
        />
      </>
    );

    return { pattern, defs };
  }
}

/**
 * 十字网格生成器
 */
class CrossGridGenerator implements GridPatternGenerator {
  generate(options: GridPatternGeneratorOptions): GridPatternResult {
    const { patternSize, gridColor, gridOpacity, zoom, idPrefix, patternX, patternY, patternCenter } = options;
    const strokeWidth = GRID_CONSTANTS.LINE_STROKE_WIDTH_MULTIPLIER * zoom;

    const pattern = (
      <pattern
        id={`${idPrefix}-cross`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits="userSpaceOnUse"
      >
        <use href={`#${idPrefix}-cross-v`} x={patternCenter} height={patternSize} />
        <use href={`#${idPrefix}-cross-h`} y={patternCenter} width={patternSize} />
      </pattern>
    );

    const defs = (
      <>
        <line
          id={`${idPrefix}-cross-v`}
          x1={0}
          y1={0}
          x2={0}
          y2="100%"
          stroke={gridColor}
          stroke-width={strokeWidth}
          opacity={gridOpacity}
        />
        <line
          id={`${idPrefix}-cross-h`}
          x1={0}
          y1={0}
          x2="100%"
          y2={0}
          stroke={gridColor}
          stroke-width={strokeWidth}
          opacity={gridOpacity}
        />
      </>
    );

    return { pattern, defs };
  }
}

/**
 * 网格图案生成器注册表
 */
const gridGenerators = new Map<FlowGridType, GridPatternGenerator>([
  ['dots', new DotsGridGenerator()],
  ['lines', new LinesGridGenerator()],
  ['cross', new CrossGridGenerator()]
]);

/**
 * 注册网格图案生成器
 *
 * @param type 网格类型
 * @param generator 网格图案生成器
 *
 * @example
 * ```typescript
 * // 注册自定义网格类型
 * registerGridGenerator('hexagon', new HexagonGridGenerator());
 * ```
 */
export function registerGridGenerator(
  type: FlowGridType,
  generator: GridPatternGenerator
): void {
  gridGenerators.set(type, generator);
}

/**
 * 获取网格图案生成器
 *
 * @param type 网格类型
 * @returns 网格图案生成器，如果不存在则返回 null
 */
export function getGridGenerator(type?: FlowGridType): GridPatternGenerator | null {
  if (!type || type === 'none') {
    return null;
  }
  return gridGenerators.get(type) || null;
}

/**
 * 生成网格图案
 *
 * @param type 网格类型
 * @param options 生成选项
 * @returns 网格图案生成结果，如果类型不存在则返回 null
 *
 * @example
 * ```typescript
 * const result = generateGridPattern('dots', {
 *   patternSize: 20,
 *   gridColor: '#d1d5db',
 *   gridOpacity: 0.8,
 *   zoom: 1.5,
 *   idPrefix: 'flow-grid-default',
 *   patternX: 0,
 *   patternY: 0,
 *   patternCenter: 10
 * });
 * ```
 */
export function generateGridPattern(
  type: FlowGridType,
  options: GridPatternGeneratorOptions
): GridPatternResult | null {
  const generator = getGridGenerator(type);
  if (!generator) {
    return null;
  }
  return generator.generate(options);
}

