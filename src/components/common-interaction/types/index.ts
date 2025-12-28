/**
 * 通用交互组件类型定义
 */

// ==================== 基础类型 ====================

/** 坐标点 */
export interface Point {
  x: number;
  y: number;
}

/** 矩形区域 */
export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 尺寸 */
export interface Size {
  width: number;
  height: number;
}

// ==================== 圈选相关 ====================

/** 圈选状态 */
export interface SelectionState {
  /** 是否正在圈选 */
  isSelecting: boolean;
  /** 起始点 */
  startPoint: Point | null;
  /** 当前点 */
  currentPoint: Point | null;
  /** 选区矩形 */
  rect: Rect | null;
}

/** 可选元素 */
export interface SelectableItem<T = any> {
  /** 元素 ID */
  id: string;
  /** 元素引用 */
  element: HTMLElement;
  /** 元素矩形 */
  rect: DOMRect;
  /** 自定义数据 */
  data?: T;
}

/** 圈选回调参数 */
export interface SelectionCallbackParams<T = any> {
  /** 选中的元素 ID 列表 */
  selectedIds: string[];
  /** 选中的元素列表 */
  selectedItems: SelectableItem<T>[];
  /** 选区矩形 */
  selectionRect: Rect;
}

// ==================== 拖拽相关 ====================

/** 拖拽状态 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 起始位置 */
  startPos: Point | null;
  /** 当前位置 */
  currentPos: Point | null;
  /** 偏移量 */
  offset: Point;
}

/** 拖拽项 */
export interface DragItem<T = any> {
  /** 项 ID */
  id: string;
  /** 项名称 */
  name: string;
  /** 项类型 */
  type: string;
  /** 自定义数据 */
  data?: T;
}

/** 拖拽操作类型 */
export type DragOperation = 'move' | 'copy' | 'link';

/** 拖拽预览配置 */
export interface DragPreviewConfig {
  /** 最大显示项数 */
  maxItems?: number;
  /** 偏移量 */
  offset?: Point;
  /** 是否显示操作图标 */
  showOperationIcon?: boolean;
  /** 是否显示数量徽章 */
  showCountBadge?: boolean;
}

// ==================== 拖放相关 ====================

/** 拖放目标状态 */
export interface DropTargetState {
  /** 是否悬停 */
  isOver: boolean;
  /** 是否可放置 */
  canDrop: boolean;
  /** 拖放操作类型 */
  operation: DragOperation | null;
}

/** 拖放验证器 */
export type DropValidator<T = any> = (
  item: DragItem<T>,
  dropZoneId: string
) => boolean;

/** 拖放回调参数 */
export interface DropCallbackParams<T = any> {
  /** 拖放区域 ID */
  dropZoneId: string;
  /** 拖拽项 */
  items: DragItem<T>[];
  /** 是否可放置 */
  canDrop: boolean;
  /** 原始事件 */
  event: DragEvent;
}

// ==================== 滚动相关 ====================

/** 自动滚动配置 */
export interface AutoScrollConfig {
  /** 是否启用 */
  enabled: boolean;
  /** 滚动速度 */
  speed: number;
  /** 触发边距 */
  edge: number;
  /** 滚动容器 */
  container: HTMLElement | null;
}

/** 滚动方向 */
export type ScrollDirection = 'up' | 'down' | 'left' | 'right' | null;

// ==================== 事件相关 ====================

/** 鼠标事件位置 */
export interface MouseEventPosition {
  /** 客户端坐标 */
  client: Point;
  /** 页面坐标 */
  page: Point;
  /** 屏幕坐标 */
  screen: Point;
  /** 相对于元素的坐标 */
  offset?: Point;
}

/** 交互事件类型 */
export type InteractionEventType =
  | 'selection-start'
  | 'selection-change'
  | 'selection-end'
  | 'drag-start'
  | 'drag-move'
  | 'drag-end'
  | 'drop'
  | 'drag-enter'
  | 'drag-leave'
  | 'drag-over';

/** 交互事件 */
export interface InteractionEvent<T = any> {
  /** 事件类型 */
  type: InteractionEventType;
  /** 原始事件 */
  originalEvent: MouseEvent | DragEvent;
  /** 事件数据 */
  data: T;
  /** 时间戳 */
  timestamp: number;
}

// ==================== 工具类型 ====================

/** 深度部分类型 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** 只读深度类型 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/** 必需属性 */
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** 可选属性 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

