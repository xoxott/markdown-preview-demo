import { type PropType, defineComponent } from 'vue';
import { NButton, NIcon } from 'naive-ui';
import { ChevronDown, ChevronUp } from '@vicons/tabler';
import { $t } from '@/locales';
import IconAntDesignReloadOutlined from '~icons/ant-design/reload-outlined';
import IconUilSearch from '~icons/uil/search';

/** 检索条操作区：重置 → 搜索 → 展开/收起，由 DeclarativeForm `suffix` 插槽渲染在独立一行。 */
export default defineComponent({
  name: 'SearchFormSuffix',
  props: {
    /** 是否显示「搜索」 */
    showSearch: {
      type: Boolean,
      default: true
    },
    /** 是否显示「重置」 */
    showReset: {
      type: Boolean,
      default: true
    },
    /** 是否显示展开/收起（由 SearchBar 根据字段数量计算） */
    showCollapse: {
      type: Boolean,
      default: false
    },
    /** 当前是否为收起态 */
    collapsed: {
      type: Boolean,
      default: true
    },
    onSearch: {
      type: Function as PropType<() => void>,
      required: true
    },
    onReset: {
      type: Function as PropType<() => void>,
      required: true
    },
    onToggleCollapse: {
      type: Function as PropType<() => void>,
      required: true
    }
  },
  setup(props, { slots }) {
    return () => (
      <>
        {props.showReset ? (
          <NButton onClick={props.onReset}>
            {{
              icon: () => <IconAntDesignReloadOutlined class="text-16px" />,
              default: () => $t('common.reset')
            }}
          </NButton>
        ) : null}
        {props.showSearch ? (
          <NButton type="primary" onClick={props.onSearch}>
            {{
              icon: () => <IconUilSearch class="text-16px" />,
              default: () => $t('common.search')
            }}
          </NButton>
        ) : null}
        {props.showCollapse ? (
          <NButton text type="primary" iconPlacement="right" onClick={props.onToggleCollapse}>
            {{
              default: () =>
                props.collapsed ? $t('common.searchExpand') : $t('common.searchCollapse'),
              icon: () => (
                <NIcon size={14}>{props.collapsed ? <ChevronDown /> : <ChevronUp />}</NIcon>
              )
            }}
          </NButton>
        ) : null}
        {slots.default?.()}
      </>
    );
  }
});
