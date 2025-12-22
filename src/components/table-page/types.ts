import type { VNode } from 'vue';
import type { PaginationProps } from 'naive-ui';

/**
 * 搜索字段类型
 */
export type SearchFieldType = 'input' | 'select' | 'date-range' | 'date' | 'custom';

/**
 * 搜索字段配置
 */
export interface SearchFieldConfig {
  /** 字段类型 */
  type: SearchFieldType;
  /** 字段名 */
  field: string;
  /** 占位符 */
  placeholder?: string;
  /** 图标类名 */
  icon?: string;
  /** 宽度 */
  width?: string;
  /** 选项（用于 select 类型） */
  options?: Array<{ label: string; value: any }>;
  /** 是否可清空 */
  clearable?: boolean;
  /** 自定义渲染（用于 custom 类型） */
  render?: (model: any, updateModel: (field: string, value: any) => void) => VNode;
  /** 标签 */
  label?: string;
  /** 是否显示标签 */
  showLabel?: boolean;
}

/**
 * 预设按钮类型
 */
export type PresetButtonType = 'add' | 'batchDelete' | 'refresh' | 'export';

/**
 * 预设按钮配置
 */
export interface PresetButtonConfig {
  /** 是否显示 */
  show?: boolean;
  /** 点击事件 */
  onClick?: () => void | Promise<void>;
  /** 自定义标签 */
  label?: string;
  /** 自定义图标 */
  icon?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 自定义按钮配置
 */
export interface CustomButtonConfig {
  /** 按钮标签 */
  label: string;
  /** 图标类名 */
  icon?: string;
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';
  /** 是否为次要按钮 */
  secondary?: boolean;
  /** 点击事件 */
  onClick: () => void | Promise<void>;
  /** 是否禁用 */
  disabled?: boolean;
  /** 加载状态 */
  loading?: boolean;
}

/**
 * 操作栏配置
 */
export interface ActionBarConfig {
  /** 预设按钮配置 */
  preset?: Partial<Record<PresetButtonType, PresetButtonConfig>>;
  /** 自定义按钮 */
  custom?: CustomButtonConfig[];
  /** 是否显示统计信息 */
  showStats?: boolean;
  /** 自定义统计信息渲染 */
  statsRender?: (total: number, selected: number) => VNode | string;
}

/**
 * 预设渲染器类型
 */
export type PresetRendererType = 'avatar' | 'status' | 'date' | 'tag' | 'badge' | 'action' | 'text';

/**
 * 头像渲染器配置
 */
export interface AvatarRendererConfig {
  /** 头像字段名 */
  avatarField?: string;
  /** 名称字段名 */
  nameField: string;
  /** 头像大小 */
  size?: number;
  /** 是否显示在线状态 */
  showOnlineStatus?: boolean;
  /** 在线状态字段名 */
  onlineStatusField?: string;
}

/**
 * 状态渲染器配置
 */
export interface StatusRendererConfig {
  /** 渲染类型 */
  type: 'switch' | 'tag';
  /** 变更事件（用于 switch 类型） */
  onChange?: (row: any, value: boolean) => void | Promise<void>;
  /** 真值标签（用于 tag 类型） */
  trueLabel?: string;
  /** 假值标签（用于 tag 类型） */
  falseLabel?: string;
  /** 真值类型（用于 tag 类型） */
  trueType?: 'success' | 'info' | 'warning' | 'error' | 'default';
  /** 假值类型（用于 tag 类型） */
  falseType?: 'success' | 'info' | 'warning' | 'error' | 'default';
}

/**
 * 日期渲染器配置
 */
export interface DateRendererConfig {
  /** 格式化类型 */
  format?: 'datetime' | 'date' | 'time' | 'relative' | 'smart';
  /** 自定义格式化字符串 */
  formatString?: string;
  /** 空值显示 */
  emptyText?: string;
}

/**
 * 标签渲染器配置
 */
export interface TagRendererConfig {
  /** 渲染类型 */
  type?: 'simple' | 'badge' | 'popover';
  /** 最多显示数量（用于 badge 和 popover 类型） */
  maxShow?: number;
  /** 标签类型 */
  tagType?: 'default' | 'info' | 'success' | 'warning' | 'error';
  /** 是否圆角 */
  round?: boolean;
  /** 字段映射 */
  fieldMap?: {
    label: string;
    value?: string;
    type?: string;
  };
}

/**
 * 徽章渲染器配置
 */
export interface BadgeRendererConfig {
  /** 徽章值字段 */
  valueField?: string;
  /** 徽章类型 */
  type?: 'default' | 'info' | 'success' | 'warning' | 'error';
  /** 是否显示为点 */
  dot?: boolean;
  /** 最大值 */
  max?: number;
}

/**
 * 操作按钮配置
 */
export interface ActionButtonItemConfig {
  /** 按钮标签 */
  label: string;
  /** 图标类名 */
  icon?: string;
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';
  /** 是否为次要按钮 */
  secondary?: boolean;
  /** 点击事件 */
  onClick: (row: any) => void | Promise<void>;
  /** 是否显示（可以是函数） */
  show?: boolean | ((row: any) => boolean);
  /** 是否禁用（可以是函数） */
  disabled?: boolean | ((row: any) => boolean);
  /** 确认提示 */
  confirm?: {
    title: string;
    content?: string;
  };
}

/**
 * 操作渲染器配置
 */
export interface ActionRendererConfig {
  /** 按钮列表 */
  buttons: ActionButtonItemConfig[];
  /** 最多显示按钮数量 */
  maxShow?: number;
  /** 更多按钮文本 */
  moreText?: string;
}

/**
 * 文本渲染器配置
 */
export interface TextRendererConfig {
  /** 空值显示 */
  emptyText?: string;
  /** 是否加粗 */
  strong?: boolean;
  /** 文本深度 */
  depth?: 1 | 2 | 3;
  /** 是否省略 */
  ellipsis?: boolean;
  /** 最大行数 */
  lineClamp?: number;
}

/**
 * 渲染器配置联合类型
 */
export type RendererConfig =
  | AvatarRendererConfig
  | StatusRendererConfig
  | DateRendererConfig
  | TagRendererConfig
  | BadgeRendererConfig
  | ActionRendererConfig
  | TextRendererConfig;

/**
 * 扩展的表格列配置
 */
export interface TableColumnConfig<T = any> {
  /** 列键 */
  key: string | number;
  /** 列标题 */
  title?: string;
  /** 列宽度 */
  width?: number | string;
  /** 是否固定 */
  fixed?: 'left' | 'right';
  /** 是否省略 */
  ellipsis?: boolean | { tooltip: boolean };
  /** 预设渲染器类型 */
  render?: PresetRendererType | ((row: T, index: number) => VNode | string | number);
  /** 渲染器配置 */
  renderConfig?: RendererConfig;
  /** 其他 DataTableBaseColumn 属性 */
  [key: string]: any;
}

/**
 * 表格页面 Props
 */
export interface TablePageProps {
  /** 搜索栏配置 */
  searchConfig?: SearchFieldConfig[];
  /** 操作栏配置 */
  actionConfig?: ActionBarConfig;
  /** 表格列配置 */
  columns: TableColumnConfig<any>[];
  /** 表格数据 */
  data: any[];
  /** 加载状态 */
  loading?: boolean;
  /** 分页配置 */
  pagination?: PaginationProps;
  /** 选中的行键 */
  selectedKeys?: (string | number)[];
  /** 行键字段 */
  rowKey?: string | ((row: any) => string | number);
  /** 搜索事件 */
  onSearch?: (searchForm: Record<string, any>) => void;
  /** 重置事件 */
  onReset?: () => void;
  /** 选中行变更事件 */
  onUpdateSelectedKeys?: (keys: (string | number)[]) => void;
  /** 表格滚动宽度 */
  scrollX?: number;
  /** 是否显示序号列 */
  showIndex?: boolean;
  /** 是否显示选择列 */
  showSelection?: boolean;
  /** 是否条纹 */
  striped?: boolean;
  /** 表格大小 */
  size?: 'small' | 'medium' | 'large';
  /** 是否显示边框 */
  bordered?: boolean;
  /** 最大高度 */
  maxHeight?: string | number;
  /** 自定义类名 */
  class?: string;
}

/**
 * 搜索栏 Props
 */
export interface SearchBarProps {
  /** 搜索字段配置 */
  config: SearchFieldConfig[];
  /** 表单模型 */
  model: Record<string, any>;
  /** 搜索事件 */
  onSearch: () => void;
  /** 重置事件 */
  onReset: () => void;
  /** 模型更新事件 */
  onUpdateModel: (field: string, value: any) => void;
  /** 标签位置 */
  labelPlacement?: 'left' | 'top';
  /** 是否显示标签 */
  showLabel?: boolean;
}

/**
 * 操作栏 Props
 */
export interface ActionBarProps {
  /** 操作栏配置 */
  config: ActionBarConfig;
  /** 选中的行键 */
  selectedKeys: (string | number)[];
  /** 总数据量 */
  total: number;
}

/**
 * 数据表格 Props
 */
export interface DataTableProps<T = any> {
  /** 表格列配置 */
  columns: TableColumnConfig<T>[];
  /** 表格数据 */
  data: T[];
  /** 加载状态 */
  loading?: boolean;
  /** 分页配置 */
  pagination?: PaginationProps;
  /** 选中的行键 */
  selectedKeys?: (string | number)[];
  /** 行键字段 */
  rowKey?: string | ((row: T) => string | number);
  /** 选中行变更事件 */
  onUpdateSelectedKeys?: (keys: (string | number)[]) => void;
  /** 表格滚动宽度 */
  scrollX?: number;
  /** 是否显示序号列 */
  showIndex?: boolean;
  /** 是否显示选择列 */
  showSelection?: boolean;
  /** 是否条纹 */
  striped?: boolean;
  /** 表格大小 */
  size?: 'small' | 'medium' | 'large';
  /** 是否显示边框 */
  bordered?: boolean;
  /** 最大高度 */
  maxHeight?: string | number;
}

