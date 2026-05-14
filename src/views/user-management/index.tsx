import { computed, defineComponent, getCurrentInstance, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  fetchAdminRoleOptions,
  fetchBatchDeleteUsers,
  fetchCreateUser,
  fetchDeleteUser,
  fetchToggleUserStatus,
  fetchUpdateUser,
  fetchUserDetail,
  fetchUserList
} from '@/service/api/user';
import TablePage from '@/components/table-page/TablePage';
import { useAdminListTable } from '@/components/table-page/hooks';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import type { UserFormData } from './components/dialog';
import { useUserDialog } from './components/useUserDialog';
import { USER_LIST_SCROLL_X, createUserSearchFields, createUserTableColumns } from './listUiConfig';

type User = Api.UserManagement.User;

export default defineComponent({
  name: 'UserManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const userDialog = useUserDialog();
    const dialog = useDialog(instance?.appContext.app);

    const selectedRowKeys = ref<number[]>([]);

    const roles = ref<Api.UserManagement.Role[]>([]);
    const roleOptions = computed(() => {
      if (!Array.isArray(roles.value)) {
        return [];
      }
      return roles.value.map((role: Api.UserManagement.Role) => ({
        label: role.name,
        value: role.id
      }));
    });

    const { data, loading, pagination, getData, searchParams, onSearch, onReset } =
      useAdminListTable({
        apiFn: fetchUserList,
        listFilters: {
          search: '',
          isActive: undefined as boolean | undefined,
          isOnline: undefined as boolean | undefined,
          isBlacklisted: undefined as boolean | undefined,
          roleCode: undefined as string | undefined
        },
        showTotal: true,
        immediate: true
      });

    async function handleAdd() {
      if (!Array.isArray(roles.value) || roles.value.length === 0) {
        await loadRoles();
      }

      const formData: UserFormData = {
        username: '',
        email: '',
        password: '',
        roleIds: [],
        isActive: true
      };

      await userDialog.showUserForm({
        isEdit: false,
        formData,
        roleOptions: roleOptions.value,
        onConfirm: async (form: UserFormData) => {
          await fetchCreateUser({
            username: form.username,
            email: form.email,
            password: form.password,
            roleIds: form.roleIds,
            isActive: form.isActive
          });
          message.success($t('common.addSuccess'));
          getData();
        }
      });
    }

    async function handleEdit(row: User) {
      if (!Array.isArray(roles.value) || roles.value.length === 0) {
        await loadRoles();
      }

      const { data: userDetail } = await fetchUserDetail(row.id);
      if (!userDetail) {
        message.error($t('page.userManagement.getDetailFailed'));
        return;
      }

      const formData: UserFormData = {
        username: userDetail.username,
        email: userDetail.email,
        password: '',
        roleIds: userDetail.roles.map((role: Api.UserManagement.Role) => role.id),
        isActive: userDetail.isActive
      };

      await userDialog.showUserForm({
        isEdit: true,
        formData,
        roleOptions: roleOptions.value,
        onConfirm: async (form: UserFormData) => {
          const updateData: Api.UserManagement.UpdateUserRequest = {
            username: form.username,
            email: form.email,
            roleIds: form.roleIds,
            isActive: form.isActive
          };
          if (form.password) {
            updateData.password = form.password;
          }
          await fetchUpdateUser(row.id, updateData);
          message.success($t('common.updateSuccess'));
          getData();
        }
      });
    }

    async function handleToggleStatus(userId: number, isActive: boolean) {
      try {
        await fetchToggleUserStatus(userId, isActive);
        message.success($t('page.userManagement.toggleStatusSuccess'));
        getData();
      } catch {
        getData();
      }
    }

    async function handleDelete(row: User) {
      await dialog.confirmDelete(row.username, async () => {
        await fetchDeleteUser(row.id);
        message.success($t('common.deleteSuccess'));
        getData();
      });
    }

    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.userManagement.selectUsersToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.userManagement.confirmBatchDelete', { count: selectedRowKeys.value.length }),
        async () => {
          await fetchBatchDeleteUsers({ ids: selectedRowKeys.value });
          message.success($t('page.userManagement.batchDeleteSuccess'));
          selectedRowKeys.value = [];
          getData();
        }
      );
    }

    async function loadRoles() {
      try {
        const { data: rolesData } = await fetchAdminRoleOptions();
        if (rolesData?.lists && Array.isArray(rolesData.lists)) {
          roles.value = rolesData.lists;
        } else {
          roles.value = [];
        }
      } catch {
        roles.value = [];
      }
    }

    onMounted(() => {
      loadRoles();
    });

    const searchConfig = computed(() => createUserSearchFields(roles.value));

    const tableColumns = computed(() =>
      createUserTableColumns({
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
        scrollX={USER_LIST_SCROLL_X}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
