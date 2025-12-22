import { defineComponent, type PropType } from 'vue';
import { NBadge, NText } from 'naive-ui';
import type { BadgeRendererConfig } from '../types';

export default defineComponent({
  name: 'BadgeRenderer',
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
      type: Object as PropType<BadgeRendererConfig>,
      default: () => ({})
    }
  },
  setup(props) {
    return () => {
      const { row, field, config } = props;
      const { valueField, type = 'default', dot = false, max } = config;

      const value = valueField ? row[valueField] : row[field];
      const content = row[field];

      if (dot) {
        return (
          <NBadge dot type={type}>
            <NText>{content}</NText>
          </NBadge>
        );
      }

      return (
        <NBadge value={value} type={type} max={max}>
          <NText>{content}</NText>
        </NBadge>
      );
    };
  }
});

