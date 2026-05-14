import { type PropType, defineComponent } from 'vue';
import { NButton, NPopconfirm, NSpace } from 'naive-ui';
import { $t } from '@/locales';
import TableColumnSetting from './table-column-setting';

/** 表格卡片顶栏右侧：新增 / 批量删除 / 刷新 + 列设置；与 `table-page` 的 `ActionBar` 职责相近，面向 naive `TableColumnCheck` 列模型 */
export default defineComponent({
  name: 'TableHeaderOperation',
  props: {
    itemAlign: {
      type: String as PropType<NaiveUI.Align | undefined>,
      default: undefined
    },
    disabledDelete: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    columns: {
      type: Array as PropType<NaiveUI.TableColumnCheck[]>,
      default: () => []
    }
  },
  emits: ['add', 'delete', 'refresh', 'update:columns'],
  setup(props, { emit, slots }) {
    const add = () => emit('add');
    const batchDelete = () => emit('delete');
    const refresh = () => emit('refresh');

    const defaultButtons = () => (
      <>
        <NButton size="small" ghost type="primary" onClick={add}>
          <div class="flex items-center gap-4px">
            <span class="i-carbon-add text-icon" />
            <span>{$t('common.add')}</span>
          </div>
        </NButton>
        <NPopconfirm onPositiveClick={batchDelete}>
          {{
            trigger: () => (
              <NButton size="small" ghost type="error" disabled={props.disabledDelete}>
                <div class="flex items-center gap-4px">
                  <span class="i-carbon-trash-can text-icon" />
                  <span>{$t('common.batchDelete')}</span>
                </div>
              </NButton>
            ),
            default: () => $t('common.confirmDelete')
          }}
        </NPopconfirm>
        <NButton size="small" onClick={refresh}>
          <div class="flex items-center gap-4px">
            <span
              class={['i-carbon-renew', 'text-icon', props.loading ? 'animate-spin' : ''].join(' ')}
            />
            <span>{$t('common.refresh')}</span>
          </div>
        </NButton>
      </>
    );

    return () => (
      <NSpace align={props.itemAlign} wrap justify="end" class="lt-sm:w-200px">
        {slots.prefix?.()}
        {slots.default?.() ?? defaultButtons()}
        <TableColumnSetting
          columns={props.columns}
          onUpdate:columns={(c: NaiveUI.TableColumnCheck[]) => emit('update:columns', c)}
        />
        {slots.suffix?.()}
      </NSpace>
    );
  }
});
