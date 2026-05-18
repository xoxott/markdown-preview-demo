import { NDatePicker, NInput, NSelect } from 'naive-ui';
import type { DeclarativeFieldConfig } from './types';
import { gridControlStyle, stripGridFixedWidthProps } from './grid';

export interface DeclarativeControlContext {
  model: Record<string, unknown>;
  onUpdateModel: (field: string, value: unknown) => void;
  isGrid: boolean;
  onInputEnterPress?: () => void;
}

function mergeControlProps(
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

function bindField(
  field: DeclarativeFieldConfig,
  ctx: DeclarativeControlContext,
  extra: Record<string, unknown> = {}
) {
  const { field: key, placeholder, clearable = true } = field;
  const style = ctx.isGrid ? gridControlStyle : field.width ? { width: field.width } : undefined;

  return mergeControlProps(
    field,
    {
      'value': ctx.model[key],
      'onUpdate:value': (value: unknown) => ctx.onUpdateModel(key, value),
      placeholder,
      clearable,
      style,
      ...extra
    },
    ctx.isGrid
  );
}

/** 按字段 type 渲染对应 Naive 控件或 custom 内容 */
export function renderDeclarativeControl(
  field: DeclarativeFieldConfig,
  ctx: DeclarativeControlContext
) {
  const { type, icon } = field;

  switch (type) {
    case 'input':
      return (
        <NInput
          {...bindField(field, ctx, {
            onKeyup: (e: KeyboardEvent) => {
              if (e.key === 'Enter') ctx.onInputEnterPress?.();
            }
          })}
        >
          {{
            prefix: icon ? () => <div class={`${icon} text-16px text-gray-400`} /> : undefined
          }}
        </NInput>
      );

    case 'select':
      return (
        <NSelect
          {...bindField(field, ctx, {
            options: field.options ?? []
          })}
        />
      );

    case 'date':
      return <NDatePicker {...bindField(field, ctx, { type: 'date' })} />;

    case 'date-range':
      return <NDatePicker {...bindField(field, ctx, { type: 'daterange' })} />;

    case 'custom':
      return field.render ? field.render(ctx.model, ctx.onUpdateModel) : null;

    default:
      return null;
  }
}
