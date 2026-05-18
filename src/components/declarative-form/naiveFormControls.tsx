import {
  NAutoComplete,
  NCascader,
  NCheckbox,
  NCheckboxGroup,
  NColorPicker,
  NDatePicker,
  NDynamicInput,
  NInput,
  NInputNumber,
  NRadioGroup,
  NRate,
  NSelect,
  NSlider,
  NSpace,
  NSwitch,
  NTimePicker,
  NTransfer,
  NTreeSelect,
  NUpload
} from 'naive-ui';
import type { DeclarativeFieldConfig } from './types';
import type { DeclarativeControlContext } from './controlContext';
import { bindCheckedField, bindField, bindFileListField } from './controlContext';
import { registerDeclarativeControl } from './controlRegistry';

function fieldOptions(field: DeclarativeFieldConfig) {
  return field.options ?? [];
}

function withEnter(ctx: DeclarativeControlContext) {
  return {
    onKeyup: (e: KeyboardEvent) => {
      if (e.key === 'Enter') ctx.onInputEnterPress?.();
    }
  };
}

// —— 文本输入 ——
registerDeclarativeControl('input', (field, ctx) => (
  <NInput {...bindField(field, ctx, withEnter(ctx))}>
    {{
      prefix: field.icon ? () => <div class={`${field.icon} text-16px text-gray-400`} /> : undefined
    }}
  </NInput>
));

registerDeclarativeControl('textarea', (field, ctx) => (
  <NInput {...bindField(field, ctx, { type: 'textarea' })} />
));

registerDeclarativeControl('password', (field, ctx) => (
  <NInput {...bindField(field, ctx, { type: 'password', showPasswordOn: 'click' })} />
));

registerDeclarativeControl('input-number', (field, ctx) => (
  <NInputNumber {...bindField(field, ctx)} />
));

// —— 选择类 ——
registerDeclarativeControl('select', (field, ctx) => (
  <NSelect {...bindField(field, ctx, { options: fieldOptions(field) })} />
));

registerDeclarativeControl('auto-complete', (field, ctx) => (
  <NAutoComplete {...bindField(field, ctx, { options: fieldOptions(field) })} />
));

registerDeclarativeControl('cascader', (field, ctx) => (
  <NCascader {...bindField(field, ctx, { options: fieldOptions(field) })} />
));

registerDeclarativeControl('tree-select', (field, ctx) => (
  <NTreeSelect {...bindField(field, ctx, { options: fieldOptions(field) })} />
));

// —— 日期 / 时间 ——
function registerDatePicker(type: string, pickerType: string) {
  registerDeclarativeControl(type, (field, ctx) => (
    <NDatePicker {...bindField(field, ctx, { type: pickerType })} />
  ));
}

registerDatePicker('date', 'date');
registerDatePicker('datetime', 'datetime');
registerDatePicker('date-range', 'daterange');
registerDatePicker('datetime-range', 'datetimerange');
registerDatePicker('month', 'month');
registerDatePicker('year', 'year');
registerDatePicker('quarter', 'quarter');
registerDatePicker('week', 'week');

function registerTimePicker(type: string, pickerType: 'time' | 'timerange') {
  registerDeclarativeControl(type, (field, ctx) => (
    <NTimePicker {...bindField(field, ctx, { type: pickerType })} />
  ));
}

registerTimePicker('time', 'time');
registerTimePicker('time-range', 'timerange');

// —— 布尔 / 成组选择 ——
registerDeclarativeControl('switch', (field, ctx) => <NSwitch {...bindCheckedField(field, ctx)} />);

registerDeclarativeControl('checkbox', (field, ctx) => (
  <NCheckbox {...bindCheckedField(field, ctx)} />
));

registerDeclarativeControl('checkbox-group', (field, ctx) => (
  <NCheckboxGroup {...bindField(field, ctx, {}, { passClearable: false })}>
    <NSpace>
      {fieldOptions(field).map(opt => (
        <NCheckbox key={String(opt.value)} value={opt.value} label={opt.label} />
      ))}
    </NSpace>
  </NCheckboxGroup>
));

registerDeclarativeControl('radio-group', (field, ctx) => (
  <NRadioGroup
    {...bindField(field, ctx, { options: fieldOptions(field) }, { passClearable: false })}
  />
));

// —— 其它 ——
registerDeclarativeControl('slider', (field, ctx) => <NSlider {...bindField(field, ctx)} />);

registerDeclarativeControl('rate', (field, ctx) => <NRate {...bindField(field, ctx)} />);

registerDeclarativeControl('color-picker', (field, ctx) => (
  <NColorPicker {...bindField(field, ctx)} />
));

registerDeclarativeControl('transfer', (field, ctx) => (
  <NTransfer
    {...bindField(field, ctx, { options: fieldOptions(field) }, { passClearable: false })}
  />
));

registerDeclarativeControl('dynamic-input', (field, ctx) => (
  <NDynamicInput {...bindField(field, ctx, {}, { passClearable: false })} />
));

registerDeclarativeControl('upload', (field, ctx) => (
  <NUpload {...bindFileListField(field, ctx)} />
));

registerDeclarativeControl('custom', (field, ctx) =>
  field.render ? field.render(ctx.model, ctx.onUpdateModel) : null
);
