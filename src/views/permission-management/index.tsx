import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { NButton, NSpace, NSwitch, useMessage } from 'naive-ui';
import {
  fetchBatchDeletePermissions,
  fetchCreatePermission,
  fetchDeletePermission,
  fetchPermissionDetail,
  fetchPermissionList,
  fetchTogglePermissionStatus,
  fetchUpdatePermission
} from '@/service/api/permission';
import { useTable } from '@/hooks/common/table';
import TablePage from '@/components/table-page/TablePage';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';
import type { PermissionFormData } from './components/dialog';
import { usePermissionDialog } from './components/usePermissionDialog';

type Permission = Api.PermissionManagement.Permission;

export default defineComponent({
  name: 'PermissionManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const permissionDialog = usePermissionDialog();
    const dialog = useDialog(instance?.appContext.app);

    const selectedRowKeys = ref<number[]>([]);

    const sortByOptions = [
      { label: '创建时间', value: 'createdAt' },
      { label: '更新时间', value: 'updatedAt' },
      { label: '名称', value: 'name' },
      { label: '代码', value: 'code' },
      { label: '资源', value: 'resource' },
      { label: '操作', value: 'action' }
    ];

    const {
      data,
      loading,
      pagination,
      getData,
      searchParams,
      updateSearchParams,
      resetSearchParams
    } = useTable<typeof fetchPermissionList>({
      apiFn: fetchPermissionList,
      apiParams: {
        page: 1,
        limit: 10,
        search: '',
        isActive: undefined as boolean | undefined,
        resource: undefined as string | undefined,
        action: undefined as string | undefined,
        sortBy: undefined as string | undefined,
        sortOrder: undefined as 'asc' | 'desc' | undefined
      },
      columns: () => tableListPlaceholderColumns<typeof fetchPermissionList>(),
      showTotal: true,
      immediate: true
    });

    async function handleAdd() {
      const formData: PermissionFormData = {
        name: '',
        code: '',
        resource: '',
        action: '',
        description: '',
        isActive: true
      };

      await permissionDialog.showPermissionForm({
        isEdit: false,
        formData,
        onConfirm: async (form: PermissionFormData) => {
          await fetchCreatePermission({
            name: form.name,
            code: form.code,
            resource: form.resource,
            action: form.action,
            description: form.description || undefined,
            isActive: form.isActive
          });
          message.success($t('common.addSuccess'));
          getData();
        }
      });
    }

    async function handleEdit(row: Permission) {
      const { data: permissionDetail } = await fetchPermissionDetail(row.id);
      if (!permissionDetail) {
        message.error($t('page.permissionManagement.getDetailFailed'));
        return;
      }

      const formData: PermissionFormData = {
        name: permissionDetail.name,
        code: permissionDetail.code,
        resource: permissionDetail.resource,
        action: permissionDetail.action,
        description: permissionDetail.description || '',
        isActive: permissionDetail.isActive
      };

      await permissionDialog.showPermissionForm({
        isEdit: true,
        formData,
        onConfirm: async (form: PermissionFormData) => {
          const updateData: Api.PermissionManagement.UpdatePermissionRequest = {
            name: form.name,
            resource: form.resource,
            action: form.action,
            description: form.description || undefined,
            isActive: form.isActive
          };
          await fetchUpdatePermission(row.id, updateData);
          message.success($t('common.updateSuccess'));
          getData();
        }
      });
    }

    async function handleToggleStatus(permissionId: number, isActive: boolean) {
      try {
        await fetchTogglePermissionStatus(permissionId, isActive);
        message.success($t('page.permissionManagement.toggleStatusSuccess'));
        getData();
      } catch {
        getData();
      }
    }

    async function handleDelete(row: Permission) {
      await dialog.confirmDelete(row.name, async () => {
        await fetchDeletePermission(row.id);
        message.success($t('common.deleteSuccess'));
        getData();
      });
    }

    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.permissionManagement.selectPermissionsToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.permissionManagement.confirmBatchDelete', {
          count: selectedRowKeys.value.length
        }),
        async () => {
          await fetchBatchDeletePermissions({ ids: selectedRowKeys.value });
          message.success($t('page.permissionManagement.batchDeleteSuccess'));
          selectedRowKeys.value = [];
          getData();
        }
      );
    }

    const searchConfig = computed<SearchFieldConfig[]>(() => [
      {
        type: 'input',
        field: 'search',
        placeholder: $t('page.permissionManagement.searchPlaceholder'),
        icon: 'i-carbon-search',
        width: '200px'
      },
      {
        type: 'select',
        field: 'resource',
        placeholder: $t('page.permissionManagement.resourcePlaceholder'),
        width: '120px',
        options: [
          { label: '用户', value: 'user' },
          { label: '角色', value: 'role' },
          { label: '权限', value: 'permission' },
          { label: '系统', value: 'system' },
          { label: '其他', value: 'other' }
        ]
      },
      {
        type: 'select',
        field: 'action',
        placeholder: $t('page.permissionManagement.actionPlaceholder'),
        width: '120px',
        options: [
          { label: '读取', value: 'read' },
          { label: '写入', value: 'write' },
          { label: '删除', value: 'delete' },
          { label: '创建', value: 'create' },
          { label: '管理', value: 'manage' }
        ]
      },
      {
        type: 'select',
        field: 'sortBy',
        placeholder: '排序字段',
        width: '120px',
        options: sortByOptions
      },
      {
        type: 'select',
        field: 'sortOrder',
        placeholder: '排序方式',
        width: '120px',
        options: [
          { label: '升序', value: 'asc' },
          { label: '降序', value: 'desc' }
        ]
      },
      {
        type: 'select',
        field: 'isActive',
        placeholder: $t('page.permissionManagement.statusPlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.permissionManagement.active'), value: true },
          { label: $t('page.permissionManagement.inactive'), value: false }
        ]
      }
    ]);

    const tableColumns = computed((): TableColumnConfig<Permission>[] => [
      {
        title: $t('page.permissionManagement.name'),
        key: 'name',
        width: 150
      },
      {
        title: $t('page.permissionManagement.code'),
        key: 'code',
        width: 150
      },
      {
        title: $t('page.permissionManagement.resource'),
        key: 'resource',
        width: 120
      },
      {
        title: $t('page.permissionManagement.action'),
        key: 'action',
        width: 120
      },
      {
        title: $t('page.permissionManagement.description'),
        key: 'description',
        width: 200,
        render: (row: Permission) => row.description || '-'
      },
      {
        title: $t('page.permissionManagement.status'),
        key: 'isActive',
        width: 100,
        render: (row: Permission) => (
          <NSwitch
            value={row.isActive}
            onUpdateValue={value => handleToggleStatus(row.id, value)}
            loading={false}
          />
        )
      },
      {
        title: $t('page.permissionManagement.createdAt'),
        key: 'createdAt',
        width: 180,
        render: (row: Permission) => {
          if (!row.createdAt) return '-';
          return new Date(row.createdAt).toLocaleString('zh-CN');
        }
      },
      {
        title: $t('page.permissionManagement.updatedAt'),
        key: 'updatedAt',
        width: 180,
        render: (row: Permission) => {
          if (!row.updatedAt) return '-';
          return new Date(row.updatedAt).toLocaleString('zh-CN');
        }
      },
      {
        title: $t('common.operate'),
        key: 'operate',
        width: 200,
        fixed: 'right',
        render: (row: Permission) => (
          <NSpace size="small">
            <NButton size="small" type="primary" onClick={() => handleEdit(row)}>
              {$t('common.edit')}
            </NButton>
            <NButton size="small" type="error" onClick={() => handleDelete(row)}>
              {$t('common.delete')}
            </NButton>
          </NSpace>
        )
      }
    ]);

    return () => (
      <TablePage
        class="h-full"
        searchConfig={searchConfig.value}
        searchModel={searchParams}
        onSearch={() => {
          updateSearchParams({ page: 1, limit: pagination.pageSize ?? 10 });
          getData();
        }}
        onReset={() => {
          resetSearchParams();
          getData();
        }}
        actionConfig={{
          preset: {
            add: { onClick: handleAdd },
            batchDelete: { onClick: handleBatchDelete },
            refresh: { onClick: getData }
          }
        }}
        columns={tableColumns.value}
        data={data.value}
        loading={loading.value}
        pagination={pagination}
        selectedKeys={selectedRowKeys.value}
        onUpdateSelectedKeys={keys => {
          selectedRowKeys.value = keys as number[];
        }}
        rowKey="id"
        scrollX={1800}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
