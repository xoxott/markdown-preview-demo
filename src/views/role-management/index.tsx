import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { NButton, NSpace, NSwitch, useMessage } from 'naive-ui';
import {
  fetchBatchDeleteRoles,
  fetchCreateRole,
  fetchDeleteRole,
  fetchRoleDetail,
  fetchRoleList,
  fetchToggleRoleStatus,
  fetchUpdateRole
} from '@/service/api/role';
import { useTable } from '@/hooks/common/table';
import TablePage from '@/components/table-page/TablePage';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';
import type { RoleFormData } from './components/dialog';
import { useRoleDialog } from './components/useRoleDialog';

type Role = Api.RoleManagement.Role;

export default defineComponent({
  name: 'RoleManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const roleDialog = useRoleDialog();
    const dialog = useDialog(instance?.appContext.app);

    const selectedRowKeys = ref<number[]>([]);

    const {
      data,
      loading,
      pagination,
      getData,
      searchParams,
      updateSearchParams,
      resetSearchParams
    } = useTable<typeof fetchRoleList>({
      apiFn: fetchRoleList,
      apiParams: {
        page: 1,
        limit: 10,
        search: '',
        isActive: undefined as boolean | undefined
      },
      columns: () => tableListPlaceholderColumns<typeof fetchRoleList>(),
      showTotal: true,
      immediate: true
    });

    async function handleAdd() {
      const formData: RoleFormData = {
        name: '',
        code: '',
        description: '',
        isActive: true
      };

      await roleDialog.showRoleForm({
        isEdit: false,
        formData,
        onConfirm: async (form: RoleFormData) => {
          await fetchCreateRole({
            name: form.name,
            code: form.code,
            description: form.description || undefined,
            isActive: form.isActive
          });
          message.success($t('common.addSuccess'));
          getData();
        }
      });
    }

    async function handleEdit(row: Role) {
      const { data: roleDetail } = await fetchRoleDetail(row.id);
      if (!roleDetail) {
        message.error($t('page.roleManagement.getDetailFailed'));
        return;
      }

      const formData: RoleFormData = {
        name: roleDetail.name,
        code: roleDetail.code,
        description: roleDetail.description || '',
        isActive: roleDetail.isActive
      };

      await roleDialog.showRoleForm({
        isEdit: true,
        formData,
        onConfirm: async (form: RoleFormData) => {
          const updateData: Api.RoleManagement.UpdateRoleRequest = {
            name: form.name,
            description: form.description || undefined,
            isActive: form.isActive
          };
          await fetchUpdateRole(row.id, updateData);
          message.success($t('common.updateSuccess'));
          getData();
        }
      });
    }

    async function handleToggleStatus(roleId: number, isActive: boolean) {
      try {
        await fetchToggleRoleStatus(roleId, isActive);
        message.success($t('page.roleManagement.toggleStatusSuccess'));
        getData();
      } catch {
        getData();
      }
    }

    async function handleDelete(row: Role) {
      await dialog.confirmDelete(row.name, async () => {
        await fetchDeleteRole(row.id);
        message.success($t('common.deleteSuccess'));
        getData();
      });
    }

    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.roleManagement.selectRolesToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.roleManagement.confirmBatchDelete', {
          count: selectedRowKeys.value.length
        }),
        async () => {
          await fetchBatchDeleteRoles({ ids: selectedRowKeys.value });
          message.success($t('page.roleManagement.batchDeleteSuccess'));
          selectedRowKeys.value = [];
          getData();
        }
      );
    }

    const searchConfig = computed<SearchFieldConfig[]>(() => [
      {
        type: 'input',
        field: 'search',
        placeholder: $t('page.roleManagement.searchPlaceholder'),
        icon: 'i-carbon-search',
        width: '200px'
      },
      {
        type: 'select',
        field: 'isActive',
        placeholder: $t('page.roleManagement.statusPlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.roleManagement.active'), value: true },
          { label: $t('page.roleManagement.inactive'), value: false }
        ]
      }
    ]);

    const tableColumns = computed((): TableColumnConfig<Role>[] => [
      {
        title: $t('page.roleManagement.name'),
        key: 'name',
        width: 150
      },
      {
        title: $t('page.roleManagement.code'),
        key: 'code',
        width: 150
      },
      {
        title: $t('page.roleManagement.description'),
        key: 'description',
        width: 200,
        render: (row: Role) => row.description || '-'
      },
      {
        title: $t('page.roleManagement.status'),
        key: 'isActive',
        width: 100,
        render: (row: Role) => (
          <NSwitch
            value={row.isActive}
            onUpdateValue={(v: boolean) => handleToggleStatus(row.id, v)}
          />
        )
      },
      {
        title: $t('page.roleManagement.createdAt'),
        key: 'createdAt',
        width: 180,
        render: (row: Role) =>
          row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-'
      },
      {
        title: $t('page.roleManagement.updatedAt'),
        key: 'updatedAt',
        width: 180,
        render: (row: Role) =>
          row.updatedAt ? new Date(row.updatedAt).toLocaleString('zh-CN') : '-'
      },
      {
        title: $t('common.operate'),
        key: 'action',
        width: 200,
        fixed: 'right',
        render: (row: Role) => (
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
