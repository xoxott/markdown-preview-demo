/**
 * 自定义网格图案示例
 *
 * 展示如何扩展新的网格类型
 */

import { registerGridGenerator } from '../components/background/GridPatternGenerator';
import type { GridPatternGenerator, GridPatternGeneratorOptions, GridPatternResult } from '../components/background/GridPatternGenerator';
import type { FlowGridType } from '../types';

/**
 * 示例 1: 六边形网格生成器
 *
 * 创建一个新的网格类型 'hexagon'
 */
class HexagonGridGenerator implements GridPatternGenerator {
  generate(options: GridPatternGeneratorOptions): GridPatternResult {
    const { patternSize, gridColor, gridOpacity, zoom, idPrefix, patternX, patternY } = options;
    const strokeWidth = 1 * zoom;
    const hexSize = patternSize * 0.4; // 六边形大小

    // 六边形路径（简化的六边形）
    const hexPath = `M ${hexSize},0 L ${hexSize * 1.5},${hexSize * 0.866} L ${hexSize},${hexSize * 1.732} L 0,${hexSize * 1.732} L ${-hexSize * 0.5},${hexSize * 0.866} Z`;

    const pattern = (
      <pattern
        id={`${idPrefix}-hexagon`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits="userSpaceOnUse"
      >
        <use href={`#${idPrefix}-hexagon-shape`} x={patternSize / 2} y={patternSize / 2} />
      </pattern>
    );

    const defs = (
      <path
        id={`${idPrefix}-hexagon-shape`}
        d={hexPath}
        fill="none"
        stroke={gridColor}
        stroke-width={strokeWidth}
        opacity={gridOpacity}
      />
    );

    return { pattern, defs };
  }
}

/**
 * 示例 2: 圆点网格生成器（大圆点）
 *
 * 创建一个新的网格类型 'large-dots'
 */
class LargeDotsGridGenerator implements GridPatternGenerator {
  generate(options: GridPatternGeneratorOptions): GridPatternResult {
    const { patternSize, gridColor, gridOpacity, zoom, idPrefix, patternX, patternY, patternCenter } = options;
    const dotRadius = 3 * zoom; // 更大的圆点

    const pattern = (
      <pattern
        id={`${idPrefix}-large-dots`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits="userSpaceOnUse"
      >
        <use href={`#${idPrefix}-large-dot-shape`} x={patternCenter} y={patternCenter} />
      </pattern>
    );

    const defs = (
      <circle
        id={`${idPrefix}-large-dot-shape`}
        r={dotRadius}
        fill={gridColor}
        opacity={gridOpacity}
      />
    );

    return { pattern, defs };
  }
}

/**
 * 示例 3: 虚线网格生成器
 *
 * 创建一个新的网格类型 'dashed-lines'
 */
class DashedLinesGridGenerator implements GridPatternGenerator {
  generate(options: GridPatternGeneratorOptions): GridPatternResult {
    const { patternSize, gridColor, gridOpacity, zoom, idPrefix, patternX, patternY } = options;
    const strokeWidth = 1 * zoom;
    const dashArray = `${4 * zoom},${4 * zoom}`;

    const pattern = (
      <pattern
        id={`${idPrefix}-dashed-lines`}
        x={patternX}
        y={patternY}
        width={patternSize}
        height={patternSize}
        patternUnits="userSpaceOnUse"
      >
        <use href={`#${idPrefix}-dashed-line-v`} height={patternSize} />
        <use href={`#${idPrefix}-dashed-line-h`} width={patternSize} />
      </pattern>
    );

    const defs = (
      <>
        <line
          id={`${idPrefix}-dashed-line-v`}
          x1={0}
          y1={0}
          x2={0}
          y2="100%"
          stroke={gridColor}
          stroke-width={strokeWidth}
          stroke-dasharray={dashArray}
          opacity={gridOpacity}
        />
        <line
          id={`${idPrefix}-dashed-line-h`}
          x1={0}
          y1={0}
          x2="100%"
          y2={0}
          stroke={gridColor}
          stroke-width={strokeWidth}
          stroke-dasharray={dashArray}
          opacity={gridOpacity}
        />
      </>
    );

    return { pattern, defs };
  }
}

/**
 * 注册自定义网格类型
 *
 * 注意：需要在应用启动时调用这些注册函数
 */
export function registerCustomGridPatterns(): void {
  // 注册六边形网格
  registerGridGenerator('hexagon' as FlowGridType, new HexagonGridGenerator());

  // 注册大圆点网格
  registerGridGenerator('large-dots' as FlowGridType, new LargeDotsGridGenerator());

  // 注册虚线网格
  registerGridGenerator('dashed-lines' as FlowGridType, new DashedLinesGridGenerator());
}

/**
 * 使用示例：
 *
 * ```typescript
 * // 1. 在应用启动时注册自定义网格类型
 * import { registerCustomGridPatterns } from './examples/custom-grid-pattern.example';
 * registerCustomGridPatterns();
 *
 * // 2. 在类型定义中扩展 FlowGridType
 * // 在 src/components/flow/types/flow-config.ts 中：
 * // export type FlowGridType = 'dots' | 'lines' | 'cross' | 'none' | 'hexagon' | 'large-dots' | 'dashed-lines';
 *
 * // 3. 在组件中使用
 * <FlowBackground
 *   gridType="hexagon"
 *   gridSize={20}
 *   gridColor="#d1d5db"
 *   viewport={viewport}
 * />
 * ```
 */
