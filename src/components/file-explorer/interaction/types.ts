import type { DragOperation } from '../types/file-explorer';

export type { DragOperation };

/** 坐标点 */
export interface Point {
  x: number;
  y: number;
}

/** 拖拽预览项 */
export interface DragItem<T = unknown> {
  id: string;
  name: string;
  type: string;
  data?: T;
}
