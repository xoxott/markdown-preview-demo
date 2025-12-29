/**
 * Flow 运行时类型验证 Schema
 * 
 * 使用 Zod 进行运行时类型验证
 */

import { z } from 'zod';

/**
 * 位置 Schema
 */
export const FlowPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

/**
 * 尺寸 Schema
 */
export const FlowSizeSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

/**
 * 端口/句柄 Schema
 */
export const FlowHandleSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['source', 'target']),
  position: z.enum(['top', 'bottom', 'left', 'right']),
  style: z.record(z.string(), z.any()).optional(),
  hidden: z.boolean().optional(),
  connectable: z.boolean().optional(),
});

/**
 * 节点 Schema
 */
export const FlowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  position: FlowPositionSchema,
  data: z.any(),
  size: FlowSizeSchema.optional(),
  style: z.record(z.string(), z.any()).optional(),
  class: z.string().optional(),
  selected: z.boolean().optional(),
  draggable: z.boolean().optional(),
  connectable: z.boolean().optional(),
  selectable: z.boolean().optional(),
  deletable: z.boolean().optional(),
  locked: z.boolean().optional(),
  handles: z.array(FlowHandleSchema).optional(),
});

/**
 * 连接线 Schema
 */
export const FlowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  type: z.string().optional(),
  style: z.record(z.string(), z.any()).optional(),
  class: z.string().optional(),
  selected: z.boolean().optional(),
  animated: z.boolean().optional(),
  showArrow: z.boolean().optional(),
  label: z.string().optional(),
  data: z.any().optional(),
});

/**
 * 视口 Schema
 */
export const FlowViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
});

/**
 * 画布配置 Schema
 */
export const FlowCanvasConfigSchema = z.object({
  minZoom: z.number().min(0.01).max(1).optional(),
  maxZoom: z.number().min(1).max(10).optional(),
  defaultZoom: z.number().positive().optional(),
  zoomStep: z.number().positive().optional(),
  showGrid: z.boolean().optional(),
  gridType: z.enum(['dots', 'lines', 'none']).optional(),
  gridSize: z.number().positive().optional(),
  gridColor: z.string().optional(),
  gridOpacity: z.number().min(0).max(1).optional(),
  backgroundColor: z.string().optional(),
  fitViewOnInit: z.boolean().optional(),
  fitViewOnResize: z.boolean().optional(),
  fitViewPadding: z.number().min(0).max(1).optional(),
  panOnDrag: z.union([z.boolean(), z.array(z.number())]).optional(),
  zoomOnScroll: z.boolean().optional(),
  zoomOnPinch: z.boolean().optional(),
  zoomOnDoubleClick: z.boolean().optional(),
});

/**
 * 节点配置 Schema
 */
export const FlowNodeConfigSchema = z.object({
  defaultWidth: z.number().positive().optional(),
  defaultHeight: z.number().positive().optional(),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  borderRadius: z.number().min(0).optional(),
  draggable: z.boolean().optional(),
  selectable: z.boolean().optional(),
  connectable: z.boolean().optional(),
  deletable: z.boolean().optional(),
  portSize: z.number().positive().optional(),
  portSpacing: z.number().min(0).optional(),
  portOffset: z.number().min(0).optional(),
  nodeTypes: z.record(z.string(), z.any()).optional(),
});

/**
 * 连接线配置 Schema
 */
export const FlowEdgeConfigSchema = z.object({
  defaultType: z.enum(['bezier', 'straight', 'step', 'smoothstep', 'smart']).optional(),
  defaultStrokeWidth: z.number().positive().optional(),
  defaultStrokeColor: z.string().optional(),
  selectedStrokeWidth: z.number().positive().optional(),
  selectedStrokeColor: z.string().optional(),
  hoverStrokeWidth: z.number().positive().optional(),
  hoverStrokeColor: z.string().optional(),
  showArrow: z.boolean().optional(),
  arrowSize: z.number().positive().optional(),
  clickAreaWidth: z.number().positive().optional(),
  bezierControlOffset: z.number().min(0).max(1).optional(),
  stepRadius: z.number().min(0).optional(),
  animationDuration: z.number().positive().optional(),
  selectable: z.boolean().optional(),
  deletable: z.boolean().optional(),
  animated: z.boolean().optional(),
  edgeTypes: z.record(z.string(), z.any()).optional(),
  edgePathGenerators: z.record(z.string(), z.any()).optional(),
});

/**
 * 交互配置 Schema
 */
export const FlowInteractionConfigSchema = z.object({
  enableMultiSelection: z.boolean().optional(),
  multiSelectKey: z.enum(['ctrl', 'shift', 'alt', 'meta']).optional(),
  enableBoxSelection: z.boolean().optional(),
  boxSelectionKey: z.enum(['ctrl', 'shift', 'alt', 'meta']).optional(),
  enableContextMenu: z.boolean().optional(),
  enableCanvasPan: z.boolean().optional(),
  enableWheelZoom: z.boolean().optional(),
  connectOnClick: z.boolean().optional(),
  connectionMode: z.enum(['strict', 'loose']).optional(),
  dragThreshold: z.number().min(0).optional(),
  doubleClickDelay: z.number().positive().optional(),
  nodesDraggable: z.boolean().optional(),
  nodesConnectable: z.boolean().optional(),
  nodesSelectable: z.boolean().optional(),
  edgesSelectable: z.boolean().optional(),
  edgesDeletable: z.boolean().optional(),
});

/**
 * 性能配置 Schema
 */
export const FlowPerformanceConfigSchema = z.object({
  enableRAFThrottle: z.boolean().optional(),
  enableVirtualScroll: z.boolean().optional(),
  virtualScrollBuffer: z.number().positive().optional(),
  enableViewportCulling: z.boolean().optional(),
  enableGPUAcceleration: z.boolean().optional(),
  enableEdgeCanvasRendering: z.boolean().optional(),
  edgeCanvasThreshold: z.number().positive().optional(),
  maxHistorySize: z.number().positive().optional(),
  enableConfigCache: z.boolean().optional(),
  cacheSizeLimit: z.number().positive().optional(),
});

/**
 * 主题配置 Schema
 */
export const FlowThemeConfigSchema = z.object({
  mode: z.enum(['light', 'dark', 'auto']).optional(),
  primaryColor: z.string().optional(),
  successColor: z.string().optional(),
  warningColor: z.string().optional(),
  errorColor: z.string().optional(),
  infoColor: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  borderRadius: z.number().min(0).optional(),
  boxShadow: z.string().optional(),
});

/**
 * 完整配置 Schema
 */
export const FlowConfigSchema = z.object({
  canvas: FlowCanvasConfigSchema.optional(),
  nodes: FlowNodeConfigSchema.optional(),
  edges: FlowEdgeConfigSchema.optional(),
  interaction: FlowInteractionConfigSchema.optional(),
  performance: FlowPerformanceConfigSchema.optional(),
  theme: FlowThemeConfigSchema.optional(),
});

/**
 * Zod 运行时验证函数（会抛出异常）
 * 用于需要严格验证的场景
 */
export function zodValidateNode(node: unknown) {
  return FlowNodeSchema.parse(node);
}

export function zodValidateEdge(edge: unknown) {
  return FlowEdgeSchema.parse(edge);
}

export function zodValidateConfig(config: unknown) {
  return FlowConfigSchema.parse(config);
}

/**
 * Zod 安全验证（不抛出异常）
 * 返回 { success: true, data: T } 或 { success: false, error: ZodError }
 */
export function zodSafeValidateNode(node: unknown) {
  return FlowNodeSchema.safeParse(node);
}

export function zodSafeValidateEdge(edge: unknown) {
  return FlowEdgeSchema.safeParse(edge);
}

export function zodSafeValidateConfig(config: unknown) {
  return FlowConfigSchema.safeParse(config);
}

