import { defineComponent, type PropType } from 'vue';
import { NText, NEllipsis } from 'naive-ui';
import type { TextRendererConfig } from '../types';

export default defineComponent({
  name: 'TextRenderer',
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
      type: Object as PropType<TextRendererConfig>,
      default: () => ({})
    }
  },
  setup(props) {
    return () => {
      const { row, field, config } = props;
      const value = row[field];

      if (value === null || value === undefined || value === '') {
        return <NText depth={3}>{config.emptyText || '-'}</NText>;
      }

      const { strong, depth, ellipsis, lineClamp } = config;

      const textContent = String(value);

      if (ellipsis || lineClamp) {
        return (
          <NEllipsis lineClamp={lineClamp}>
            <NText strong={strong} depth={depth}>
              {textContent}
            </NText>
          </NEllipsis>
        );
      }

      return (
        <NText strong={strong} depth={depth}>
          {textContent}
        </NText>
      );
    };
  }
});

