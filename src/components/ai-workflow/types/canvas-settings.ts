/**
 * 画布设置类型定义
 */

/** 连接线类型 */
export type ConnectionLineType = 'bezier' | 'straight' | 'step' | 'smoothstep';

/** 连接线样式配置 */
export interface ConnectionLineStyle {
  type: ConnectionLineType;
  color: string;
  width: number;
  animated: boolean;
  showArrow: boolean;
  /** 草稿线条颜色（拖拽预览时的颜色，为空则使用默认渐变） */
  draftColor?: string;
  /** 草稿线条宽度（拖拽预览时的宽度，为空则使用默认宽度） */
  draftWidth?: number;
}

/** 网格类型 */
export type GridType = 'dots' | 'lines' | 'cross';

/** 背景配置 */
export interface CanvasBackground {
  showGrid: boolean;
  gridType: GridType;
  gridSize: number;
  gridColor: string;
  backgroundColor: string;
}

/** 画布设置 */
export interface CanvasSettings {
  connectionLine: ConnectionLineStyle;
  background: CanvasBackground;
}

/** 默认设置 */
export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  connectionLine: {
    type: 'bezier',
    color: '#94a3b8',
    width: 2,
    animated: false,
    showArrow: true,
    draftColor: undefined,  // 默认使用渐变
    draftWidth: undefined   // 默认使用 3px
  },
  background: {
    showGrid: true,
    gridType: 'dots',
    gridSize: 20,
    gridColor: '#e5e7eb',
    backgroundColor: '#ffffff'
  }
};

