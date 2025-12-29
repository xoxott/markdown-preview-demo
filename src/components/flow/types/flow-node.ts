/**
 * Flow 节点类型定义
 *
 * 定义图形编辑器中节点的核心数据结构
 */

/**
 * 节点位置坐标
 */
export interface FlowPosition {
  x: number;
  y: number;
}

/**
 * 节点尺寸
 */
export interface FlowSize {
  width: number;
  height: number;
}

/**
 * 节点端口/句柄定义
 */
export interface FlowHandle {
  /** 端口 ID */
  id: string;
  /** 端口类型 */
  type: 'source' | 'target';
  /** 端口位置（相对于节点） */
  position: 'top' | 'bottom' | 'left' | 'right';
  /** 端口样式 */
  style?: Record<string, any>;
  /** 是否可见 */
  hidden?: boolean;
  /** 是否可连接 */
  connectable?: boolean;
}

/**
 * Flow 节点数据
 *
 * 通用节点数据结构，不包含业务逻辑
 * 业务数据存储在 data 字段中
 */
export interface FlowNode<T = any> {
  /** 节点唯一标识 */
  id: string;
  /** 节点类型（用于查找对应的节点组件） */
  type: string;
  /** 节点位置 */
  position: FlowPosition;
  /** 节点数据（业务数据，由使用者定义） */
  data: T;
  /** 节点尺寸（可选，如果不提供则使用默认值） */
  size?: FlowSize;
  /** 节点样式 */
  style?: Record<string, any>;
  /** CSS 类名 */
  class?: string;
  /** 是否选中 */
  selected?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否可连接 */
  connectable?: boolean;
  /** 是否可选择 */
  selectable?: boolean;
  /** 是否可删除 */
  deletable?: boolean;
  /** 是否锁定（锁定后不可拖拽、删除） */
  locked?: boolean;
  /** 端口/句柄定义 */
  handles?: FlowHandle[];
  /** 自定义属性 */
  [key: string]: any;
}

/**
 * 节点类型注册表项
 */
export interface FlowNodeType {
  /** 节点类型名称 */
  name: string;
  /** 节点组件 */
  component: any;
  /** 默认配置 */
  defaultConfig?: Partial<FlowNode>;
}

