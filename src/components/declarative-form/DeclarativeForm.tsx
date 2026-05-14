import { type PropType, defineComponent } from 'vue';
import { NDatePicker, NForm, NFormItem, NInput, NSelect } from 'naive-ui';
import type { DeclarativeFieldConfig } from './types';

/**
 * 配置驱动的 naive-ui 行内/块级表单：仅负责字段渲染与 model 回写， 不包含业务按钮；搜索条、弹窗筛选、设置面板等均可复用。
 */
export default defineComponent({
  name: 'DeclarativeForm',
  props: {
    fields: {
      type: Array as PropType<DeclarativeFieldConfig[]>,
      required: true
    },
    model: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    onUpdateModel: {
      type: Function as PropType<(field: string, value: any) => void>,
      required: true
    },
    labelPlacement: {
      type: String as PropType<'left' | 'top'>,
      default: 'left'
    },
    showLabel: {
      type: Boolean,
      default: false
    },
    inline: {
      type: Boolean,
      default: true
    },
    onInputEnterPress: {
      type: Function as PropType<() => void>,
      default: undefined
    }
  },
  setup(props, { slots }) {
    const mergeControlProps = (fieldConfig: DeclarativeFieldConfig, extra: Record<string, unknown>) => {
      const { componentProps = {} } = fieldConfig;
      return {
        ...componentProps,
        ...extra,
        disabled: fieldConfig.disabled ?? (componentProps as { disabled?: boolean }).disabled
      };
    };

    const renderField = (fieldConfig: DeclarativeFieldConfig) => {
      const { type, field, placeholder, icon, width, options, clearable = true } = fieldConfig;
      const styleWidth = width ? { width } : undefined;

      switch (type) {
        case 'input': {
          const bind = mergeControlProps(fieldConfig, {
            'value': props.model[field],
            'onUpdate:value': (value: any) => props.onUpdateModel(field, value),
            placeholder,
            clearable,
            'style': styleWidth,
            'onKeyup': (e: KeyboardEvent) => {
              if (e.key === 'Enter' && props.onInputEnterPress) {
                props.onInputEnterPress();
              }
            }
          });
          return (
            <NInput {...bind}>
              {{
                prefix: icon ? () => <div class={`${icon} text-16px text-gray-400`} /> : undefined
              }}
            </NInput>
          );
        }

        case 'select': {
          const bind = mergeControlProps(fieldConfig, {
            'value': props.model[field],
            'onUpdate:value': (value: any) => props.onUpdateModel(field, value),
            placeholder,
            clearable,
            'options': options || [],
            'style': styleWidth
          });
          return <NSelect {...bind} />;
        }

        case 'date': {
          const bind = mergeControlProps(fieldConfig, {
            'value': props.model[field],
            'onUpdate:value': (value: any) => props.onUpdateModel(field, value),
            placeholder,
            clearable,
            'style': styleWidth,
            'type': 'date'
          });
          return <NDatePicker {...bind} />;
        }

        case 'date-range': {
          const bind = mergeControlProps(fieldConfig, {
            'value': props.model[field],
            'onUpdate:value': (value: any) => props.onUpdateModel(field, value),
            placeholder,
            clearable,
            'style': styleWidth,
            'type': 'daterange'
          });
          return <NDatePicker {...bind} />;
        }

        case 'custom':
          return fieldConfig.render ? fieldConfig.render(props.model, props.onUpdateModel) : null;

        default:
          return null;
      }
    };

    return () => (
      <NForm
        model={props.model}
        inline={props.inline}
        labelPlacement={props.labelPlacement}
        showLabel={props.showLabel}
      >
        {slots.toolbarBefore?.()}
        {props.fields.map((fieldConfig, index) => (
          <NFormItem
            key={fieldConfig.field || index}
            path={fieldConfig.field}
            label={
              fieldConfig.showLabel !== false && fieldConfig.label ? fieldConfig.label : undefined
            }
            class="!mb-0"
          >
            {renderField(fieldConfig)}
          </NFormItem>
        ))}
        {slots.toolbarAfter?.()}
        {slots.suffix?.()}
      </NForm>
    );
  }
});
