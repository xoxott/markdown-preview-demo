import type { VNode } from 'vue';
import type { DataTableProps as NaiveDataTableProps, PaginationProps } from 'naive-ui';
import type {
  DeclarativeFieldConfig,
  DeclarativeFieldType
} from '@/components/declarative-form/types';

/**
 * 与 DeclarativeForm 字段类型一致；在 TablePage 语境下为「搜索字段」配置。 新建通用表单请优先使用
 * `DeclarativeFieldConfig`（`@/components/declarative-form`）。
 */
export type SearchFieldType = DeclarativeFieldType;

/** @see DeclarativeFieldConfig */
export type SearchFieldConfig = DeclarativeFieldConfig;

/** 操作栏内置按钮种类 */
export type PresetButtonType = 'add' | 'batchDelete' | 'refresh' | 'export';

/** 单个预设按钮的覆盖配置 */
export interface PresetButtonConfig {
  /** 为 false 时隐藏该按钮 */
  show?: boolean;
  /** 点击回调 */
  onClick?: () => void | Promise<void>;
  /** 覆盖默认文案 */
  label?: string;
  /** 覆盖默认图标类名 */
  icon?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否处于加载中 */
  loading?: boolean;
}

/** 操作栏上的自定义按钮 */
export interface CustomButtonConfig {
  /** 按钮文案 */
  label: string;
  /** 图标类名 */
  icon?: string;
  /** 按钮语义类型 */
  type?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';
  /** 是否为次要样式 */
  secondary?: boolean;
  /** 点击回调 */
  onClick: () => void | Promise<void>;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
}

/** 表格上方工具区（新增 / 批量删除 / 刷新等）的配置 */
export interface ActionBarConfig {
  /** 内置按钮集合 */
  preset?: Partial<Record<PresetButtonType, PresetButtonConfig>>;
  /** 追加的自定义按钮 */
  custom?: CustomButtonConfig[];
  /** 是否展示统计文案（与按钮同一行：有统计时为两端对齐，无统计时按钮整体靠右），默认 false */
  showStats?: boolean;
  /** 自定义统计区域：入参为总条数与已选条数 */
  statsRender?: (total: number, selected: number) => VNode | string;
}

/** DataTable 内置的列渲染预设标识 */
export type PresetRendererType = 'avatar' | 'status' | 'date' | 'tag' | 'badge' | 'action' | 'text';

/** 头像列渲染配置 */
export interface AvatarRendererConfig {
  /** 头像图片字段，默认 avatar */
  avatarField?: string;
  /** 展示名称所用字段 */
  nameField: string;
  /** 头像直径 */
  size?: number;
  /** 是否展示在线状态小圆点 */
  showOnlineStatus?: boolean;
  /** 在线状态布尔字段名 */
  onlineStatusField?: string;
}

/** 状态列（开关 / 标签）渲染配置 */
export interface StatusRendererConfig {
  /** switch：可点击开关；tag：只读标签 */
  type: 'switch' | 'tag';
  /** switch 变更时回调，参数为行数据与新值 */
  onChange?: (row: any, value: boolean) => void | Promise<void>;
  /** tag：真值展示文案 */
  trueLabel?: string;
  /** tag：假值展示文案 */
  falseLabel?: string;
  /** tag：真值颜色类型 */
  trueType?: 'success' | 'info' | 'warning' | 'error' | 'default';
  /** tag：假值颜色类型 */
  falseType?: 'success' | 'info' | 'warning' | 'error' | 'default';
}

/** 日期 / 时间列渲染配置 */
export interface DateRendererConfig {
  /** 内置展示风格 */
  format?: 'datetime' | 'date' | 'time' | 'relative' | 'smart';
  /** 传给 dayjs 等的格式串 */
  formatString?: string;
  /** 空值占位 */
  emptyText?: string;
}

/** 标签列渲染配置 */
export interface TagRendererConfig {
  /** simple：单标签；badge / popover：多值折叠展示 */
  type?: 'simple' | 'badge' | 'popover';
  /** 最多展示数量 */
  maxShow?: number;
  /** naive NTag 的 type */
  tagType?: 'default' | 'info' | 'success' | 'warning' | 'error';
  /** 是否圆角标签 */
  round?: boolean;
  /** 复杂结构体字段到 label/value 的映射 */
  fieldMap?: {
    label: string;
    value?: string;
    type?: string;
  };
}

/** 徽章列渲染配置 */
export interface BadgeRendererConfig {
  /** 数值来源字段，缺省用列 key */
  valueField?: string;
  /** NBadge type */
  type?: 'default' | 'info' | 'success' | 'warning' | 'error';
  /** 是否仅展示小圆点 */
  dot?: boolean;
  /** 数值封顶展示 */
  max?: number;
}

/** 行级操作按钮单项 */
export interface ActionButtonItemConfig {
  /** 按钮文案 */
  label: string;
  /** 图标类名 */
  icon?: string;
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';
  /** 次要按钮样式 */
  secondary?: boolean;
  /** 点击回调，入参为行数据 */
  onClick: (row: any) => void | Promise<void>;
  /** 是否展示：布尔或按行判断 */
  show?: boolean | ((row: any) => boolean);
  /** 是否禁用：布尔或按行判断 */
  disabled?: boolean | ((row: any) => boolean);
  /** 点击前二次确认 */
  confirm?: {
    title: string;
    content?: string;
  };
}

/** 行级操作列：多个按钮 + 折叠 */
export interface ActionRendererConfig {
  /** 从左到右的按钮定义 */
  buttons: ActionButtonItemConfig[];
  /** 超出后收入「更多」 */
  maxShow?: number;
  /** 「更多」菜单触发文案 */
  moreText?: string;
}

/** 纯文本列增强 */
export interface TextRendererConfig {
  /** 空值占位 */
  emptyText?: string;
  /** 是否加粗 */
  strong?: boolean;
  /** NText depth */
  depth?: 1 | 2 | 3;
  /** 是否单行省略 */
  ellipsis?: boolean;
  /** 多行省略行数 */
  lineClamp?: number;
}

/** 各预设 render 对应的 config 联合类型 */
export type RendererConfig =
  | AvatarRendererConfig
  | StatusRendererConfig
  | DateRendererConfig
  | TagRendererConfig
  | BadgeRendererConfig
  | ActionRendererConfig
  | TextRendererConfig;

/** 业务侧声明的列配置：在 naive DataTable 列基础上增加预设 render / renderConfig。 其余键会原样透传，便于使用官方列能力（sorter、filter 等）。 */
export interface TableColumnConfig<T = any> {
  /** 列唯一 key，与行数据字段或虚拟列名对应 */
  key: string | number;
  /** 表头标题 */
  title?: string;
  /** 列宽 */
  width?: number | string;
  /** 固定列方向 */
  fixed?: 'left' | 'right';
  /** 文本省略配置 */
  ellipsis?: boolean | { tooltip: boolean };
  /** 预设渲染类型名，或完全自定义 render 函数 */
  render?: PresetRendererType | ((row: T, index: number) => VNode | string | number);
  /** 配合预设 render 使用的配置对象 */
  renderConfig?: RendererConfig;
  /** 透传给 naive-ui 列定义的任意扩展字段 */
  [key: string]: any;
}

/**
 * 与 TablePage / SearchBar 对接的一组搜索状态方法。 推荐直接展开 `useTablePage(...).searchBindings` 传入 TablePage（其
 * `searchModel` 即 `useTable` 的 `searchParams`）。
 */
export interface TablePageSearchBindings {
  /** 当前搜索表单（一般为 reactive） */
  searchModel: object;
  /** 单字段更新：受控模式下应写回父级状态 */
  onUpdateSearchField: (field: string, value: unknown) => void;
  /** 触发搜索（如重置页码并请求列表） */
  onSearch: () => void;
  /** 触发重置并恢复默认值 */
  onReset: () => void;
}

/** TablePage 组件的完整 Props 契约（文档与类型推导用）。 实际 TSX 中仍通过 defineComponent 的 props 选项声明运行时校验。 */
export interface TablePageProps {
  /** 搜索区字段配置；与 searchBindings / searchModel 二选一或组合使用，详见 README */
  searchConfig?: SearchFieldConfig[];
  /**
   * 受控搜索表单数据：与 useTablePage 返回的 searchBindings.searchModel 引用相同对象即可。 不传且存在 searchConfig 时，TablePage
   * 内部会自建一份 reactive（适合无请求封装的静态演示）。
   */
  searchModel?: object;
  /** 单字段更新回调；不传时若仍传入 searchModel，则直接写入 searchModel[field]（依赖 reactive 对象）。 */
  onUpdateSearchField?: (field: string, value: unknown) => void;
  /** 仅内部搜索模式生效：初始填充值 */
  initialSearchModel?: Record<string, unknown>;
  /** 操作栏配置；不传则不展示工具卡片区 */
  actionConfig?: ActionBarConfig;
  /**
   * 为 true 时在操作栏展示「列设置」（显隐 + 拖拽排序）。 非受控时由 TablePage 内部维护 checks；受控时需同时传 `columnChecks` 与
   * `onUpdateColumnChecks`。
   */
  enableColumnSetting?: boolean;
  /** 受控：列勾选与顺序，与 `onUpdateColumnChecks` 成对使用 */
  columnChecks?: NaiveUI.TableColumnCheck[];
  /** 受控：列设置变更回调 */
  onUpdateColumnChecks?: (next: NaiveUI.TableColumnCheck[]) => void;
  /** 列定义 */
  columns: TableColumnConfig<any>[];
  /** 行数据 */
  data: any[];
  /** 加载态 */
  loading?: boolean;
  /** naive PaginationProps，含 onUpdatePage 等 */
  pagination?: PaginationProps;
  /** 多选选中行的 rowKey 列表 */
  selectedKeys?: (string | number)[];
  /** 行主键字段名或 getter */
  rowKey?: string | ((row: any) => string | number);
  /** 搜索提交：受控模式下通常绑定 useSearchForm.handleSearch； 内部模式下会在复位表单后附带调用。 若需当前表单快照请监听 @search 事件。 */
  onSearch?: (payload?: Record<string, unknown>) => void;
  /** 重置完成后的回调 */
  onReset?: () => void;
  /** 多选变更 */
  onUpdateSelectedKeys?: (keys: (string | number)[]) => void;
  /** 横向滚动区域宽度 */
  scrollX?: number;
  /** 是否展示序号列 */
  showIndex?: boolean;
  /** 是否展示多选列 */
  showSelection?: boolean;
  /** 斑马纹 */
  striped?: boolean;
  /** 表格尺寸 */
  size?: 'small' | 'medium' | 'large';
  /** 单元格边框 */
  bordered?: boolean;
  /** 表格 body 最大高度 */
  maxHeight?: string | number;
  /** 根容器额外 class */
  class?: string;
  /** 是否渲染搜索外层 NCard */
  showSearchCard?: boolean;
  /** 搜索区 NCard bordered */
  searchCardBordered?: boolean;
  /** 为 true 时整块检索区可折叠（NCollapse），与 `searchCollapsible`（栅格行）无关 */
  searchSectionCollapsible?: boolean;
  /** 整块检索区初始是否展开 */
  searchSectionDefaultExpanded?: boolean;
  /** 整块检索区折叠面板标题 */
  searchSectionTitle?: string;
  /** 为 true 时搜索区可展开 / 收起 */
  searchCollapsible?: boolean;
  /** 栅格每行列数，默认 `1 s:2 m:3 l:6 xl:7`（含尾列操作区） */
  searchCols?: number | string;
  searchGridXGap?: number;
  searchGridYGap?: number;
  /** `screen` 随视口；`self` 随检索区容器宽度 */
  searchGridResponsive?: 'self' | 'screen';
  /** 收起时保留的筛选项行数 */
  searchCollapsedRows?: number;
  /** 初始是否收起 */
  searchDefaultCollapsed?: boolean;
  /** 是否展示检索项标签（字段需配置 `label`） */
  searchShowLabel?: boolean;
  /** 检索项标签位置 */
  searchLabelPlacement?: 'left' | 'top';
  /** 检索项左标签宽度 */
  searchLabelWidth?: number | string;
  /** 是否渲染操作区外层 NCard */
  showActionCard?: boolean;
  /** 操作区 NCard bordered */
  actionCardBordered?: boolean;
  /** 根容器 flex 子项间距 class，默认 gap-16px */
  gapClass?: string;
  /** 是否包裹根节点 p-16px，默认 true */
  padded?: boolean;
  /** 透传给 NDataTable 的原生属性（remote、flexHeight、rowProps 等）， 会与组件内置 props 浅合并，内置键优先。 */
  tableProps?: Partial<NaiveDataTableProps>;
}

/** SearchBar 对外 Props（与 defineComponent props 一致，供二次封装） */
export interface SearchBarProps {
  config: SearchFieldConfig[];
  model: object;
  onSearch: () => void;
  onReset: () => void;
  onUpdateModel: (field: string, value: unknown) => void;
  /** 表单项标签位置 */
  labelPlacement?: 'left' | 'top';
  /** 左标签宽度 */
  labelWidth?: number | string;
  showLabel?: boolean;
  /** 是否显示搜索 / 重置按钮 */
  showActionButtons?: boolean;
  /** 栅格列数，默认 `1 s:2 m:3 l:6 xl:7` */
  cols?: number | string;
  gridXGap?: number;
  gridYGap?: number;
  gridResponsive?: 'self' | 'screen';
  /** 是否可展开收起筛选项 */
  collapsible?: boolean;
  /** 收起时保留行数 */
  collapsedRows?: number;
  defaultCollapsed?: boolean;
}

/** ActionBar 上挂接的列设置（与 `TableColumnSetting` / `NaiveUI.TableColumnCheck[]` 一致） */
export interface ActionBarColumnSetting {
  checks: NaiveUI.TableColumnCheck[];
  onUpdateChecks: (next: NaiveUI.TableColumnCheck[]) => void;
}

/** ActionBar 对外 Props */
export interface ActionBarProps {
  /** 工具区配置 */
  config: ActionBarConfig;
  /** 当前选中行 keys */
  selectedKeys: (string | number)[];
  /** 总条数（用于统计与分页 total） */
  total: number;
  /** 为 true 时在左侧按钮组末尾展示列设置弹层 */
  columnSetting?: ActionBarColumnSetting;
}

/** DataTable 对外 Props */
export interface DataTableProps<T = any> {
  /** 列配置 */
  columns: TableColumnConfig<T>[];
  /** 数据源 */
  data: T[];
  /** 加载态 */
  loading?: boolean;
  /** 分页 */
  pagination?: PaginationProps;
  /** 选中 keys */
  selectedKeys?: (string | number)[];
  /** 行主键 */
  rowKey?: string | ((row: T) => string | number);
  /** 选中变更 */
  onUpdateSelectedKeys?: (keys: (string | number)[]) => void;
  scrollX?: number;
  showIndex?: boolean;
  showSelection?: boolean;
  striped?: boolean;
  size?: 'small' | 'medium' | 'large';
  bordered?: boolean;
  maxHeight?: string | number;
  /** 透传 NDataTable，合并策略同 TablePage.tableProps */
  tableProps?: Partial<NaiveDataTableProps>;
}
