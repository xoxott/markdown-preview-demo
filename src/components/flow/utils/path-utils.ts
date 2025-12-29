/**
 * Flow 路径工具函数
 * 
 * 提供贝塞尔曲线计算、路径生成、路径优化等功能
 */

import type { FlowEdgePathParams } from '../types/flow-edge';

/**
 * 生成直线路径
 * 
 * @param params 路径参数
 * @returns SVG path 字符串
 */
export function generateStraightPath(params: FlowEdgePathParams): string {
  const { sourceX, sourceY, targetX, targetY } = params;
  return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
}

/**
 * 生成贝塞尔曲线路径
 * 
 * @param params 路径参数
 * @param controlOffset 控制点偏移比例（0-1）
 * @returns SVG path 字符串
 */
export function generateBezierPath(
  params: FlowEdgePathParams,
  controlOffset: number = 0.5
): string {
  const { sourceX, sourceY, targetX, targetY } = params;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

  // 计算控制点
  const controlX1 = sourceX + dx * controlOffset;
  const controlY1 = sourceY;
  const controlX2 = targetX - dx * controlOffset;
  const controlY2 = targetY;

  return `M ${sourceX},${sourceY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${targetX},${targetY}`;
}

/**
 * 生成阶梯路径
 * 
 * @param params 路径参数
 * @param radius 圆角半径
 * @returns SVG path 字符串
 */
export function generateStepPath(
  params: FlowEdgePathParams,
  radius: number = 10
): string {
  const { sourceX, sourceY, targetX, targetY } = params;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

  // 计算中间点
  const midX = sourceX + dx / 2;
  const midY = sourceY + dy / 2;

  // 使用较小的半径
  const r = Math.min(radius, Math.abs(dx) / 4, Math.abs(dy) / 4);

  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平优先
    const x1 = midX - r;
    const x2 = midX + r;
    return `M ${sourceX},${sourceY} L ${x1},${sourceY} A ${r},${r} 0 0,${dy > 0 ? 1 : 0} ${midX},${midY} L ${x2},${midY} A ${r},${r} 0 0,${dy > 0 ? 1 : 0} ${targetX},${targetY} L ${targetX},${targetY}`;
  } else {
    // 垂直优先
    const y1 = midY - r;
    const y2 = midY + r;
    return `M ${sourceX},${sourceY} L ${sourceX},${y1} A ${r},${r} 0 0,${dx > 0 ? 1 : 0} ${midX},${midY} L ${midX},${y2} A ${r},${r} 0 0,${dx > 0 ? 1 : 0} ${targetX},${targetY} L ${targetX},${targetY}`;
  }
}

/**
 * 生成平滑阶梯路径
 * 
 * @param params 路径参数
 * @param radius 圆角半径
 * @returns SVG path 字符串
 */
export function generateSmoothStepPath(
  params: FlowEdgePathParams,
  radius: number = 10
): string {
  const { sourceX, sourceY, targetX, targetY } = params;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;

  // 计算中间点
  const midX = sourceX + dx / 2;
  const midY = sourceY + dy / 2;

  // 使用较小的半径
  const r = Math.min(radius, Math.abs(dx) / 4, Math.abs(dy) / 4);

  if (Math.abs(dx) > Math.abs(dy)) {
    // 水平优先，使用平滑曲线
    const x1 = midX - r;
    const x2 = midX + r;
    return `M ${sourceX},${sourceY} L ${x1},${sourceY} Q ${midX},${sourceY} ${midX},${midY} L ${x2},${midY} Q ${midX},${targetY} ${targetX},${targetY} L ${targetX},${targetY}`;
  } else {
    // 垂直优先，使用平滑曲线
    const y1 = midY - r;
    const y2 = midY + r;
    return `M ${sourceX},${sourceY} L ${sourceX},${y1} Q ${sourceX},${midY} ${midX},${midY} L ${midX},${y2} Q ${targetX},${midY} ${targetX},${targetY} L ${targetX},${targetY}`;
  }
}

/**
 * 根据类型生成路径
 * 
 * @param params 路径参数
 * @param type 路径类型
 * @param options 选项
 * @returns SVG path 字符串
 */
export function generatePath(
  params: FlowEdgePathParams,
  type: 'straight' | 'bezier' | 'step' | 'smoothstep' = 'bezier',
  options?: {
    controlOffset?: number;
    radius?: number;
  }
): string {
  switch (type) {
    case 'straight':
      return generateStraightPath(params);
    case 'bezier':
      return generateBezierPath(params, options?.controlOffset);
    case 'step':
      return generateStepPath(params, options?.radius);
    case 'smoothstep':
      return generateSmoothStepPath(params, options?.radius);
    default:
      return generateBezierPath(params);
  }
}

/**
 * 计算路径长度（近似值）
 * 
 * @param pathData SVG path 字符串
 * @returns 路径长度（近似值）
 */
export function calculatePathLength(pathData: string): number {
  // 简单实现：解析路径命令并计算长度
  // 对于复杂路径，可以使用更精确的算法
  const commands = pathData.match(/[MLCQZ][^MLCQZ]*/g) || [];
  let length = 0;
  let lastX = 0;
  let lastY = 0;

  commands.forEach(cmd => {
    const type = cmd[0];
    const coords = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter(n => !isNaN(n));

    switch (type) {
      case 'M':
      case 'L':
        if (coords.length >= 2) {
          const dx = coords[0] - lastX;
          const dy = coords[1] - lastY;
          length += Math.sqrt(dx * dx + dy * dy);
          lastX = coords[0];
          lastY = coords[1];
        }
        break;
      case 'C':
        // 贝塞尔曲线：使用控制点和终点计算近似长度
        if (coords.length >= 6) {
          const p0 = { x: lastX, y: lastY };
          const p1 = { x: coords[0], y: coords[1] };
          const p2 = { x: coords[2], y: coords[3] };
          const p3 = { x: coords[4], y: coords[5] };
          // 简化的长度计算
          length +=
            Math.sqrt(
              Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2)
            ) +
            Math.sqrt(
              Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
            ) +
            Math.sqrt(
              Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2)
            );
          lastX = coords[4];
          lastY = coords[5];
        }
        break;
    }
  });

  return length;
}

/**
 * 获取路径上的点（根据比例）
 * 
 * @param pathData SVG path 字符串
 * @param t 比例（0-1）
 * @returns 点坐标
 */
export function getPointOnPath(
  pathData: string,
  t: number
): { x: number; y: number } | null {
  // 简化实现：对于直线路径，直接计算
  // 对于复杂路径，需要使用更精确的算法
  const match = pathData.match(/M\s*([\d.-]+),([\d.-]+)\s*L\s*([\d.-]+),([\d.-]+)/);
  if (match) {
    const x1 = parseFloat(match[1]);
    const y1 = parseFloat(match[2]);
    const x2 = parseFloat(match[3]);
    const y2 = parseFloat(match[4]);
    return {
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t
    };
  }
  return null;
}

/**
 * 简化路径（减少点数）
 * 
 * @param pathData SVG path 字符串
 * @param tolerance 容差
 * @returns 简化后的路径
 */
export function simplifyPath(pathData: string, tolerance: number = 1): string {
  // 简化实现：对于直线路径，直接返回
  // 对于复杂路径，可以使用 Douglas-Peucker 算法
  return pathData;
}

