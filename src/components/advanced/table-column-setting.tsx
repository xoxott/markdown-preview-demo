import { type PropType, computed, defineComponent, nextTick, ref } from 'vue';
import { NButton, NCheckbox, NDivider, NIcon, NPopover, NScrollbar, NTooltip } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { GripVertical } from '@vicons/tabler';
import { VueDraggable } from 'vue-draggable-plus';
import type { TableColumnCheckFixed } from '@suga/hooks';
import { $t } from '@/locales';

/** vue-draggable-plus 的组件类型未声明 `update:modelValue`，TSX 需放宽才能绑定 v-model */
const ColumnDraggable = VueDraggable as any;

const FIXED_CYCLE: TableColumnCheckFixed[] = ['left', 'right', 'unFixed'];

/** 按当前固定状态，说明「再点一下图钉」会发生什么（与图标：当前态 + 操作预期一致） */
const COLUMN_PIN_CLICK_HINT: Record<TableColumnCheckFixed, App.I18n.I18nKey> = {
  unFixed: 'datatable.columnPinClickHint.unFixed',
  left: 'datatable.columnPinClickHint.left',
  right: 'datatable.columnPinClickHint.right'
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

/**
 * 与 SoybeanAdmin 演示一致（octicon）：
 *
 * - 未固定：pin-16
 * - 左固定：同一 pin-16 + rotate-270
 * - 右固定：pin-slash-16
 *
 * @see https://github.com/soybeanjs/soybean-admin/blob/main/src/components/advanced/table-column-setting.vue
 */
function renderPinIcon(fixed: TableColumnCheckFixed) {
  const cls = 'inline-block shrink-0 text-icon';
  if (fixed === 'unFixed') {
    return <Icon icon="octicon:pin-16" width={16} height={16} class={cls} />;
  }
  if (fixed === 'left') {
    return <Icon icon="octicon:pin-16" width={16} height={16} class={`${cls} rotate-270`} />;
  }
  return <Icon icon="octicon:pin-slash-16" width={16} height={16} class={cls} />;
}

/** 列显隐 + 拖拽排序 + 左/右/不固定切换（对齐 SoybeanAdmin `table-column-setting.vue`）。 */
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
        props.columns.map(column => (column.visible === false ? column : { ...column, checked }))
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

    /** 与 SoybeanAdmin 演示接近：窄宽、列表区约 200px 高，避免 min-w + 过大 max-h 把弹层撑满 */
    const popoverBodyStyle = { padding: '8px 10px' } as const;
    const listMaxHeight = 'min(200px, calc(100vh - 160px))';

    return () => (
      <NPopover
        placement="bottom-end"
        trigger="click"
        showArrow={false}
        contentStyle={popoverBodyStyle}
        onUpdateShow={onPopoverShowUpdate}
      >
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
            <div class="max-w-[min(240px,calc(100vw-32px))] w-max">
              <div class="h-32px flex-y-center rd-4px pl-10px hover:(bg-primary bg-opacity-20)">
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
                contentClass="pr-2px"
                style={{ maxHeight: listMaxHeight }}
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
                        'h-32px flex-y-center justify-between gap-4px',
                        item.visible === false ? 'hidden' : ''
                      ]}
                    >
                      <div class="h-full min-w-0 flex flex-y-center flex-1 rd-4px hover:(bg-primary bg-opacity-20)">
                        <span
                          class="column-setting__drag-handle mr-4px h-32px w-24px inline-flex flex-shrink-0 cursor-grab items-center justify-center rd-4px text-icon active:cursor-grabbing hover:(bg-primary bg-opacity-15)"
                          title={$t('common.dragSort')}
                        >
                          <NIcon size={16}>
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
                              <div class="max-w-240px text-13px leading-snug">
                                {$t(COLUMN_PIN_CLICK_HINT[f])}
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
