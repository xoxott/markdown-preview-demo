import { type PropType, defineComponent } from 'vue';
import { NButton, NIcon } from 'naive-ui';
import { ChevronDown, ChevronUp, Refresh, Search } from '@vicons/tabler';
import { $t } from '@/locales';

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
    /** 是否显示展开/收起（超出 `collapsedRows` 行时由 SearchBar 计算） */
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
              icon: () => (
                <NIcon size={16}>
                  <Refresh />
                </NIcon>
              ),
              default: () => $t('common.reset')
            }}
          </NButton>
        ) : null}
        {props.showSearch ? (
          <NButton type="primary" onClick={props.onSearch}>
            {{
              icon: () => (
                <NIcon size={16}>
                  <Search />
                </NIcon>
              ),
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
