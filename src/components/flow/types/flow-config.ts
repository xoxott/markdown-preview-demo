/**
 * Flow 核心配置类型定义
 *
 * 定义图形编辑器的完整配置接口，类似 VueFlow/ReactFlow
 * 支持工作流、流程图等多种场景
 */

import type { FlowNode, FlowNodeType } from './flow-node';
import type { FlowEdge, FlowEdgeType, FlowEdgePathGenerator } from './flow-edge';
import type { Component } from 'vue';

/**
 * 视口配置
 */
export interface FlowViewport {
  /** 水平偏移 */
  x: number;
  /** 垂直偏移 */
  y: number;
  /** 缩放比例 */
  zoom: number;
}

/**
 * 网格类型
 */
export type FlowGridType = 'dots' | 'lines' | 'cross' | 'none';

/**
 * 画布配置
 */
export interface FlowCanvasConfig {
  /** 最小缩放比例 */
  minZoom?: number;
  /** 最大缩放比例 */
  maxZoom?: number;
  /** 默认缩放比例 */
  defaultZoom?: number;
  /** 缩放步长 */
  zoomStep?: number;
  /** 是否启用网格 */
  showGrid?: boolean;
  /** 网格类型 */
  gridType?: FlowGridType;
  /** 网格大小（像素） */
  gridSize?: number;
  /** 网格颜色 */
  gridColor?: string;
  /** 网格透明度 */
  gridOpacity?: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 背景图片（可选） */
  backgroundImage?: string;
  /** 初始化时自动适应视图 */
  fitViewOnInit?: boolean;
  /** 窗口大小变化时自动适应视图 */
  fitViewOnResize?: boolean;
  /** 适应视图时的边距 */
  fitViewPadding?: number | { x: number; y: number };
  /** 是否启用平移 */
  panOnDrag?: boolean | number[]; // true/false 或允许平移的鼠标按键数组 [0=左键, 1=中键, 2=右键]
  /** 是否启用滚轮缩放 */
  zoomOnScroll?: boolean;
  /** 是否启用双指缩放 */
  zoomOnPinch?: boolean;
  /** 是否启用双击缩放 */
  zoomOnDoubleClick?: boolean;
}

/**
 * 节点配置
 */
export interface FlowNodeConfig {
  /** 默认宽度 */
  defaultWidth?: number;
  /** 默认高度 */
  defaultHeight?: number;
  /** 最小宽度 */
  minWidth?: number;
  /** 最小高度 */
  minHeight?: number;
  /** 边框圆角 */
  borderRadius?: number;
  /** 默认是否可拖拽 */
  draggable?: boolean;
  /** 默认是否可选择 */
  selectable?: boolean;
  /** 默认是否可连接 */
  connectable?: boolean;
  /** 默认是否可删除 */
  deletable?: boolean;
  /** 端口大小 */
  portSize?: number;
  /** 端口间距 */
  portSpacing?: number;
  /** 端口偏移 */
  portOffset?: number;
  /** 自定义节点类型注册表 */
  nodeTypes?: Record<string, FlowNodeType | Component>;
  /** 节点样式类名 */
  nodeClassName?: string;
}

/**
 * 连接线类型
 */
export type FlowEdgeTypeName = 'bezier' | 'straight' | 'step' | 'smoothstep' | 'default';

/**
 * 连接线配置
 */
export interface FlowEdgeConfig {
  /** 默认连接线类型 */
  defaultType?: FlowEdgeTypeName;
  /** 默认描边宽度 */
  defaultStrokeWidth?: number;
  /** 默认描边颜色 */
  defaultStrokeColor?: string;
  /** 选中时描边宽度 */
  selectedStrokeWidth?: number;
  /** 选中时描边颜色 */
  selectedStrokeColor?: string;
  /** 悬停时描边宽度 */
  hoverStrokeWidth?: number;
  /** 悬停时描边颜色 */
  hoverStrokeColor?: string;
  /** 是否显示箭头 */
  showArrow?: boolean;
  /** 箭头大小 */
  arrowSize?: number;
  /** 点击区域宽度（用于提高点击体验） */
  clickAreaWidth?: number;
  /** 贝塞尔曲线控制点偏移比例 */
  bezierControlOffset?: number;
  /** 步进线圆角半径 */
  stepRadius?: number;
  /** 动画持续时间（秒） */
  animationDuration?: number;
  /** 默认是否可选中 */
  selectable?: boolean;
  /** 默认是否可删除 */
  deletable?: boolean;
  /** 默认是否启用动画 */
  animated?: boolean;
  /** 自定义连接线类型注册表 */
  edgeTypes?: Record<string, FlowEdgeType | Component>;
  /** 自定义路径生成器 */
  edgePathGenerators?: Record<string, FlowEdgePathGenerator>;
  /** 连接线样式类名 */
  edgeClassName?: string;
}

/**
 * 交互配置
 */
export interface FlowInteractionConfig {
  /** 是否启用多选 */
  enableMultiSelection?: boolean;
  /** 多选快捷键 */
  multiSelectKey?: 'ctrl' | 'shift' | 'meta' | 'alt';
  /** 是否启用框选 */
  enableBoxSelection?: boolean;
  /** 框选快捷键 */
  boxSelectionKey?: 'shift' | 'alt' | 'ctrl';
  /** 是否启用右键菜单 */
  enableContextMenu?: boolean;
  /** 是否启用拖拽画布 */
  enableCanvasPan?: boolean;
  /** 是否启用滚轮缩放 */
  enableWheelZoom?: boolean;
  /** 是否启用点击连接 */
  connectOnClick?: boolean;
  /** 连接模式 */
  connectionMode?: 'loose' | 'strict'; // loose: 允许任意连接, strict: 需要验证
  /** 拖拽阈值（像素，超过此值才开始拖拽） */
  dragThreshold?: number;
  /** 双击延迟（毫秒） */
  doubleClickDelay?: number;
  /** 是否启用节点拖拽 */
  nodesDraggable?: boolean;
  /** 是否启用节点连接 */
  nodesConnectable?: boolean;
  /** 是否启用节点选择 */
  nodesSelectable?: boolean;
  /** 是否启用连接线选择 */
  edgesSelectable?: boolean;
  /** 是否启用连接线删除 */
  edgesDeletable?: boolean;
}

/**
 * 性能配置
 */
export interface FlowPerformanceConfig {
  /** 是否启用 RAF 节流 */
  enableRAFThrottle?: boolean;
  /** 是否启用虚拟滚动（只渲染视口内的节点） */
  enableVirtualScroll?: boolean;
  /** 虚拟滚动缓冲区（像素） */
  virtualScrollBuffer?: number;
  /** 是否启用视口裁剪（只渲染可见区域） */
  enableViewportCulling?: boolean;
  /** 是否启用 GPU 加速 */
  enableGPUAcceleration?: boolean;
  /** 是否启用连接线 Canvas 渲染（大量连接线时性能更好） */
  enableEdgeCanvasRendering?: boolean;
  /** Canvas 渲染阈值（连接线数量超过此值使用 Canvas） */
  edgeCanvasThreshold?: number;
  /** 历史记录最大数量 */
  maxHistorySize?: number;
  /** 是否启用配置缓存 */
  enableConfigCache?: boolean;
  /** 缓存大小限制 */
  cacheSizeLimit?: number;
}

/**
 * 主题配置
 */
export interface FlowThemeConfig {
  /** 主题模式 */
  mode?: 'light' | 'dark' | 'auto';
  /** 主色调 */
  primaryColor?: string;
  /** 成功色 */
  successColor?: string;
  /** 警告色 */
  warningColor?: string;
  /** 错误色 */
  errorColor?: string;
  /** 信息色 */
  infoColor?: string;
  /** 字体族 */
  fontFamily?: string;
  /** 字体大小 */
  fontSize?: number;
  /** 圆角大小 */
  borderRadius?: number;
  /** 阴影 */
  boxShadow?: string;
}

/**
 * 验证函数类型
 */
export type FlowValidationFunction = (
  connection: Partial<FlowEdge>
) => boolean | string | Promise<boolean | string>;

/**
 * 完整 Flow 配置
 *
 * 包含所有子配置和事件回调
 */
export interface FlowConfig {
  /** 画布配置 */
  canvas?: FlowCanvasConfig;
  /** 节点配置 */
  nodes?: FlowNodeConfig;
  /** 连接线配置 */
  edges?: FlowEdgeConfig;
  /** 交互配置 */
  interaction?: FlowInteractionConfig;
  /** 性能配置 */
  performance?: FlowPerformanceConfig;
  /** 主题配置 */
  theme?: FlowThemeConfig;
  /** 连接验证函数 */
  isValidConnection?: FlowValidationFunction;
  /** 初始视口 */
  initialViewport?: FlowViewport;
  /** 自定义工具栏组件 */
  toolbar?: Component | false;
  /** 自定义空状态组件 */
  emptyState?: Component | false;
  /** 自定义小地图组件 */
  minimap?: Component | false;
  /** 自定义背景组件 */
  background?: Component | false;
}

/**
 * 部分配置类型（用于更新配置）
 */
export type PartialFlowConfig = {
  [K in keyof FlowConfig]?: Partial<FlowConfig[K]>;
};

