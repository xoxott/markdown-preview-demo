/**
 * Flow 边/连接线类型定义
 *
 * 定义图形编辑器中连接线的核心数据结构
 */

/**
 * Flow 边/连接线数据
 *
 * 通用连接线数据结构，不包含业务逻辑
 */
export interface FlowEdge<T = any> {
  /** 连接线唯一标识 */
  id: string;
  /** 源节点 ID */
  source: string;
  /** 目标节点 ID */
  target: string;
  /** 源端口 ID（可选） */
  sourceHandle?: string;
  /** 目标端口 ID（可选） */
  targetHandle?: string;
  /** 连接线类型（用于查找对应的渲染组件） */
  type?: string;
  /** 连接线数据（业务数据，由使用者定义） */
  data?: T;
  /** 连接线样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
  /** 是否选中 */
  selected?: boolean;
  /** 是否可选中 */
  selectable?: boolean;
  /** 是否可删除 */
  deletable?: boolean;
  /** 是否启用动画 */
  animated?: boolean;
  /** 连接线标签 */
  label?: string;
  /** 标签样式 */
  labelStyle?: Record<string, any>;
  /** 贝塞尔曲线控制点偏移比例（用于 bezier 类型，0-1之间，值越大弧度越大，默认从配置读取） */
  bezierControlOffset?: number;
  /** 自定义属性 */
  [key: string]: any;
}

/**
 * 连接线类型注册表项
 */
export interface FlowEdgeType {
  /** 连接线类型名称 */
  name: string;
  /** 连接线组件 */
  component: any;
  /** 默认配置 */
  defaultConfig?: Partial<FlowEdge>;
}

/**
 * 连接线路径生成器参数
 */
export interface FlowEdgePathParams {
  /** 源节点位置 */
  sourceX: number;
  sourceY: number;
  /** 目标节点位置 */
  targetX: number;
  targetY: number;
  /** 源端口位置（如果有） */
  sourceHandleX?: number;
  sourceHandleY?: number;
  /** 目标端口位置（如果有） */
  targetHandleX?: number;
  targetHandleY?: number;
  /** 连接线类型 */
  type?: string;
  /** 自定义参数 */
  [key: string]: any;
}

/**
 * 连接线路径生成器函数
 */
export type FlowEdgePathGenerator = (params: FlowEdgePathParams) => string;

