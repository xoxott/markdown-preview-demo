/**
 * TablePage 基础使用示例
 *
 * 这个示例展示了如何使用 TablePage 组件快速构建一个列表页面
 */

import { defineComponent } from 'vue';
import { useMessage } from 'naive-ui';
import { TablePage, useTablePage } from '@/components/table-page';
import type { SearchFieldConfig, ActionBarConfig, TableColumnConfig } from '@/components/table-page';

// 模拟数据类型
interface ExampleData {
  id: number;
  name: string;
  email: string;
  status: boolean;
  role: string;
  createdAt: string;
}

// 模拟 API 函数
const fetchExampleList = async (params: any) => {
  // 模拟 API 调用
  return {
    data: {
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
        total: 2,
        page: 1,
        limit: 10
      }
    }
  };
};

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
    const {
      data,
      loading,
      pagination,
      selectedKeys,
      refresh,
      updateSelectedKeys
    } = useTablePage<ExampleData>({
      apiFn: fetchExampleList,
      searchConfig,
      immediate: true
    });

    // 操作函数
    const handleAdd = () => {
      message.success('点击了新增按钮');
    };

    const handleEdit = (row: ExampleData) => {
      message.info(`编辑: ${row.name}`);
    };

    const handleDelete = (row: ExampleData) => {
      message.warning(`删除: ${row.name}`);
    };

    const handleBatchDelete = () => {
      message.error(`批量删除 ${selectedKeys.value.length} 条数据`);
    };

    const handleToggleStatus = (row: ExampleData, value: boolean) => {
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
    const columns: TableColumnConfig<ExampleData>[] = [
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
        searchConfig={searchConfig}
        actionConfig={actionConfig}
        columns={columns as any}
        data={data.value as any}
        loading={loading.value}
        pagination={pagination as any}
        selectedKeys={selectedKeys.value}
        onUpdateSelectedKeys={updateSelectedKeys}
        scrollX={1200}
      />
    );
  }
});

