/**
 * TablePage 基础使用示例
 *
 * 这个示例展示了如何使用 TablePage 组件快速构建一个列表页面
 */

import { defineComponent } from 'vue';
import { useMessage } from 'naive-ui';
import type { AxiosResponse } from 'axios';
import type { FlatResponseSuccessData } from '@suga/axios';
import { TablePage, useTablePage } from '@/components/table-page';
import type {
  ActionBarConfig,
  SearchFieldConfig,
  TableColumnConfig
} from '@/components/table-page';

/** 列表行数据（接口实体） */
interface ExampleData {
  id: number;
  name: string;
  email: string;
  status: boolean;
  role: string;
  createdAt: string;
}

/** useTable 注入序号后的行类型，与表格 data 一致 */
type ExampleRow = NaiveUI.TableDataWithIndex<ExampleData>;

/** 与 SearchBar 字段、列表接口对齐的查询参数 */
interface ExampleListParams extends Api.Common.PaginationParams {
  search?: string;
  status?: boolean | '' | undefined;
}

/** 模拟列表接口：返回形态与项目 request 扁平化结果一致， 以便 `useTable`（@/hooks/common/table）解析 `lists` + `meta`。 */
async function fetchExampleList(
  _params: ExampleListParams
): Promise<NaiveUI.FlatResponseData<Api.ListData<ExampleData>>> {
  const listData: Api.ListData<ExampleData> = {
    lists: [
      {
        id: 1,
        name: '张三',
        email: 'zhangsan@example.com',
        status: true,
        role: '管理员',
        createdAt: '2024-01-01 10:00:00'
      },
      {
        id: 2,
        name: '李四',
        email: 'lisi@example.com',
        status: false,
        role: '用户',
        createdAt: '2024-01-02 11:00:00'
      }
    ],
    meta: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
      hasPrevPage: false,
      hasNextPage: false
    }
  };

  const success: FlatResponseSuccessData<Api.ListData<ExampleData>> = {
    data: listData,
    error: null,
    response: {} as AxiosResponse<Api.ListData<ExampleData>>
  };
  return success;
}

export default defineComponent({
  name: 'BasicExample',
  setup() {
    const message = useMessage();

    // 搜索配置
    const searchConfig: SearchFieldConfig[] = [
      {
        type: 'input',
        field: 'search',
        placeholder: '搜索名称或邮箱',
        icon: 'i-carbon-search',
        width: '220px'
      },
      {
        type: 'select',
        field: 'status',
        placeholder: '状态',
        width: '130px',
        options: [
          { label: '全部', value: '' },
          { label: '启用', value: true },
          { label: '禁用', value: false }
        ]
      }
    ];

    // 使用 hook 管理数据
    const { data, loading, pagination, selectedKeys, refresh, updateSelectedKeys, searchBindings } =
      useTablePage({
        apiFn: fetchExampleList,
        searchConfig,
        immediate: true
      });

    // 操作函数
    const handleAdd = () => {
      message.success('点击了新增按钮');
    };

    const handleEdit = (row: ExampleRow) => {
      message.info(`编辑: ${row.name}`);
    };

    const handleDelete = (row: ExampleRow) => {
      message.warning(`删除: ${row.name}`);
    };

    const handleBatchDelete = () => {
      message.error(`批量删除 ${selectedKeys.value.length} 条数据`);
    };

    const handleToggleStatus = (row: ExampleRow, value: boolean) => {
      message.success(`${row.name} 状态已${value ? '启用' : '禁用'}`);
    };

    // 操作栏配置
    const actionConfig: ActionBarConfig = {
      preset: {
        add: {
          show: true,
          onClick: handleAdd
        },
        batchDelete: {
          show: true,
          onClick: handleBatchDelete
        },
        refresh: {
          show: true,
          onClick: refresh
        }
      },
      custom: [
        {
          label: '导出',
          icon: 'i-carbon-download',
          type: 'default',
          onClick: () => {
            message.info('导出数据');
          }
        }
      ]
    };

    // 表格列配置
    const columns: TableColumnConfig<ExampleRow>[] = [
      {
        key: 'name',
        title: '姓名',
        width: 120
      },
      {
        key: 'email',
        title: '邮箱',
        width: 200
      },
      {
        key: 'role',
        title: '角色',
        width: 100,
        render: 'tag',
        renderConfig: {
          type: 'simple',
          tagType: 'info',
          round: true
        }
      },
      {
        key: 'status',
        title: '状态',
        width: 90,
        render: 'status',
        renderConfig: {
          type: 'switch',
          onChange: handleToggleStatus
        }
      },
      {
        key: 'createdAt',
        title: '创建时间',
        width: 180,
        render: 'date',
        renderConfig: {
          format: 'datetime'
        }
      },
      {
        key: 'action',
        title: '操作',
        width: 180,
        fixed: 'right',
        render: 'action',
        renderConfig: {
          buttons: [
            {
              label: '编辑',
              icon: 'i-carbon-edit',
              type: 'primary',
              secondary: true,
              onClick: handleEdit
            },
            {
              label: '删除',
              icon: 'i-carbon-trash-can',
              type: 'error',
              secondary: true,
              onClick: handleDelete
            }
          ]
        }
      }
    ];

    return () => (
      <TablePage
        {...searchBindings}
        searchConfig={searchConfig}
        actionConfig={actionConfig}
        columns={columns}
        data={data.value}
        loading={loading.value}
        pagination={pagination}
        selectedKeys={selectedKeys.value}
        onUpdateSelectedKeys={updateSelectedKeys}
        scrollX={1200}
      />
    );
  }
});
