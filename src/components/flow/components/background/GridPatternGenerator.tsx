/**
 * 网格图案生成器
 *
 * 提供可扩展的网格图案生成功能，支持不同类型的网格和自定义扩展
 */

import type { VNode } from 'vue';
import {
  GRID_CONSTANTS,
  GRID_TYPES,
  GRID_ELEMENT_ID_SUFFIXES,
  SVG_PATTERN_UNITS
} from '../../constants/grid-constants';
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

    const defs = (
      <circle
        id={`${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.DOT_SHAPE}`}
        r={dotRadius}
        fill={gridColor}
        opacity={gridOpacity}
      />
    );
    const pattern = (
      <pattern
        id={`${idPrefix}-${GRID_TYPES.DOTS}`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits={SVG_PATTERN_UNITS.USER_SPACE_ON_USE}
        patternContentUnits={SVG_PATTERN_UNITS.USER_SPACE_ON_USE}
      >
        <use href={`#${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.DOT_SHAPE}`} x={patternCenter} y={patternCenter} />
      </pattern>
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

    const defs = (
      <>
        <line
          id={`${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.LINE_V}`}
          x1={0}
          y1={0}
          x2={0}
          y2={patternSize}
          stroke={gridColor}
          stroke-width={strokeWidth}
          opacity={gridOpacity}
        />
        <line
          id={`${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.LINE_H}`}
          x1={0}
          y1={0}
          x2={patternSize}
          y2={0}
          stroke={gridColor}
          stroke-width={strokeWidth}
          opacity={gridOpacity}
        />
      </>
    );

    const pattern = (
      <pattern
        id={`${idPrefix}-${GRID_TYPES.LINES}`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits={SVG_PATTERN_UNITS.USER_SPACE_ON_USE}
        patternContentUnits={SVG_PATTERN_UNITS.USER_SPACE_ON_USE}
      >
        <use href={`#${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.LINE_V}`} />
        <use href={`#${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.LINE_H}`} />
      </pattern>
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
    const crossLength = patternSize * GRID_CONSTANTS.CROSS_LENGTH_RATIO;
    const halfLength = crossLength / 2;

    const defs = (
      <>
        <line
          id={`${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.CROSS_V}`}
          x1={0}
          y1={-halfLength}
          x2={0}
          y2={halfLength}
          stroke={gridColor}
          stroke-width={strokeWidth}
          opacity={gridOpacity}
        />
        <line
          id={`${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.CROSS_H}`}
          x1={-halfLength}
          y1={0}
          x2={halfLength}
          y2={0}
          stroke={gridColor}
          stroke-width={strokeWidth}
          opacity={gridOpacity}
        />
      </>
    );

    const pattern = (
      <pattern
        id={`${idPrefix}-${GRID_TYPES.CROSS}`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits={SVG_PATTERN_UNITS.USER_SPACE_ON_USE}
        patternContentUnits={SVG_PATTERN_UNITS.USER_SPACE_ON_USE}
      >
        <use href={`#${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.CROSS_V}`} x={patternCenter} y={patternCenter} />
        <use href={`#${idPrefix}-${GRID_ELEMENT_ID_SUFFIXES.CROSS_H}`} x={patternCenter} y={patternCenter} />
      </pattern>
    );

    return { pattern, defs };
  }
}

/**
 * 网格图案生成器注册表
 */
const gridGenerators = new Map<FlowGridType, GridPatternGenerator>([
  [GRID_TYPES.DOTS, new DotsGridGenerator()],
  [GRID_TYPES.LINES, new LinesGridGenerator()],
  [GRID_TYPES.CROSS, new CrossGridGenerator()]
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
  if (!type || type === GRID_TYPES.NONE) {
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

