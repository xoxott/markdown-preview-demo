import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  fetchBatchDeleteRoles,
  fetchCreateRole,
  fetchDeleteRole,
  fetchRoleDetail,
  fetchRoleList,
  fetchToggleRoleStatus,
  fetchUpdateRole
} from '@/service/api/role';
import TablePage from '@/components/table-page/TablePage';
import { useAdminListTable } from '@/components/table-page/hooks';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import type { RoleFormData } from './components/dialog';
import { useRoleDialog } from './components/useRoleDialog';
import { ROLE_LIST_SCROLL_X, createRoleSearchFields, createRoleTableColumns } from './listUiConfig';

type Role = Api.RoleManagement.Role;

export default defineComponent({
  name: 'RoleManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const roleDialog = useRoleDialog();
    const dialog = useDialog(instance?.appContext.app);

    const selectedRowKeys = ref<number[]>([]);

    const { data, loading, pagination, getData, searchParams, onSearch, onReset } =
      useAdminListTable({
        apiFn: fetchRoleList,
        listFilters: {
          search: '',
          isActive: undefined as boolean | undefined
        },
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

    const searchConfig = computed(() => createRoleSearchFields());

    const tableColumns = computed(() =>
      createRoleTableColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onToggleStatus: handleToggleStatus
      })
    );

    return () => (
      <TablePage
        class="h-full"
        searchConfig={searchConfig.value}
        searchModel={searchParams}
        onSearch={onSearch}
        onReset={onReset}
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
        scrollX={ROLE_LIST_SCROLL_X}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
