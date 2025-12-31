/**
 * Flow 交互相关类型定义
 *
 * 用于 core/interaction 和 hooks 之间的共享类型
 */

/**
 * 拖拽坐标转换结果
 */
export interface DragTransformResult {
  /** 目标坐标 X（转换后的坐标） */
  x: number;
  /** 目标坐标 Y（转换后的坐标） */
  y: number;
  /** 屏幕坐标偏移量 X（原始偏移） */
  deltaX: number;
  /** 屏幕坐标偏移量 Y（原始偏移） */
  deltaY: number;
}

/**
 * 坐标转换函数
 *
 * 将屏幕坐标转换为目标坐标系统（如画布坐标、节点坐标等）
 */
export type CoordinateTransform = (
  screenX: number,
  screenY: number,
  startScreenX: number,
  startScreenY: number,
  startTargetX: number,
  startTargetY: number
) => DragTransformResult;

