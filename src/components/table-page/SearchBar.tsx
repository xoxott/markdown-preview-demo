import { type PropType, computed, defineComponent, nextTick, onMounted, ref, watch } from 'vue';
import { NButton, NFormItem, NSpace } from 'naive-ui';
import { useResizeObserver } from '@vueuse/core';
import { DeclarativeForm } from '@/components/declarative-form';
import { $t } from '@/locales';
import type { SearchFieldConfig } from './types';

/**
 * 表格筛选条：在 DeclarativeForm 之上提供「搜索 / 重置」按钮组与回车提交； 可通过 `showActionButtons` 关闭按钮并在外层接管。 开启
 * `collapsible` 后按「行数 × 行高」裁剪高度，内容超出时出现展开 / 收起。
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
    },
    collapsible: {
      type: Boolean,
      default: false
    },
    /** 收起时保留的大致行数（与 collapsedRowHeightPx 相乘为 max-height），最小 1 */
    collapsedRows: {
      type: Number,
      default: 1
    },
    /** 收起时每行估算高度（px），用于 max-height */
    collapsedRowHeightPx: {
      type: Number,
      default: 52
    },
    /** 为 true 时初始为展开态 */
    defaultExpanded: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { slots }) {
    const clipRef = ref<HTMLElement | null>(null);
    const expanded = ref(props.defaultExpanded);
    const needsToggle = ref(false);
    /** 展开态 max-height，用于 CSS 过渡（略大于内容高度） */
    const expandedMaxPx = ref(4000);

    const maxCollapsedPx = computed(() => {
      const rows = Math.max(1, Math.floor(props.collapsedRows));
      const rowH = Math.max(32, props.collapsedRowHeightPx);
      return rows * rowH;
    });

    const scheduleMeasure = () => {
      nextTick(() => {
        if (!props.collapsible || !clipRef.value) {
          needsToggle.value = false;
          return;
        }
        const el = clipRef.value;
        const full = el.scrollHeight;
        expandedMaxPx.value = Math.min(12000, Math.ceil(full + 32));
        needsToggle.value = full > maxCollapsedPx.value + 2;
      });
    };

    useResizeObserver(clipRef, scheduleMeasure);

    watch(
      () => ({
        collapsible: props.collapsible,
        collapsedRows: props.collapsedRows,
        collapsedRowHeightPx: props.collapsedRowHeightPx,
        config: props.config
      }),
      scheduleMeasure,
      { deep: true, flush: 'post' }
    );

    onMounted(scheduleMeasure);

    watch(
      () => props.defaultExpanded,
      v => {
        expanded.value = v;
      }
    );

    const clipClass = computed(() =>
      props.collapsible
        ? 'overflow-hidden transition-[max-height] duration-300 ease-in-out'
        : ''
    );

    const clipStyle = computed(() => {
      if (!props.collapsible) return undefined;
      if (expanded.value) {
        return { maxHeight: `${expandedMaxPx.value}px` };
      }
      return { maxHeight: `${maxCollapsedPx.value}px` };
    });

    const toggleExpand = () => {
      expanded.value = !expanded.value;
      scheduleMeasure();
    };

    return () => {
      const form = (
        <DeclarativeForm
          fields={props.config}
          model={props.model}
          onUpdateModel={props.onUpdateModel}
          labelPlacement={props.labelPlacement}
          showLabel={props.showLabel}
          inline
          onInputEnterPress={props.onSearch}
        >
          {{
            toolbarBefore: slots.toolbarBefore,
            toolbarAfter: slots.toolbarAfter,
            suffix: () =>
              props.showActionButtons ? (
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
              ) : null
          }}
        </DeclarativeForm>
      );

      return (
        <div class="w-full min-w-0">
          <div ref={clipRef} class={clipClass.value} style={clipStyle.value}>
            {form}
          </div>
          {props.collapsible && needsToggle.value ? (
            <div class="flex justify-end pt-6px">
              <NButton text type="primary" size="small" onClick={toggleExpand}>
                <div class="flex items-center gap-4px">
                  <div
                    class={
                      expanded.value ? 'i-carbon-chevron-up text-14px' : 'i-carbon-chevron-down text-14px'
                    }
                  />
                  <span>
                    {expanded.value ? $t('common.searchCollapse') : $t('common.searchExpand')}
                  </span>
                </div>
              </NButton>
            </div>
          ) : null}
        </div>
      );
    };
  }
});
