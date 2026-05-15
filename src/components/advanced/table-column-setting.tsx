import { computed, defineComponent, nextTick, ref, type PropType } from 'vue';
import { NButton, NCheckbox, NDivider, NIcon, NPopover, NScrollbar, NTooltip } from 'naive-ui';
import { GripVertical, Pin, Pinned, PinnedOff } from '@vicons/tabler';
import { VueDraggable } from 'vue-draggable-plus';
import type { TableColumnCheckFixed } from '@suga/hooks';
import { $t } from '@/locales';

/** vue-draggable-plus 的组件类型未声明 `update:modelValue`，TSX 需放宽才能绑定 v-model */
const ColumnDraggable = VueDraggable as any;

const FIXED_CYCLE: TableColumnCheckFixed[] = ['left', 'right', 'unFixed'];

/** 与 SoybeanAdmin 一致：tooltip 文案表示「下一次点击」将切换到的目标 */
const TOOLTIP_BY_CURRENT: Record<TableColumnCheckFixed, App.I18n.I18nKey> = {
  left: 'datatable.fixed.right',
  right: 'datatable.fixed.unFixed',
  unFixed: 'datatable.fixed.left'
};

const FIXED_CURRENT_I18N: Record<TableColumnCheckFixed, App.I18n.I18nKey> = {
  unFixed: 'datatable.fixedCurrent.unFixed',
  left: 'datatable.fixedCurrent.left',
  right: 'datatable.fixedCurrent.right'
};

function normalizeFixed(f: TableColumnCheckFixed | undefined): TableColumnCheckFixed {
  return f === 'left' || f === 'right' || f === 'unFixed' ? f : 'unFixed';
}

function renderTitle(item: NaiveUI.TableColumnCheck) {
  const t = item.title;
  if (typeof t === 'function') {
    return (t as () => unknown)();
  }
  return t;
}

/** 与 SoybeanAdmin 一致：未固定=空心图钉；左固定=实心图钉（旋转）；右固定=取消固定样式图钉 */
function renderPinIcon(fixed: TableColumnCheckFixed) {
  if (fixed === 'unFixed') {
    return (
      <NIcon size={18} class="text-icon">
        <Pin />
      </NIcon>
    );
  }
  if (fixed === 'left') {
    return (
      <NIcon size={18} class="text-icon rotate-270">
        <Pinned />
      </NIcon>
    );
  }
  return (
    <NIcon size={18} class="text-icon">
      <PinnedOff />
    </NIcon>
  );
}

/**
 * 列显隐 + 拖拽排序 + 左/右/不固定切换（对齐 SoybeanAdmin `table-column-setting.vue`）。
 */
export default defineComponent({
  name: 'TableColumnSetting',
  props: {
    columns: {
      type: Array as PropType<NaiveUI.TableColumnCheck[]>,
      required: true
    }
  },
  emits: ['update:columns'],
  setup(props, { emit }) {
    /** Popover 内容挂载到 body 且首帧可能不可见，Sortable 需在打开后重建，否则 handle 拖拽不生效 */
    const draggableMountKey = ref(0);

    const visibleStats = computed(() => {
      let total = 0;
      let checked = 0;
      props.columns.forEach(column => {
        if (column.visible === false) return;
        total += 1;
        if (column.checked) checked += 1;
      });
      return { total, checked };
    });

    const selectAllChecked = computed(
      () => visibleStats.value.total > 0 && visibleStats.value.checked === visibleStats.value.total
    );

    const selectAllIndeterminate = computed(() => {
      const { total, checked } = visibleStats.value;
      return checked > 0 && checked < total;
    });

    const patchColumns = (next: NaiveUI.TableColumnCheck[]) => {
      emit('update:columns', next);
    };

    const toggleSelectAll = (checked: boolean) => {
      patchColumns(
        props.columns.map(column =>
          column.visible === false ? column : { ...column, checked }
        )
      );
    };

    const patchChecked = (index: number, checked: boolean) => {
      const next = props.columns.map((c, i) => (i === index ? { ...c, checked } : c));
      patchColumns(next);
    };

    const onDragUpdate = (next: NaiveUI.TableColumnCheck[]) => {
      patchColumns(next);
    };

    const handleFixed = (index: number) => {
      const next = props.columns.map((c, i) => {
        if (i !== index) return c;
        const cur = normalizeFixed(c.fixed);
        const idx = FIXED_CYCLE.indexOf(cur);
        const nextFixed = FIXED_CYCLE[idx === FIXED_CYCLE.length - 1 ? 0 : idx + 1];
        return { ...c, fixed: nextFixed };
      });
      patchColumns(next);
    };

    const onPopoverShowUpdate = (show: boolean) => {
      if (show) {
        nextTick(() => {
          draggableMountKey.value += 1;
        });
      }
    };

    return () => (
      <NPopover placement="bottom-end" trigger="click" onUpdateShow={onPopoverShowUpdate}>
        {{
          trigger: () => (
            <NButton size="small">
              <div class="flex items-center gap-4px">
                <span class="i-carbon-settings text-icon" />
                <span>{$t('common.columnSetting')}</span>
              </div>
            </NButton>
          ),
          default: () => (
            <div class="min-w-280px">
              <div class="h-36px flex-y-center rd-4px pl-26px hover:(bg-primary bg-opacity-20)">
                <NCheckbox
                  class="flex-1"
                  checked={selectAllChecked.value}
                  indeterminate={selectAllIndeterminate.value}
                  disabled={visibleStats.value.total === 0}
                  onUpdate:checked={toggleSelectAll}
                >
                  {$t('common.selectAll')}
                </NCheckbox>
              </div>
              <NDivider class="!my-4px" />
              <NScrollbar
                trigger="hover"
                yPlacement="right"
                contentClass="pr-4px"
                style={{ maxHeight: 'min(320px, calc(100vh - 200px))' }}
              >
                <ColumnDraggable
                  key={draggableMountKey.value}
                  modelValue={props.columns}
                  onUpdate:modelValue={onDragUpdate}
                  animation={150}
                  handle=".column-setting__drag-handle"
                  filter=".none_draggable"
                  direction="vertical"
                >
                  {props.columns.map((item, index) => (
                  <div
                    key={String(item.key)}
                    class={[
                      'h-36px flex-y-center justify-between gap-6px',
                      item.visible === false ? 'hidden' : ''
                    ]}
                  >
                    <div class="h-full min-w-0 flex flex-1 flex-y-center rd-4px hover:(bg-primary bg-opacity-20)">
                      <span
                        class="column-setting__drag-handle mr-6px inline-flex h-36px w-28px flex-shrink-0 cursor-grab items-center justify-center rd-4px text-icon hover:(bg-primary bg-opacity-15) active:cursor-grabbing"
                        title={$t('common.dragSort')}
                      >
                        <NIcon size={18}>
                          <GripVertical />
                        </NIcon>
                      </span>
                      <NCheckbox
                        class="none_draggable min-w-0 flex-1"
                        checked={item.checked}
                        onUpdate:checked={(v: boolean) => patchChecked(index, v)}
                      >
                        {renderTitle(item)}
                      </NCheckbox>
                    </div>
                    <NTooltip>
                      {{
                        trigger: () => (
                          <NButton
                            quaternary
                            circle
                            size="small"
                            disabled={!item.checked}
                            focusable={false}
                            class="none_draggable flex-shrink-0"
                            onClick={() => handleFixed(index)}
                          >
                            {renderPinIcon(normalizeFixed(item.fixed))}
                          </NButton>
                        ),
                        default: () => {
                          const f = normalizeFixed(item.fixed);
                          return (
                            <div class="flex max-w-260px flex-col gap-6px py-4px">
                              <div class="font-500">{$t(FIXED_CURRENT_I18N[f])}</div>
                              <div class="text-12px opacity-75">
                                {$t('common.nextStep')}: {$t(TOOLTIP_BY_CURRENT[f])}
                              </div>
                            </div>
                          );
                        }
                      }}
                    </NTooltip>
                  </div>
                  ))}
                </ColumnDraggable>
              </NScrollbar>
            </div>
          )
        }}
      </NPopover>
    );
  }
});
