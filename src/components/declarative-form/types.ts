import type { VNode } from 'vue';

/**
 * 声明式表单整体布局模式。
 *
 * - `inline`：行内表单项，字段可通过 `width` 固定控件宽度，支持 `wrap` 换行。
 * - `grid`：基于 Naive UI `NGrid` 的栅格布局，字段通过 `span` 占列，配合 `gridCols` 等属性响应式排布。
 */
export type DeclarativeFormLayout = 'inline' | 'grid';

/**
 * 表单尾部插槽（`#suffix`）的放置方式，仅在与 `layout` 组合时生效。
 *
 * - `inline`：与字段同一行内联，适用于 `layout="inline"`。
 * - `grid-cell`：作为栅格中的一个单元格，与最后一行字段并列，适用于 `layout="grid"`。
 * - `below-grid`：独占栅格下方一行（检索栏常见：查询 / 重置按钮整行右对齐）。
 */
export type DeclarativeFormSuffixPlacement = 'inline' | 'grid-cell' | 'below-grid';

/** 内置 Naive 表单控件 type，在 `naiveFormControls` 加载时注册 */
export const DECLARATIVE_BUILTIN_FIELD_TYPES = [
  'input',
  'textarea',
  'password',
  'input-number',
  'select',
  'auto-complete',
  'cascader',
  'tree-select',
  'date',
  'datetime',
  'date-range',
  'datetime-range',
  'month',
  'year',
  'quarter',
  'week',
  'time',
  'time-range',
  'switch',
  'checkbox',
  'checkbox-group',
  'radio-group',
  'slider',
  'rate',
  'color-picker',
  'transfer',
  'dynamic-input',
  'upload',
  'custom'
] as const;

export type DeclarativeBuiltinFieldType = (typeof DECLARATIVE_BUILTIN_FIELD_TYPES)[number];

/**
 * 字段控件 type：内置类型 + 通过 `registerDeclarativeControl` 注册的扩展名。
 *
 * 内置类型见 {@link DeclarativeBuiltinFieldType}；弹窗/编辑表单可注册 `input-number`、`switch` 等而无需改核心代码。
 */
export type DeclarativeFieldType = DeclarativeBuiltinFieldType | (string & {});

/**
 * 单个表单字段的声明式配置。
 *
 * `field` 同时作为 `model` 的键名与 `NFormItem` 的 `path`，用于校验与双向绑定。
 */
export interface DeclarativeFieldConfig {
  /** 控件类型，决定渲染的 Naive UI 组件或自定义内容 */
  type: DeclarativeFieldType;
  /** 绑定字段名，对应 `model[field]` */
  field: string;
  /** 占位提示文案 */
  placeholder?: string;
  /** 图标类名（如 UnoCSS icon），仅 `type="input"` 时作为输入框前缀展示 */
  icon?: string;
  /** 控件固定宽度（如 `'200px'`）。 仅在 `layout="inline"` 时写入控件 `style`；栅格模式下会被忽略以保证列宽自适应。 */
  width?: string;
  /**
   * 栅格布局下控件 `style.maxWidth`（如 `'320px'`、`'min(100%, 280px)'`）。 仅 `layout="grid"` 时生效；未设置时
   * `date-range` 使用组件内置默认上限。
   */
  gridMaxWidth?: string;
  /** 栅格占列数（`NGi` 的 `span`）。 未设置时：`datetime-range` / `time-range` / `transfer` 默认为 `2`，其余为 `1`。 */
  span?: number;
  /** 选项数据：`select` / `radio-group` / `checkbox-group` / `cascader` / `tree-select` / `transfer` 等 */
  options?: Array<{ label: string; value: any; [key: string]: any }>;
  /** 是否显示清除按钮，默认 `true` */
  clearable?: boolean;
  /** 是否禁用；也可通过 `componentProps.disabled` 覆盖 */
  disabled?: boolean;
  /** 字段初始值（由调用方写入 `model`，此处仅作文档性约定） */
  defaultValue?: unknown;
  /** 透传给底层 Naive 控件的额外属性。 栅格模式下会剥离 `style` 中的 `width` / `minWidth` / `maxWidth`，避免破坏列宽伸缩。 */
  componentProps?: Record<string, unknown>;
  /**
   * 自定义渲染函数，仅 `type="custom"` 时使用。
   *
   * @param model 当前表单数据对象
   * @param updateModel 更新指定字段的回调，等价于 `onUpdateModel(field, value)`
   */
  render?: (model: any, updateModel: (field: string, value: any) => void) => VNode;
  /**
   * 只读模式（`DeclarativeForm` 的 `readonly`）下自定义整块展示，优先级高于内置 {@link formatReadonlyValue}。 返回
   * `null`、`undefined` 或空白字符串时显示 `-`。
   */
  renderReadonly?: (model: Record<string, unknown>) => VNode | string | null | undefined;
  /** 表单项标签文案 */
  label?: string;
  /** 是否展示该字段的标签。 在表单级 `showLabel={true}` 时，设为 `false` 可单独隐藏本字段标签。 */
  showLabel?: boolean;
}

/**
 * {@link DeclarativeForm} 组件的 Props 类型定义。
 *
 * 表单数据由外部 `model` + `onUpdateModel` 受控，组件本身不维护字段状态。
 */
export interface DeclarativeFormProps {
  /** 字段配置列表，按数组顺序渲染 */
  fields: DeclarativeFieldConfig[];
  /** 表单数据对象（受控） */
  model: Record<string, unknown>;
  /** 字段值变更回调，`(field, value)` 更新 `model[field]` */
  onUpdateModel: (field: string, value: unknown) => void;
  /** 标签相对控件的位置，透传至 `NForm`，默认 `'left'` */
  labelPlacement?: 'left' | 'top';
  /** 标签宽度，透传至 `NForm` */
  labelWidth?: number | string;
  /** 是否全局展示字段标签；具体字段仍可通过 `DeclarativeFieldConfig.showLabel` 覆盖 */
  showLabel?: boolean;
  /**
   * 布局模式，默认 `'inline'`。
   *
   * @see DeclarativeFormLayout
   */
  layout?: DeclarativeFormLayout;
  /** 是否行内排列，透传至 `NForm` 的 `inline`。 仅 `layout="inline"` 时生效；栅格模式下强制为非 inline。 */
  inline?: boolean;
  /** 行内布局是否允许换行（`declarative-form--inline-wrap`）。 仅 `layout="inline"` 且 `inline={true}` 时生效。 */
  wrap?: boolean;
  /**
   * 尾部 `#suffix` 插槽的放置方式，默认 `'inline'`。
   *
   * @see DeclarativeFormSuffixPlacement
   */
  suffixPlacement?: DeclarativeFormSuffixPlacement;
  /** 栅格列数，透传至 `NGrid.cols`。 支持数字或 Naive 响应式字符串（如 `'1 s:2 m:3 l:4'`），默认见 `DEFAULT_GRID_COLS`。 */
  gridCols?: number | string;
  /** 栅格水平间距（px），透传至 `NGrid.xGap`，默认 `24` */
  gridXGap?: number;
  /** 栅格垂直间距（px），透传至 `NGrid.yGap`，默认 `0` */
  gridYGap?: number;
  /**
   * 栅格响应式断点策略，透传至 `NGrid.responsive`。
   *
   * - `'screen'`：按视口断点（默认）
   * - `'self'`：按栅格容器宽度
   */
  gridResponsive?: 'self' | 'screen';
  /** `type="input"` 时按下 Enter 键的回调（常用于触发搜索） */
  onInputEnterPress?: () => void;
  /** 为 `true` 时仅展示标签与格式化后的字段值，不渲染可编辑控件；空值显示 `-`。 典型场景为详情抽屉 / 弹窗；建议同时设置 `showLabel`。 */
  readonly?: boolean;
}
