import { defineComponent, type PropType } from 'vue';
import { NTag, NSpace, NPopover, NBadge, NText } from 'naive-ui';
import type { TagRendererConfig } from '../types';

export default defineComponent({
  name: 'TagRenderer',
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
      type: Object as PropType<TagRendererConfig>,
      default: () => ({})
    }
  },
  setup(props) {
    return () => {
      const { row, field, config } = props;
      const value = row[field];

      if (!value) {
        return <NText depth={3}>-</NText>;
      }

      const {
        type = 'simple',
        maxShow = 1,
        tagType = 'info',
        round = true,
        fieldMap = { label: 'name', value: 'id', type: 'type' }
      } = config;

      // Handle array of objects (like roles)
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return <NText depth={3}>-</NText>;
        }

        if (type === 'simple' || value.length === 1) {
          return (
            <NSpace size="small">
              {value.map((item: any, index: number) => {
                const label = typeof item === 'object' ? item[fieldMap.label] : item;
                const itemType = typeof item === 'object' && fieldMap.type ? item[fieldMap.type] : tagType;
                return (
                  <NTag key={index} type={itemType} size="small" round={round}>
                    {label}
                  </NTag>
                );
              })}
            </NSpace>
          );
        }

        if (type === 'badge') {
          const firstItem = value[0];
          const label = typeof firstItem === 'object' ? firstItem[fieldMap.label] : firstItem;
          return (
            <NBadge value={value.length} type={tagType}>
              <NTag type={tagType} size="small" round={round}>
                {label}
              </NTag>
            </NBadge>
          );
        }

        if (type === 'popover') {
          const displayItems = value.slice(0, maxShow);
          return (
            <NPopover trigger="hover" placement="top">
              {{
                trigger: () => (
                  <NSpace size="small">
                    {displayItems.map((item: any, index: number) => {
                      const label = typeof item === 'object' ? item[fieldMap.label] : item;
                      const itemType = typeof item === 'object' && fieldMap.type ? item[fieldMap.type] : tagType;
                      return (
                        <NTag key={index} type={itemType} size="small" round={round}>
                          {label}
                        </NTag>
                      );
                    })}
                    {value.length > maxShow && (
                      <NTag type="default" size="small" round={round}>
                        +{value.length - maxShow}
                      </NTag>
                    )}
                  </NSpace>
                ),
                default: () => (
                  <NSpace size="small" vertical>
                    {value.map((item: any, index: number) => {
                      const label = typeof item === 'object' ? item[fieldMap.label] : item;
                      const itemType = typeof item === 'object' && fieldMap.type ? item[fieldMap.type] : tagType;
                      return (
                        <NTag key={index} type={itemType} size="small" round={round}>
                          {label}
                        </NTag>
                      );
                    })}
                  </NSpace>
                )
              }}
            </NPopover>
          );
        }
      }

      // Handle single value
      return (
        <NTag type={tagType} size="small" round={round}>
          {value}
        </NTag>
      );
    };
  }
});

