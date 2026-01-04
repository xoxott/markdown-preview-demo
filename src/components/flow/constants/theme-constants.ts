/**
 * 主题相关常量
 *
 * 提供主题相关的常量定义，这些值会通过 CSS 变量在运行时动态获取
 * 硬编码的值仅作为 TypeScript 类型检查和默认值使用
 */

/**
 * 主题常量
 *
 * 注意：实际颜色值应该从 CSS 变量中获取，这些值仅作为类型定义和默认值
 */
export const THEME_CONSTANTS = {
  /** 主题模式 */
  THEME_MODES: {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
  } as const,

  /** 默认主题 */
  DEFAULT_THEME: 'light' as const,

  /** CSS 变量前缀 */
  CSS_VAR_PREFIX: 'flow-'
} as const;

/**
 * CSS 变量名常量
 *
 * 用于在 TypeScript 代码中引用 CSS 变量
 */
export const CSS_VARIABLES = {
  // 节点相关
  NODE_BG: 'flow-node-bg',
  NODE_BORDER: 'flow-node-border',
  NODE_BORDER_SELECTED: 'flow-node-border-selected',
  NODE_BORDER_HOVER: 'flow-node-border-hover',
  NODE_TEXT: 'flow-node-text',
  NODE_TEXT_SECONDARY: 'flow-node-text-secondary',

  // 端口相关
  HANDLE_BG: 'flow-handle-bg',
  HANDLE_BORDER_SOURCE: 'flow-handle-border-source',
  HANDLE_BORDER_TARGET: 'flow-handle-border-target',
  HANDLE_BORDER_DEFAULT: 'flow-handle-border-default',

  // 连接线相关
  EDGE_DEFAULT: 'flow-edge-default',
  EDGE_SELECTED: 'flow-edge-selected',
  EDGE_HOVERED: 'flow-edge-hovered',
  EDGE_LABEL: 'flow-edge-label',

  // 网格背景相关
  GRID_COLOR: 'flow-grid-color',
  GRID_OPACITY: 'flow-grid-opacity',
  BACKGROUND_COLOR: 'flow-background-color',

  // 预览线相关
  PREVIEW_COLOR: 'flow-preview-color',

  // 阴影相关
  NODE_SHADOW_SELECTED_VALUE: 'flow-node-shadow-selected-value',
  NODE_SHADOW_HOVER_VALUE: 'flow-node-shadow-hover-value'
} as const;

