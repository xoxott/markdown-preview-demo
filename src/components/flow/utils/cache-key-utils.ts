/**
 * 缓存键生成工具函数
 *
 * 提供统一的缓存键生成逻辑，避免重复代码
 */

import type { FlowPosition, FlowViewport } from '../types';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';

/**
 * 将坐标转换为整数（用于缓存键生成）
 *
 * @param value 坐标值
 * @returns 整数坐标
 */
export function floorCoordinate(value: number): number {
  return Math.floor(value);
}

/**
 * 将缩放值转换为整数键（用于缓存键生成）
 *
 * @param zoom 缩放值
 * @returns 整数缩放键
 */
export function roundZoomKey(zoom: number): number {
  return Math.round(zoom * PERFORMANCE_CONSTANTS.ZOOM_PRECISION_MULTIPLIER);
}

/**
 * 生成位置缓存键
 *
 * @param position 位置坐标
 * @returns 位置键字符串
 */
export function generatePositionKey(position: FlowPosition): string {
  return `${floorCoordinate(position.x)}-${floorCoordinate(position.y)}`;
}

/**
 * 生成视口缓存键
 *
 * @param viewport 视口状态
 * @returns 视口键字符串
 */
export function generateViewportKey(viewport: FlowViewport): string {
  return `${floorCoordinate(viewport.x)}-${floorCoordinate(viewport.y)}-${roundZoomKey(viewport.zoom)}`;
}

