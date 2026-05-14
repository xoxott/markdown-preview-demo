import { type PropType, defineComponent } from 'vue';
import { NButton, NDatePicker, NForm, NFormItem, NInput, NSelect, NSpace } from 'naive-ui';
import { $t } from '@/locales';
import type { SearchFieldConfig } from './types';

/**
 * 声明式搜索条：根据 `SearchFieldConfig[]` 自动生成 naive 表单控件， 末尾固定「搜索 / 重置」按钮组；可通过 `showActionButtons`
 * 关闭按钮并自行在外层接管。
 */
export default defineComponent({
  name: 'SearchBar',
  props: {
    config: {
      type: Array as PropType<SearchFieldConfig[]>,
      required: true
    },
    /** 与 NForm / 各控件 value 绑定的扁平对象 */
    model: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    /** 点击「搜索」或输入框回车时触发（由父级决定发请求或 emit） */
    onSearch: {
      type: Function as PropType<() => void>,
      required: true
    },
    /** 点击「重置」时触发 */
    onReset: {
      type: Function as PropType<() => void>,
      required: true
    },
    /** 任一控件变更时回写字段值 */
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
    /** 为 false 时可把按钮挪到页眉等位置，仅保留筛选项 */
    showActionButtons: {
      type: Boolean,
      default: true
    }
  },
  setup(props, { slots }) {
    /** 将配置中的 componentProps 与受控 value 合并； value / onUpdate:value / disabled 由配置项显式覆盖，避免被外部误覆盖。 */
    const mergeControlProps = (fieldConfig: SearchFieldConfig, extra: Record<string, unknown>) => {
      const { componentProps = {} } = fieldConfig;
      return {
        ...componentProps,
        ...extra,
        disabled: fieldConfig.disabled ?? (componentProps as { disabled?: boolean }).disabled
      };
    };

    const renderField = (fieldConfig: SearchFieldConfig) => {
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
              if (e.key === 'Enter') {
                props.onSearch();
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
        inline
        labelPlacement={props.labelPlacement}
        showLabel={props.showLabel}
      >
        {slots.toolbarBefore?.()}
        {props.config.map((fieldConfig, index) => (
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
        {props.showActionButtons ? (
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
              {slots.actionsExtra?.()}
            </NSpace>
          </NFormItem>
        ) : null}
      </NForm>
    );
  }
});
