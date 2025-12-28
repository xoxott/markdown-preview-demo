/**
 * AI Workflow 组件类型定义
 *
 * 提供组件内部使用的 UI 相关类型定义
 * 这些数据只在前端缓存，不会持久化到后端
 */

// ==================== 基础类型 ====================

/** 节点类型（与 API 保持一致） */
export type NodeType = 'start' | 'end' | 'ai' | 'http' | 'database' | 'condition' | 'transform' | 'file';

/** 连接线渲染策略 */
export type ConnectionRenderStrategy = 'bezier' | 'straight' | 'step' | 'smooth-step' | 'custom';

/** 节点布局策略 */
export type NodeLayoutStrategy = 'free' | 'dagre' | 'elk' | 'force' | 'custom';

// ==================== 前端缓存数据（不入库） ===================="

/** 位置坐标 */
export interface Position {
  x: number;
  y: number;
}

/** 尺寸 */
export interface Size {
  width: number;
  height: number;
}

/** 矩形区域 */
export interface Rect extends Position, Size {}

// ==================== 视口类型 ====================

/**
 * 视口配置
 *
 * 注意：视口状态会随工作流定义一起保存到后端
 * 这样可以保证多设备间的一致性
 */
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// ==================== 节点类型 ====================

/** 节点样式配置 */
export interface NodeStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  icon?: string;
  iconColor?: string;
  className?: string;
  customStyles?: Record<string, any>;
}

/** 节点 UI 状态 */
export interface NodeUIState {
  selected: boolean;
  locked: boolean;
  hovered: boolean;
  dragging: boolean;
  executing?: boolean;
  error?: boolean;
  success?: boolean;
}

/** 节点 UI 数据（前端缓存，不入库） */
export interface NodeUIData {
  /** 节点尺寸（前端计算） */
  size?: Size;
  /** 样式配置（用户自定义：颜色、图标、边框等） */
  style?: NodeStyle;
  /** UI 状态（前端交互状态：选中、悬停、拖拽等） */
  uiState?: NodeUIState;
  /** 布局策略（前端布局算法） */
  layoutStrategy?: NodeLayoutStrategy;
  /** z-index 层级（前端层级管理） */
  zIndex?: number;
}

/**
 * 完整的节点数据（业务数据 + UI 数据）
 *
 * 数据分类：
 * - business: 包含位置、配置等，需要持久化到后端
 * - ui: 样式、状态等前端临时数据，存储在 localStorage
 */
export interface WorkflowNodeWithUI {
  /** 业务数据（来自 API，需要持久化，包含 position） */
  business: Api.Workflow.WorkflowNode;
  /** UI 数据（前端缓存，不入库，不包含 position） */
  ui: NodeUIData;
}

// ==================== 端口类型 ====================

/** 端口位置信息 */
export interface PortPosition extends Position {
  portId: string;
  nodeId: string;
  type: 'input' | 'output';
}

// ==================== 连接线类型 ====================

/** 连接线样式配置 */
export interface ConnectionStyle {
  strokeColor?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  showArrow?: boolean;
  arrowStyle?: 'default' | 'filled' | 'hollow' | 'custom';
  animated?: boolean;
  animationSpeed?: number;
  label?: string;
  labelPosition?: 'start' | 'middle' | 'end';
  className?: string;
}

/** 连接线 UI 状态 */
export interface ConnectionUIState {
  selected: boolean;
  hovered: boolean;
}

/** 连接线 UI 数据（前端缓存，不入库） */
export interface ConnectionUIData {
  /** 渲染策略（用户选择的线条类型） */
  renderStrategy?: ConnectionRenderStrategy;
  /** 样式配置（用户自定义样式） */
  style?: ConnectionStyle;
  /** UI 状态（前端交互状态） */
  uiState?: ConnectionUIState;
}

/**
 * 完整的连接线数据（业务数据 + UI 数据）
 *
 * 使用场景：
 * - business: 从后端获取的连接关系，保存时也只保存这部分
 * - ui: 前端维护的样式和状态，存储在 localStorage/sessionStorage
 */
export interface WorkflowConnectionWithUI {
  /** 业务数据（来自 API，需要持久化） */
  business: Api.Workflow.Connection;
  /** UI 数据（前端缓存，不入库） */
  ui: ConnectionUIData;
}

// ==================== 画布类型（前端配置） ====================

/**
 * 网格配置（前端用户偏好设置）
 * 存储在 localStorage
 */
export interface GridConfig {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
  snap: boolean;
}

/**
 * 小地图配置（前端用户偏好设置）
 * 存储在 localStorage
 */
export interface MinimapConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  width: number;
  height: number;
}

/**
 * 主题配置（前端用户偏好设置）
 * 存储在 localStorage
 */
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  primaryColor?: string;
  backgroundColor?: string;
  customTheme?: Record<string, any>;
}

/**
 * 画布配置（前端缓存）
 * 包含所有前端 UI 相关的配置
 */
export interface CanvasConfig {
  viewport: Viewport;
  grid?: GridConfig;
  minimap?: MinimapConfig;
  theme?: ThemeConfig;
}

// ==================== 拖拽类型 ====================

/** 拖拽状态 */
export interface DragState {
  isDragging: boolean;
  startPosition: Position;
  currentPosition: Position;
  offset: Position;
}

/** 框选状态 */
export interface SelectionBoxState {
  isSelecting: boolean;
  startPosition: Position;
  endPosition: Position;
}

// ==================== 历史记录类型 ====================

/** 历史记录项 */
export interface HistoryItem<T = any> {
  timestamp: number;
  data: T;
  description?: string;
}

/** 历史记录栈 */
export interface HistoryStack<T = any> {
  past: HistoryItem<T>[];
  present: HistoryItem<T> | null;
  future: HistoryItem<T>[];
}

// ==================== 验证类型 ====================

/** 验证错误 */
export interface ValidationError {
  type: 'error' | 'warning';
  nodeId?: string;
  connectionId?: string;
  message: string;
  code?: string;
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ==================== 执行类型 ====================

/** 节点执行状态 */
export type NodeExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

/** 节点执行信息 */
export interface NodeExecutionInfo {
  nodeId: string;
  status: NodeExecutionStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

// ==================== 事件类型 ====================

/** 节点事件 */
export interface NodeEvent {
  type: 'click' | 'dblclick' | 'mouseenter' | 'mouseleave' | 'dragstart' | 'dragend';
  nodeId: string;
  event: MouseEvent | DragEvent;
}

/** 连接线事件 */
export interface ConnectionEvent {
  type: 'click' | 'mouseenter' | 'mouseleave';
  connectionId: string;
  event: MouseEvent;
}

/** 画布事件 */
export interface CanvasEvent {
  type: 'click' | 'dblclick' | 'mousedown' | 'mouseup' | 'mousemove' | 'wheel' | 'contextmenu';
  position: Position;
  event: MouseEvent | WheelEvent;
}

// ==================== 数据转换工具类型 ====================

/**
 * 本地存储的工作流 UI 数据结构
 *
 * 用于 localStorage 存储前端临时数据
 *
 * 注意：
 * - 节点位置（position）和视口（viewport）已在后端保存，不需要在这里存储
 * - 这里只存储纯 UI 相关的数据：样式、状态等
 */
export interface LocalWorkflowData {
  /** 工作流 ID */
  workflowId: string;
  /** 节点 UI 数据映射（样式、状态等） */
  nodesUI: Record<string, NodeUIData>;
  /** 连接线 UI 数据映射（样式、状态等） */
  connectionsUI: Record<string, ConnectionUIData>;
  /** 画布配置（网格、小地图、主题等用户偏好） */
  canvasConfig?: Partial<CanvasConfig>;
  /** 最后更新时间 */
  lastUpdated: number;
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

