import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  fetchBatchDeletePermissions,
  fetchCreatePermission,
  fetchDeletePermission,
  fetchPermissionDetail,
  fetchPermissionList,
  fetchTogglePermissionStatus,
  fetchUpdatePermission
} from '@/service/api/permission';
import TablePage from '@/components/table-page/TablePage';
import { useAdminListTable } from '@/components/table-page/hooks';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import type { PermissionFormData } from './components/dialog';
import { usePermissionDialog } from './components/usePermissionDialog';
import {
  PERMISSION_LIST_SCROLL_X,
  createPermissionSearchFields,
  createPermissionTableColumns
} from './listUiConfig';

type Permission = Api.PermissionManagement.Permission;

export default defineComponent({
  name: 'PermissionManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const permissionDialog = usePermissionDialog();
    const dialog = useDialog(instance?.appContext.app);

    const selectedRowKeys = ref<number[]>([]);

    const { data, loading, pagination, getData, searchParams, onSearch, onReset } =
      useAdminListTable({
        apiFn: fetchPermissionList,
        listFilters: {
          search: '',
          isActive: undefined as number | undefined,
          resource: undefined as string | undefined,
          action: undefined as string | undefined,
          sortBy: undefined as string | undefined,
          sortOrder: undefined as 'asc' | 'desc' | undefined
        },
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

    const searchConfig = computed(() => createPermissionSearchFields());

    const tableColumns = computed(() =>
      createPermissionTableColumns({
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
        scrollX={PERMISSION_LIST_SCROLL_X}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
