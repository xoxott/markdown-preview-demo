/**
 * 连接线路径生成器
 *
 * 提供可扩展的连接线路径生成功能，支持不同类型的线条和箭头处理
 */

import {
  ARROW_SIZES,
  BEZIER_CONSTANTS,
  EDGE_TYPES
} from '../constants/edge-constants';
import type { EdgePositions } from '../hooks/useEdgePositions';
import type { FlowEdge, FlowViewport } from '../types';

/**
 * 路径生成选项
 */
export interface EdgePathGeneratorOptions {
  /** 是否显示箭头 */
  showArrow?: boolean;
  /** 视口状态（用于计算缩放） */
  viewport?: FlowViewport;
  /** 贝塞尔曲线控制点偏移比例（0-1之间，用于 bezier 类型） */
  bezierControlOffset?: number;
}

/**
 * 路径生成器接口
 */
export interface EdgePathGenerator {
  /**
   * 生成路径
   *
   * @param edge 连接线数据
   * @param positions 连接线位置信息
   * @param options 生成选项
   * @returns SVG path 字符串
   */
  generate(edge: FlowEdge, positions: EdgePositions, options: EdgePathGeneratorOptions): string;
}

/**
 * 计算箭头长度
 *
 * @param viewport 视口状态
 * @returns 箭头长度（像素）
 */
function calculateArrowLength(viewport?: FlowViewport): number {
  const zoom = viewport?.zoom || 1;
  const arrowSize = Math.max(
    ARROW_SIZES.MIN,
    Math.min(ARROW_SIZES.MAX, ARROW_SIZES.BASE * zoom)
  );
  return (arrowSize / ARROW_SIZES.BASE) * ARROW_SIZES.LENGTH_RATIO;
}

/**
 * 缩短路径终点以适应箭头
 *
 * @param startX 起点 X
 * @param startY 起点 Y
 * @param endX 终点 X
 * @param endY 终点 Y
 * @param arrowLength 箭头长度
 * @returns 缩短后的终点坐标
 */
function shortenPathForArrow(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  arrowLength: number
): { x: number; y: number } {
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length > 0) {
    return {
      x: endX - (dx / length) * arrowLength,
      y: endY - (dy / length) * arrowLength
    };
  }

  return { x: endX, y: endY };
}

/**
 * 计算贝塞尔曲线终点切线方向
 *
 * @param endX 终点 X
 * @param endY 终点 Y
 * @param controlX2 第二个控制点 X
 * @param controlY2 第二个控制点 Y
 * @returns 切线方向向量
 */
function calculateBezierTangent(
  endX: number,
  endY: number,
  controlX2: number,
  controlY2: number
): { dx: number; dy: number; length: number } {
  const dx = BEZIER_CONSTANTS.TANGENT_MULTIPLIER * (endX - controlX2);
  const dy = BEZIER_CONSTANTS.TANGENT_MULTIPLIER * (endY - controlY2);
  const length = Math.sqrt(dx * dx + dy * dy);
  return { dx, dy, length };
}

/**
 * 直线路径生成器
 */
class StraightPathGenerator implements EdgePathGenerator {
  generate(edge: FlowEdge, positions: EdgePositions, options: EdgePathGeneratorOptions): string {
    const startX = positions.sourceHandleX ?? positions.sourceX;
    const startY = positions.sourceHandleY ?? positions.sourceY;
    let endX = positions.targetHandleX ?? positions.targetX;
    let endY = positions.targetHandleY ?? positions.targetY;

    // 如果显示箭头，缩短路径终点
    if (options.showArrow !== false) {
      const arrowLength = calculateArrowLength(options.viewport);
      const shortened = shortenPathForArrow(startX, startY, endX, endY, arrowLength);
      endX = shortened.x;
      endY = shortened.y;
    }

    return `M ${startX},${startY} L ${endX},${endY}`;
  }
}

/**
 * 贝塞尔曲线路径生成器
 */
class BezierPathGenerator implements EdgePathGenerator {
  generate(edge: FlowEdge, positions: EdgePositions, options: EdgePathGeneratorOptions): string {
    const startX = positions.sourceHandleX ?? positions.sourceX;
    const startY = positions.sourceHandleY ?? positions.sourceY;
    const originalEndX = positions.targetHandleX ?? positions.targetX;
    const originalEndY = positions.targetHandleY ?? positions.targetY;

    // 计算控制点
    const zoom = options.viewport?.zoom || 1;
    const dx = originalEndX - startX;
    const minOffset = BEZIER_CONSTANTS.BASE_MIN_OFFSET * zoom;

    // 获取贝塞尔控制点偏移比例：优先使用边自身配置，然后使用全局配置，最后使用默认值
    const offsetRatio = edge.bezierControlOffset ?? options.bezierControlOffset ?? BEZIER_CONSTANTS.CONTROL_OFFSET_RATIO;

    // 根据偏移比例计算控制点偏移
    const controlOffset = Math.max(
      Math.abs(dx) * offsetRatio,
      minOffset
    );

    const controlX1 = startX + controlOffset;
    const controlY1 = startY;
    const controlX2 = originalEndX - controlOffset;
    const controlY2 = originalEndY;

    let endX = originalEndX;
    let endY = originalEndY;

    // 如果显示箭头，计算终点切线方向并缩短路径
    if (options.showArrow !== false) {
      const arrowLength = calculateArrowLength(options.viewport);
      const tangent = calculateBezierTangent(originalEndX, originalEndY, controlX2, controlY2);

      if (tangent.length > 0) {
        endX = originalEndX - (tangent.dx / tangent.length) * arrowLength;
        endY = originalEndY - (tangent.dy / tangent.length) * arrowLength;
      }
    }

    return `M ${startX},${startY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
  }
}

/**
 * 路径生成器注册表
 */
const pathGenerators = new Map<string, EdgePathGenerator>([
  [EDGE_TYPES.STRAIGHT, new StraightPathGenerator()],
  [EDGE_TYPES.BEZIER, new BezierPathGenerator()]
]);

/**
 * 注册路径生成器
 *
 * @param type 线条类型
 * @param generator 路径生成器
 */
export function registerPathGenerator(type: string, generator: EdgePathGenerator): void {
  pathGenerators.set(type, generator);
}

/**
 * 获取路径生成器
 *
 * @param type 线条类型
 * @returns 路径生成器，如果不存在则返回默认的贝塞尔曲线生成器
 */
export function getPathGenerator(type?: string): EdgePathGenerator {
  if (!type) {
    return pathGenerators.get(EDGE_TYPES.BEZIER)!;
  }
  return pathGenerators.get(type) || pathGenerators.get(EDGE_TYPES.BEZIER)!;
}

/**
 * 生成连接线路径
 *
 * @param edge 连接线数据
 * @param positions 连接线位置信息
 * @param options 生成选项
 * @returns SVG path 字符串
 *
 * @example
 * ```typescript
 * const path = generateEdgePath(edge, positions, {
 *   showArrow: true,
 *   viewport: { zoom: 1.5 }
 * });
 * ```
 */
export function generateEdgePath(
  edge: FlowEdge,
  positions: EdgePositions,
  options: EdgePathGeneratorOptions = {}
): string {
  const generator = getPathGenerator(edge.type);
  return generator.generate(edge, positions, {
    showArrow: edge.showArrow !== false,
    ...options
  });
}

