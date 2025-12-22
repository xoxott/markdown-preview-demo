import { defineComponent, type PropType, computed } from 'vue';
import { NDataTable } from 'naive-ui';
import { $t } from '@/locales';
import type { DataTableProps, TableColumnConfig, PresetRendererType } from './types';
import {
  AvatarRenderer,
  StatusRenderer,
  DateRenderer,
  TagRenderer,
  BadgeRenderer,
  ActionRenderer,
  TextRenderer
} from './renderers';

export default defineComponent({
  name: 'DataTable',
  props: {
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
      type: Object as PropType<DataTableProps['pagination']>,
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
    }
  },
  setup(props) {
    const processedColumns = computed(() => {
      const cols: any[] = [];

      // Add selection column
      if (props.showSelection) {
        cols.push({
          type: 'selection',
          width: 50,
          fixed: 'left'
        });
      }

      // Add index column
      if (props.showIndex) {
        cols.push({
          title: $t('common.index'),
          key: 'index',
          width: 70,
          fixed: 'left',
          render: (_row: any, index: number) => {
            const page = props.pagination?.page || 1;
            const pageSize = props.pagination?.pageSize || 10;
            return (page - 1) * pageSize + index + 1;
          }
        });
      }

      // Process custom columns
      props.columns.forEach(column => {
        const { render, renderConfig, ...restColumn } = column;
        const key = (column as any).key;

        // If render is a function, use it directly
        if (typeof render === 'function') {
          cols.push({
            ...restColumn,
            key,
            render
          });
          return;
        }

        // If render is a preset renderer type
        if (typeof render === 'string') {
          const rendererType = render as PresetRendererType;

          cols.push({
            ...restColumn,
            key,
            render: (row: any, index: number) => {
              const field = key as string;

              switch (rendererType) {
                case 'avatar':
                  return <AvatarRenderer row={row} config={renderConfig as any} />;
                case 'status':
                  return <StatusRenderer row={row} field={field} config={renderConfig as any} />;
                case 'date':
                  return <DateRenderer row={row} field={field} config={renderConfig as any} />;
                case 'tag':
                  return <TagRenderer row={row} field={field} config={renderConfig as any} />;
                case 'badge':
                  return <BadgeRenderer row={row} field={field} config={renderConfig as any} />;
                case 'action':
                  return <ActionRenderer row={row} config={renderConfig as any} />;
                case 'text':
                  return <TextRenderer row={row} field={field} config={renderConfig as any} />;
                default:
                  return row[field];
              }
            }
          });
          return;
        }

        // Default: just display the field value
        cols.push({
          ...restColumn,
          key,
          render: (row: any) => {
            const field = key as string;
            const value = row[field];
            return value !== null && value !== undefined ? value : '-';
          }
        });
      });

      return cols;
    });

    return () => (
      <NDataTable
        columns={processedColumns.value}
        data={props.data}
        loading={props.loading}
        pagination={props.pagination}
        rowKey={props.rowKey as any}
        checkedRowKeys={props.selectedKeys}
        onUpdateCheckedRowKeys={props.onUpdateSelectedKeys}
        scrollX={props.scrollX}
        maxHeight={props.maxHeight}
        striped={props.striped}
        size={props.size}
        bordered={props.bordered}
      />
    );
  }
});

