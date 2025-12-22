import { defineComponent, type PropType } from 'vue';
import { NCard } from 'naive-ui';
import type { PaginationProps } from 'naive-ui';
import type { SearchFieldConfig, ActionBarConfig, TableColumnConfig } from './types';
import SearchBar from './SearchBar';
import ActionBar from './ActionBar';
import DataTable from './DataTable';

export default defineComponent({
  name: 'TablePage',
  props: {
    searchConfig: {
      type: Array as PropType<SearchFieldConfig[]>,
      default: undefined
    },
    actionConfig: {
      type: Object as PropType<ActionBarConfig>,
      default: undefined
    },
    columns: {
      type: Array as PropType<TableColumnConfig[]>,
      required: true
    },
    data: {
      type: Array as PropType<any[]>,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    pagination: {
      type: Object as PropType<PaginationProps>,
      default: undefined
    },
    selectedKeys: {
      type: Array as PropType<(string | number)[]>,
      default: () => []
    },
    rowKey: {
      type: [String, Function] as PropType<string | ((row: any) => string | number)>,
      default: 'id'
    },
    onSearch: {
      type: Function as PropType<(searchForm: Record<string, any>) => void>,
      default: undefined
    },
    onReset: {
      type: Function as PropType<() => void>,
      default: undefined
    },
    onUpdateSelectedKeys: {
      type: Function as PropType<(keys: (string | number)[]) => void>,
      default: undefined
    },
    scrollX: {
      type: Number,
      default: undefined
    },
    showIndex: {
      type: Boolean,
      default: true
    },
    showSelection: {
      type: Boolean,
      default: true
    },
    striped: {
      type: Boolean,
      default: true
    },
    size: {
      type: String as PropType<'small' | 'medium' | 'large'>,
      default: 'small'
    },
    bordered: {
      type: Boolean,
      default: false
    },
    maxHeight: {
      type: [String, Number] as PropType<string | number>,
      default: '100%'
    },
    class: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    return () => (
      <div class={`h-full flex flex-col gap-16px overflow-hidden p-16px ${props.class}`}>
        {/* Search Bar */}
        {props.searchConfig && props.searchConfig.length > 0 && (
          <NCard class="flex-shrink-0" bordered={false}>
            <SearchBar
              config={props.searchConfig}
              model={{}}
              onSearch={() => props.onSearch?.({})}
              onReset={() => props.onReset?.()}
              onUpdateModel={() => {}}
            />
          </NCard>
        )}

        {/* Action Bar */}
        {props.actionConfig && (
          <NCard class="flex-shrink-0" bordered={false}>
            <ActionBar
              config={props.actionConfig}
              selectedKeys={props.selectedKeys}
              total={props.pagination?.itemCount || props.data.length}
            />
          </NCard>
        )}

        {/* Data Table */}
        <NCard class="flex-1 overflow-hidden" bordered={false} contentStyle={{ height: '100%', padding: 0 }}>
          <DataTable
            columns={props.columns}
            data={props.data}
            loading={props.loading}
            pagination={props.pagination}
            selectedKeys={props.selectedKeys}
            rowKey={props.rowKey}
            onUpdateSelectedKeys={props.onUpdateSelectedKeys}
            scrollX={props.scrollX}
            showIndex={props.showIndex}
            showSelection={props.showSelection}
            striped={props.striped}
            size={props.size}
            bordered={props.bordered}
            maxHeight={props.maxHeight}
          />
        </NCard>
      </div>
    );
  }
});

