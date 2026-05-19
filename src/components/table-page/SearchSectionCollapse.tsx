import { defineComponent, ref, watch } from 'vue';
import { NCollapse, NCollapseItem } from 'naive-ui';
import { $t } from '@/locales';

export const SEARCH_SECTION_COLLAPSE_NAME = 'search';

/** 包裹检索区整块内容，用 Naive `NCollapse` 折叠/展开以节省纵向空间。 与 SearchBar 内栅格「展开/收起」无关。 */
export default defineComponent({
  name: 'SearchSectionCollapse',
  props: {
    /** 折叠面板标题；默认 i18n `common.searchSection` */
    title: {
      type: String,
      default: undefined
    },
    /** 初始是否展开整块检索区 */
    defaultExpanded: {
      type: Boolean,
      default: true
    }
  },
  setup(props, { slots }) {
    const expandedNames = ref<string[]>(
      props.defaultExpanded ? [SEARCH_SECTION_COLLAPSE_NAME] : []
    );

    watch(
      () => props.defaultExpanded,
      expanded => {
        expandedNames.value = expanded ? [SEARCH_SECTION_COLLAPSE_NAME] : [];
      }
    );

    return () => (
      <NCollapse
        class="table-page-search-section flex-shrink-0"
        expandedNames={expandedNames.value}
        onUpdateExpandedNames={(names: string[]) => {
          expandedNames.value = names;
        }}
      >
        <NCollapseItem
          title={props.title ?? $t('common.searchSection')}
          name={SEARCH_SECTION_COLLAPSE_NAME}
        >
          {slots.default?.()}
        </NCollapseItem>
      </NCollapse>
    );
  }
});
