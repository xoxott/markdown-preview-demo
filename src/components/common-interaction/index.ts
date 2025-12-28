/**
 * 通用交互组件
 *
 * 提供可复用的 UI 交互组件和工具函数
 */

// 导出类型
export * from './types';

// 导出工具函数
export * from './utils/geometry';
export * from './utils/scroll';

// 导出组件
export { SelectionRect, default as SelectionRectComponent } from './SelectionRect';
export { DragPreview, default as DragPreviewComponent } from './DragPreview';
export { DropZone, default as DropZoneComponent } from './DropZone';

