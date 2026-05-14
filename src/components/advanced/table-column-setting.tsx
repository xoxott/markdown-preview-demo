import { type PropType, defineComponent } from 'vue';
import { NButton, NCheckbox, NPopover } from 'naive-ui';
import { VueDraggable } from 'vue-draggable-plus';
import { $t } from '@/locales';

/** vue-draggable-plus 的组件类型未声明 `update:modelValue`，TSX 需放宽才能绑定 v-model */
const ColumnDraggable = VueDraggable as any;

function renderTitle(item: NaiveUI.TableColumnCheck) {
  const t = item.title;
  if (typeof t === 'function') {
    return (t as () => unknown)();
  }
  return t;
}

/** naive DataTable 列显隐 + 拖拽排序（与 `NaiveUI.TableColumnCheck[]` 配合使用） */
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
    const patchChecked = (index: number, checked: boolean) => {
      const next = props.columns.map((c, i) => (i === index ? { ...c, checked } : c));
      emit('update:columns', next);
    };

    const onDragUpdate = (next: NaiveUI.TableColumnCheck[]) => {
      emit('update:columns', next);
    };

    return () => (
      <NPopover placement="bottom-end" trigger="click">
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
            <ColumnDraggable
              modelValue={props.columns}
              onUpdate:modelValue={onDragUpdate}
              animation={150}
              filter=".none_draggable"
            >
              {props.columns.map((item, index) => (
                <div
                  key={String(item.key)}
                  class="h-36px flex-y-center rd-4px hover:(bg-primary bg-opacity-20)"
                >
                  <span class="i-carbon-move mr-8px h-full cursor-move text-icon" />
                  <NCheckbox
                    class="none_draggable flex-1"
                    checked={item.checked}
                    onUpdate:checked={(v: boolean) => patchChecked(index, v)}
                  >
                    {renderTitle(item)}
                  </NCheckbox>
                </div>
              ))}
            </ColumnDraggable>
          )
        }}
      </NPopover>
    );
  }
});
