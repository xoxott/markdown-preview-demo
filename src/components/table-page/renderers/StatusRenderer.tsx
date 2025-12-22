import { defineComponent, type PropType } from 'vue';
import { NSwitch, NTag } from 'naive-ui';
import type { StatusRendererConfig } from '../types';

export default defineComponent({
  name: 'StatusRenderer',
  props: {
    row: {
      type: Object as PropType<Record<string, any>>,
      required: true
    },
    field: {
      type: String,
      required: true
    },
    config: {
      type: Object as PropType<StatusRendererConfig>,
      required: true
    }
  },
  setup(props) {
    return () => {
      const { row, field, config } = props;
      const value = row[field];

      if (config.type === 'switch') {
        return (
          <NSwitch
            value={value}
            onUpdateValue={(newValue) => {
              if (config.onChange) {
                config.onChange(row, newValue);
              }
            }}
            size="small"
          />
        );
      }

      // tag type
      const {
        trueLabel = '启用',
        falseLabel = '禁用',
        trueType = 'success',
        falseType = 'default'
      } = config;

      return (
        <NTag type={value ? trueType : falseType} size="small" round>
          {value ? trueLabel : falseLabel}
        </NTag>
      );
    };
  }
});

