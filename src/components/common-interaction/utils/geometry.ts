/**
 * 几何计算工具函数
 */

import type { Point, Rect } from '../types';

/**
 * 计算两点之间的距离
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 根据起点和终点创建矩形
 */
export function createRectFromPoints(start: Point, end: Point): Rect {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return { left, top, width, height };
}

/**
 * 判断两个矩形是否相交
 */
export function isRectIntersect(rect1: Rect, rect2: Rect | DOMRect): boolean {
  const r1Right = rect1.left + rect1.width;
  const r1Bottom = rect1.top + rect1.height;
  const r2Right = rect2.left + rect2.width;
  const r2Bottom = rect2.top + rect2.height;

  return !(
    r1Right < rect2.left ||
    rect1.left > r2Right ||
    r1Bottom < rect2.top ||
    rect1.top > r2Bottom
  );
}

/**
 * 判断点是否在矩形内
 */
export function isPointInRect(point: Point, rect: Rect | DOMRect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

/**
 * 计算矩形的中心点
 */
export function getRectCenter(rect: Rect | DOMRect): Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

/**
 * 扩展矩形（增加边距）
 */
export function expandRect(rect: Rect, margin: number): Rect {
  return {
    left: rect.left - margin,
    top: rect.top - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2
  };
}

/**
 * 限制点在矩形范围内
 */
export function clampPointToRect(point: Point, rect: Rect | DOMRect): Point {
  return {
    x: Math.max(rect.left, Math.min(point.x, rect.left + rect.width)),
    y: Math.max(rect.top, Math.min(point.y, rect.top + rect.height))
  };
}

/**
 * 计算两个矩形的交集
 */
export function getIntersectionRect(rect1: Rect, rect2: Rect): Rect | null {
  const left = Math.max(rect1.left, rect2.left);
  const top = Math.max(rect1.top, rect2.top);
  const right = Math.min(rect1.left + rect1.width, rect2.left + rect2.width);
  const bottom = Math.min(rect1.top + rect1.height, rect2.top + rect2.height);

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

/**
 * 判断矩形是否完全包含另一个矩形
 */
export function isRectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.left >= outer.left &&
    inner.top >= outer.top &&
    inner.left + inner.width <= outer.left + outer.width &&
    inner.top + inner.height <= outer.top + outer.height
  );
}

