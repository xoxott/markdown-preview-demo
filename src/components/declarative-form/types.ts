import type { VNode } from 'vue';

/** 声明式表单控件类型：与 DeclarativeForm 渲染分支一一对应 */
export type DeclarativeFieldType = 'input' | 'select' | 'date-range' | 'date' | 'custom';

/** 单字段配置：由配置数组驱动 naive-ui 表单项渲染 */
export interface DeclarativeFieldConfig {
  type: DeclarativeFieldType;
  /** 绑定到 model 的键名 */
  field: string;
  placeholder?: string;
  /** input 前缀图标（UnoCSS / iconfont 类名） */
  icon?: string;
  /** 控件宽度，如 `220px` */
  width?: string;
  /** 下拉选项（type 为 select 时使用） */
  options?: Array<{ label: string; value: any }>;
  clearable?: boolean;
  disabled?: boolean;
  /**
   * 初始值：与外部 initialValues / reset 逻辑配合时使用； table-page 的 useSearchForm 重置时优先 initialValues[field]，其次
   * defaultValue
   */
  defaultValue?: unknown;
  /** 透传给底层 Naive UI 组件；会与内部的 value / onUpdate:value 等合并，后者优先 */
  componentProps?: Record<string, unknown>;
  /** type 为 custom 时的渲染函数 */
  render?: (model: any, updateModel: (field: string, value: any) => void) => VNode;
  label?: string;
  /** 为 false 时可强制隐藏单个字段标签 */
  showLabel?: boolean;
}

/** DeclarativeForm 对外 Props（文档与二次封装引用） */
export interface DeclarativeFormProps {
  fields: DeclarativeFieldConfig[];
  model: Record<string, any>;
  onUpdateModel: (field: string, value: any) => void;
  labelPlacement?: 'left' | 'top';
  showLabel?: boolean;
  /** 是否 inline 布局，与 naive NForm inline 一致 */
  inline?: boolean;
  /**
   * 若传入，则 input 控件在按下 Enter 时调用（例如搜索条提交）； 普通业务表单可不传，避免误触提交。
   */
  onInputEnterPress?: () => void;
}
