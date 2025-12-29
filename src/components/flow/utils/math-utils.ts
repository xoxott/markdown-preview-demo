/**
 * Flow 数学工具函数
 * 
 * 提供坐标转换、距离计算、角度计算、碰撞检测等数学工具
 */

import type { FlowPosition, FlowSize } from '../types/flow-node';

/**
 * 坐标转换：屏幕坐标转画布坐标
 * 
 * @param screenX 屏幕 X 坐标
 * @param screenY 屏幕 Y 坐标
 * @param viewport 视口状态
 * @param canvasOffsetX 画布偏移 X（相对于视口）
 * @param canvasOffsetY 画布偏移 Y（相对于视口）
 * @returns 画布坐标
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: { x: number; y: number; zoom: number },
  canvasOffsetX: number = 0,
  canvasOffsetY: number = 0
): FlowPosition {
  const canvasX = (screenX - viewport.x - canvasOffsetX) / viewport.zoom;
  const canvasY = (screenY - viewport.y - canvasOffsetY) / viewport.zoom;
  return { x: canvasX, y: canvasY };
}

/**
 * 坐标转换：画布坐标转屏幕坐标
 * 
 * @param canvasX 画布 X 坐标
 * @param canvasY 画布 Y 坐标
 * @param viewport 视口状态
 * @param canvasOffsetX 画布偏移 X（相对于视口）
 * @param canvasOffsetY 画布偏移 Y（相对于视口）
 * @returns 屏幕坐标
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: { x: number; y: number; zoom: number },
  canvasOffsetX: number = 0,
  canvasOffsetY: number = 0
): FlowPosition {
  const screenX = canvasX * viewport.zoom + viewport.x + canvasOffsetX;
  const screenY = canvasY * viewport.zoom + viewport.y + canvasOffsetY;
  return { x: screenX, y: screenY };
}

/**
 * 计算两点之间的距离
 * 
 * @param p1 点1
 * @param p2 点2
 * @returns 距离
 */
export function distance(p1: FlowPosition, p2: FlowPosition): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 计算两点之间的角度（弧度）
 * 
 * @param p1 起点
 * @param p2 终点
 * @returns 角度（弧度，0 到 2π）
 */
export function angle(p1: FlowPosition, p2: FlowPosition): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.atan2(dy, dx);
}

/**
 * 计算两点之间的角度（度数）
 * 
 * @param p1 起点
 * @param p2 终点
 * @returns 角度（度数，-180 到 180）
 */
export function angleDegrees(p1: FlowPosition, p2: FlowPosition): number {
  return (angle(p1, p2) * 180) / Math.PI;
}

/**
 * 检查点是否在矩形内
 * 
 * @param point 点
 * @param rect 矩形（位置和尺寸）
 * @returns 是否在矩形内
 */
export function isPointInRect(
  point: FlowPosition,
  rect: FlowPosition & FlowSize
): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * 检查点是否在线段上（带容差）
 * 
 * @param point 点
 * @param lineStart 线段起点
 * @param lineEnd 线段终点
 * @param tolerance 容差（像素）
 * @returns 是否在线段上
 */
export function isPointOnLine(
  point: FlowPosition,
  lineStart: FlowPosition,
  lineEnd: FlowPosition,
  tolerance: number = 5
): boolean {
  const distToStart = distance(point, lineStart);
  const distToEnd = distance(point, lineEnd);
  const lineLength = distance(lineStart, lineEnd);

  // 如果点到两端的距离之和等于线段长度（在容差范围内），则在线段上
  return Math.abs(distToStart + distToEnd - lineLength) < tolerance;
}

/**
 * 检查点是否在圆内
 * 
 * @param point 点
 * @param center 圆心
 * @param radius 半径
 * @returns 是否在圆内
 */
export function isPointInCircle(
  point: FlowPosition,
  center: FlowPosition,
  radius: number
): boolean {
  return distance(point, center) <= radius;
}

/**
 * 检查两个矩形是否相交
 * 
 * @param rect1 矩形1
 * @param rect2 矩形2
 * @returns 是否相交
 */
export function isRectIntersect(
  rect1: FlowPosition & FlowSize,
  rect2: FlowPosition & FlowSize
): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * 计算两个矩形的交集
 * 
 * @param rect1 矩形1
 * @param rect2 矩形2
 * @returns 交集矩形，如果不相交则返回 null
 */
export function rectIntersection(
  rect1: FlowPosition & FlowSize,
  rect2: FlowPosition & FlowSize
): (FlowPosition & FlowSize) | null {
  const x1 = Math.max(rect1.x, rect2.x);
  const y1 = Math.max(rect1.y, rect2.y);
  const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

  if (x2 <= x1 || y2 <= y1) {
    return null; // 不相交
  }

  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  };
}

/**
 * 计算两个矩形的并集
 * 
 * @param rect1 矩形1
 * @param rect2 矩形2
 * @returns 并集矩形
 */
export function rectUnion(
  rect1: FlowPosition & FlowSize,
  rect2: FlowPosition & FlowSize
): FlowPosition & FlowSize {
  const x1 = Math.min(rect1.x, rect2.x);
  const y1 = Math.min(rect1.y, rect2.y);
  const x2 = Math.max(rect1.x + rect1.width, rect2.x + rect2.width);
  const y2 = Math.max(rect1.y + rect1.height, rect2.y + rect2.height);

  return {
    x: x1,
    y: y1,
    width: x2 - x1,
    height: y2 - y1
  };
}

/**
 * 计算多个节点的边界框
 * 
 * @param nodes 节点列表（需要包含 position 和 size）
 * @returns 边界框
 */
export function calculateBounds(
  nodes: Array<{ position: FlowPosition; size?: FlowSize }>
): FlowPosition & FlowSize {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach(node => {
    const nodeX = node.position.x;
    const nodeY = node.position.y;
    const nodeWidth = node.size?.width || 220;
    const nodeHeight = node.size?.height || 72;

    minX = Math.min(minX, nodeX);
    minY = Math.min(minY, nodeY);
    maxX = Math.max(maxX, nodeX + nodeWidth);
    maxY = Math.max(maxY, nodeY + nodeHeight);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * 限制值在范围内
 * 
 * @param value 值
 * @param min 最小值
 * @param max 最大值
 * @returns 限制后的值
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 * 
 * @param start 起始值
 * @param end 结束值
 * @param t 插值系数（0 到 1）
 * @returns 插值结果
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * 将角度标准化到 0-2π 范围
 * 
 * @param angle 角度（弧度）
 * @returns 标准化后的角度
 */
export function normalizeAngle(angle: number): number {
  while (angle < 0) {
    angle += 2 * Math.PI;
  }
  while (angle >= 2 * Math.PI) {
    angle -= 2 * Math.PI;
  }
  return angle;
}

/**
 * 将角度标准化到 -π 到 π 范围
 * 
 * @param angle 角度（弧度）
 * @returns 标准化后的角度
 */
export function normalizeAngleSigned(angle: number): number {
  while (angle > Math.PI) {
    angle -= 2 * Math.PI;
  }
  while (angle < -Math.PI) {
    angle += 2 * Math.PI;
  }
  return angle;
}

