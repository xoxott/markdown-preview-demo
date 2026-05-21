import { type PropType, computed, defineComponent } from 'vue';
import { NDataTable } from 'naive-ui';
import type { DataTableProps as NaiveDataTableProps, PaginationProps } from 'naive-ui';
import { $t } from '@/locales';
import type { PresetRendererType, TableColumnConfig } from './types';
import {
  ActionRenderer,
  AvatarRenderer,
  BadgeRenderer,
  DateRenderer,
  StatusRenderer,
  TagRenderer,
  TextRenderer
} from './renderers';

/**
 * 在 naive NDataTable 之上封装：
 *
 * - 可选多选列、序号列；
 * - 列配置支持字符串预设渲染器（avatar / status / date 等）或自定义 render 函数；
 * - `tableProps` 向底层表格透传，便于开启 remote、虚拟滚动等高级特性。
 */
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
      type: Object as PropType<NaiveDataTableProps['pagination']>,
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
    },
    /** 与 TablePage.tableProps 一致：浅合并进 NDataTable */
    tableProps: {
      type: Object as PropType<Partial<NaiveDataTableProps>>,
      default: undefined
    }
  },
  setup(props) {
    /** naive-ui 2.41+ 的 NDataTable 仅接受函数型 rowKey；将字符串字段名规范为 (row) => row[field]。 */
    const naiveRowKey = computed((): ((row: Record<string, unknown>) => string | number) => {
      const rk = props.rowKey;
      if (typeof rk === 'function') {
        return rk as (row: Record<string, unknown>) => string | number;
      }
      const field = typeof rk === 'string' && rk.length > 0 ? rk : 'id';
      return (row: Record<string, unknown>) => row[field] as string | number;
    });

    /** 将业务列声明展开为 naive 可识别的列数组（含 selection / index） */
    const processedColumns = computed(() => {
      const cols: any[] = [];

      if (props.showSelection) {
        cols.push({
          type: 'selection',
          width: 40,
          fixed: 'left'
        });
      }

      if (props.showIndex) {
        cols.push({
          title: $t('common.index'),
          key: 'index',
          width: 70,
          fixed: 'left',
          align: 'center',
          render: (_row: any, index: number) => {
            const pg = props.pagination;
            const isObj = typeof pg === 'object' && pg !== null;
            const page = isObj ? ((pg as PaginationProps).page ?? 1) : 1;
            const pageSize = isObj ? ((pg as PaginationProps).pageSize ?? 10) : 10;
            return (page - 1) * pageSize + index + 1;
          }
        });
      }

      props.columns.forEach(column => {
        const { render, renderConfig, ...restColumn } = column;
        const key = (column as any).key;

        if (typeof render === 'function') {
          cols.push({
            ...restColumn,
            key,
            render
          });
          return;
        }

        if (typeof render === 'string') {
          const rendererType = render as PresetRendererType;

          cols.push({
            ...restColumn,
            key,
            render: (row: any, _index: number) => {
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

    /** 合并顺序：外部 tableProps 先展开，再用内置受控字段覆盖，避免 checkedRowKeys 被意外冲掉 */
    const mergedTableProps = computed(
      (): Partial<NaiveDataTableProps> => ({
        ...(props.tableProps ?? {}),
        columns: processedColumns.value,
        data: props.data,
        loading: props.loading,
        pagination: props.pagination,
        rowKey: naiveRowKey.value,
        scrollX: props.scrollX,
        maxHeight: props.maxHeight,
        striped: props.striped,
        size: props.size,
        bordered: props.bordered,
        ...(props.showSelection
          ? {
              checkedRowKeys: props.selectedKeys,
              onUpdateCheckedRowKeys: props.onUpdateSelectedKeys ?? (() => {})
            }
          : {})
      })
    );

    return () => (
      <div class="h-full [&_.n-data-table\_\_pagination]:box-border [&_.n-data-table\_\_pagination]:px-16px">
        <NDataTable {...mergedTableProps.value} />
      </div>
    );
  }
});
