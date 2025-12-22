import { defineComponent, type PropType } from 'vue';
import { NForm, NFormItem, NInput, NSelect, NDatePicker, NButton, NSpace } from 'naive-ui';
import { $t } from '@/locales';
import type { SearchBarProps, SearchFieldConfig } from './types';

export default defineComponent({
  name: 'SearchBar',
  props: {
    config: {
      type: Array as PropType<SearchFieldConfig[]>,
      required: true
    },
    model: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    onSearch: {
      type: Function as PropType<() => void>,
      required: true
    },
    onReset: {
      type: Function as PropType<() => void>,
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
    }
  },
  setup(props) {
    const renderField = (fieldConfig: SearchFieldConfig) => {
      const { type, field, placeholder, icon, width, options, clearable = true } = fieldConfig;

      const commonProps = {
        value: props.model[field],
        'onUpdate:value': (value: any) => props.onUpdateModel(field, value),
        placeholder,
        clearable,
        style: width ? { width } : undefined
      };

      switch (type) {
        case 'input':
          return (
            <NInput
              {...commonProps}
              onKeyup={(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  props.onSearch();
                }
              }}
            >
              {{
                prefix: icon ? () => <div class={`${icon} text-16px text-gray-400`} /> : undefined
              }}
            </NInput>
          );

        case 'select':
          return (
            <NSelect
              {...commonProps}
              options={options || []}
            />
          );

        case 'date':
          return (
            <NDatePicker
              {...commonProps}
              type="date"
            />
          );

        case 'date-range':
          return (
            <NDatePicker
              {...commonProps}
              type="daterange"
            />
          );

        case 'custom':
          return fieldConfig.render ? fieldConfig.render(props.model, props.onUpdateModel) : null;

        default:
          return null;
      }
    };

    return () => (
      <NForm
        model={props.model}
        inline
        labelPlacement={props.labelPlacement}
        showLabel={props.showLabel}
      >
        {props.config.map((fieldConfig, index) => (
          <NFormItem
            key={fieldConfig.field || index}
            path={fieldConfig.field}
            label={fieldConfig.showLabel !== false && fieldConfig.label ? fieldConfig.label : undefined}
            class="!mb-0"
          >
            {renderField(fieldConfig)}
          </NFormItem>
        ))}
        <NFormItem class="!mb-0">
          <NSpace size="small">
            <NButton type="primary" onClick={props.onSearch}>
              <div class="flex items-center gap-4px">
                <div class="i-carbon-search text-16px" />
                <span>{$t('common.search')}</span>
              </div>
            </NButton>
            <NButton onClick={props.onReset}>
              <div class="flex items-center gap-4px">
                <div class="i-carbon-reset text-16px" />
                <span>{$t('common.reset')}</span>
              </div>
            </NButton>
          </NSpace>
        </NFormItem>
      </NForm>
    );
  }
});

