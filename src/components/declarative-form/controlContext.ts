import type { DeclarativeFieldConfig } from './types';
import { resolveGridControlStyle, stripGridFixedWidthProps } from './grid';

/**
 * 控件渲染上下文，由 {@link DeclarativeForm} 构造并传入内置/扩展渲染器。
 *
 * 供 {@link registerDeclarativeControl} 注册的渲染器与 `naiveFormControls` 共用， 封装 model 读写、布局模式及检索栏回车等横切逻辑。
 */
export interface DeclarativeControlContext {
  /** 当前表单数据，键名对应 {@link DeclarativeFieldConfig.field} */
  model: Record<string, unknown>;
  /** 更新指定字段值，等价于写入 `model[field]` 并触发响应式更新 */
  onUpdateModel: (field: string, value: unknown) => void;
  /** 是否为栅格布局（`layout="grid"`）；影响样式合并与宽度剥离策略 */
  isGrid: boolean;
  /** 输入框回车回调，检索栏场景下用于触发查询 */
  onInputEnterPress?: () => void;
}

/**
 * 合并字段 `componentProps` 与运行时透传属性，产出可直接绑定到底层 Naive 控件的 props。
 *
 * - 栅格模式：先经 {@link stripGridFixedWidthProps} 剥离固定宽度，再追加 `declarative-form__control` 类名
 * - `disabled`：字段级 `field.disabled` 优先，其次 `extra.disabled`，最后 `componentProps.disabled`
 * - `class`：栅格类名、`componentProps.class` 与 `extra.class` 以空格拼接
 *
 * @param field 字段声明配置
 * @param extra 运行时追加属性（如 `value`、`onUpdate:value`）
 * @param isGrid 是否处于栅格布局
 * @returns 合并后的控件 props 对象
 */
export function mergeControlProps(
  field: DeclarativeFieldConfig,
  extra: Record<string, unknown>,
  isGrid: boolean
) {
  const raw = field.componentProps ?? {};
  const componentProps = isGrid ? stripGridFixedWidthProps(raw) : raw;
  const { class: extraClass, disabled: extraDisabled, ...extraRest } = extra;
  const cp = componentProps as { class?: unknown; disabled?: boolean };
  const mergedClass = [isGrid ? 'declarative-form__control' : undefined, cp.class, extraClass]
    .filter(Boolean)
    .join(' ');
  const disabled = field.disabled ?? (extraDisabled as boolean | undefined) ?? cp.disabled;

  return {
    ...componentProps,
    ...extraRest,
    ...(mergedClass ? { class: mergedClass } : {}),
    ...(disabled !== undefined ? { disabled } : {})
  };
}

export interface BindFieldOptions {
  valueProp?: string;
  updateEvent?: string;
  /** 为 false 时不透传 `clearable` */
  passClearable?: boolean;
}

/**
 * 将字段配置与 `ctx.model` 双向绑定，供内置/扩展渲染器复用。
 *
 * 自动注入 `value` / `onUpdate:value`、`placeholder`、`clearable` 及布局相关 `style`： 栅格模式使用
 * {@link resolveGridControlStyle}，行内模式在字段配置了 `width` 时写入固定宽度。
 *
 * @param field 字段声明配置
 * @param ctx 控件渲染上下文
 * @param extra 额外透传属性，会与绑定结果一并传入 {@link mergeControlProps}
 * @param bindOptions 绑定键名等行为（如 Switch 使用 `checked`）
 * @returns 可直接展开到 Naive UI 控件的 props
 */
export function bindField(
  field: DeclarativeFieldConfig,
  ctx: DeclarativeControlContext,
  extra: Record<string, unknown> = {},
  bindOptions?: BindFieldOptions
) {
  const { field: key, placeholder, clearable = true } = field;
  const style = ctx.isGrid
    ? resolveGridControlStyle(field)
    : field.width
      ? { width: field.width }
      : undefined;
  const valueProp = bindOptions?.valueProp ?? 'value';
  const updateEvent = bindOptions?.updateEvent ?? 'onUpdate:value';
  const passClearable = bindOptions?.passClearable ?? true;

  return mergeControlProps(
    field,
    {
      [valueProp]: ctx.model[key],
      [updateEvent]: (value: unknown) => ctx.onUpdateModel(key, value),
      placeholder,
      ...(passClearable ? { clearable } : {}),
      style,
      ...extra
    },
    ctx.isGrid
  );
}

/** Switch、单个 Checkbox 等使用 `checked` 的控件 */
export function bindCheckedField(
  field: DeclarativeFieldConfig,
  ctx: DeclarativeControlContext,
  extra: Record<string, unknown> = {}
) {
  return bindField(field, ctx, extra, {
    valueProp: 'checked',
    updateEvent: 'onUpdate:checked',
    passClearable: false
  });
}

/** Upload 使用 `file-list` 的控件 */
export function bindFileListField(
  field: DeclarativeFieldConfig,
  ctx: DeclarativeControlContext,
  extra: Record<string, unknown> = {}
) {
  const { field: key } = field;
  const style = ctx.isGrid
    ? resolveGridControlStyle(field)
    : field.width
      ? { width: field.width }
      : undefined;

  return mergeControlProps(
    field,
    {
      'file-list': (ctx.model[key] as unknown) ?? [],
      'onUpdate:file-list': (value: unknown) => ctx.onUpdateModel(key, value),
      style,
      ...extra
    },
    ctx.isGrid
  );
}
