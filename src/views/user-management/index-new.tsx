import type { UserFormData } from '@/components/user-management/dialog';
import { useUserDialog } from '@/components/user-management/useUserDialog';
import { $t } from '@/locales';
import {
  fetchBatchDeleteUsers,
  fetchCreateUser,
  fetchDeleteUser,
  fetchRoleList,
  fetchToggleUserStatus,
  fetchUpdateUser,
  fetchUserDetail,
  fetchUserList
} from '@/service/api/user';
import { PaginationProps, useMessage } from 'naive-ui';
import { computed, defineComponent, getCurrentInstance, onMounted, ref } from 'vue';
import { useDialog } from '@/components/base-dialog/useDialog';
import { useTablePage } from '@/components/table-page';
import type { SearchFieldConfig, ActionBarConfig, TableColumnConfig } from '@/components/table-page';
import { TablePage } from '@/components/table-page';

type User = Api.UserManagement.User;

export default defineComponent({
  name: 'UserManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const userDialog = useUserDialog();
    const dialog = useDialog(instance?.appContext.app);

    // 角色列表
    const roles = ref<Api.UserManagement.Role[]>([]);
    const roleOptions = computed(() => {
      if (!Array.isArray(roles.value)) {
        return [];
      }
      return roles.value.map((role: Api.UserManagement.Role) => ({
        label: role.name,
        value: role.code
      }));
    });

    // 搜索配置
    const searchConfig: SearchFieldConfig[] = [
      {
        type: 'input',
        field: 'search',
        placeholder: $t('page.userManagement.searchPlaceholder'),
        icon: 'i-carbon-search',
        width: '220px'
      },
      {
        type: 'select',
        field: 'isActive',
        placeholder: $t('page.userManagement.statusPlaceholder'),
        width: '130px',
        options: [
          { label: $t('page.userManagement.active'), value: true },
          { label: $t('page.userManagement.inactive'), value: false }
        ]
      },
      {
        type: 'select',
        field: 'isOnline',
        placeholder: $t('page.userManagement.onlineStatusPlaceholder'),
        width: '130px',
        options: [
          { label: $t('page.userManagement.online'), value: true },
          { label: $t('page.userManagement.offline'), value: false }
        ]
      },
      {
        type: 'select',
        field: 'isBlacklisted',
        placeholder: $t('page.userManagement.blacklistStatusPlaceholder' as any),
        width: '130px',
        options: [
          { label: $t('page.userManagement.blacklisted' as any), value: true },
          { label: $t('page.userManagement.notBlacklisted' as any), value: false }
        ]
      },
      {
        type: 'select',
        field: 'roleCode',
        placeholder: '筛选角色',
        width: '130px',
        options: roleOptions.value
      }
    ];

    // 使用 table-page hook
    const tablePageHook = useTablePage<User>({
      apiFn: fetchUserList,
      searchConfig,
      immediate: true
    });

    const { data, loading, pagination, selectedKeys, searchForm, refresh, updateSelectedKeys } = tablePageHook;

    // 打开新增对话框
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
        roleOptions: roles.value.map(role => ({ label: role.name, value: role.id })),
        onConfirm: async (data: UserFormData) => {
          try {
            await fetchCreateUser({
              username: data.username,
              email: data.email,
              password: data.password,
              roleIds: data.roleIds,
              isActive: data.isActive
            });
            message.success($t('common.addSuccess'));
            refresh();
          } catch (error: any) {
            message.error(error?.message || '操作失败');
            throw error;
          }
        }
      });
    }

    // 打开编辑对话框
    async function handleEdit(row: User) {
      if (!Array.isArray(roles.value) || roles.value.length === 0) {
        await loadRoles();
      }

      try {
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
          roleOptions: roles.value.map(role => ({ label: role.name, value: role.id })),
          onConfirm: async (data: UserFormData) => {
            try {
              const updateData: Api.UserManagement.UpdateUserRequest = {
                username: data.username,
                email: data.email,
                roleIds: data.roleIds,
                isActive: data.isActive
              };
              if (data.password) {
                updateData.password = data.password;
              }
              await fetchUpdateUser(row.id, updateData);
              message.success($t('common.updateSuccess'));
              refresh();
            } catch (error: any) {
              message.error(error?.message || '操作失败');
              throw error;
            }
          }
        });
      } catch (error: any) {
        message.error(error?.message || $t('page.userManagement.getDetailFailed'));
      }
    }

    // 切换用户状态
    async function handleToggleStatus(row: User, isActive: boolean) {
      try {
        await fetchToggleUserStatus(row.id, isActive);
        message.success($t('page.userManagement.toggleStatusSuccess'));
        refresh();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
        refresh();
      }
    }

    // 删除用户
    async function handleDelete(row: User) {
      await dialog.confirmDelete(row.username, async () => {
        try {
          await fetchDeleteUser(row.id);
          message.success($t('common.deleteSuccess'));
          refresh();
        } catch (error: any) {
          message.error(error?.message || '操作失败');
        }
      });
    }

    // 批量删除
    async function handleBatchDelete() {
      if (selectedKeys.value.length === 0) {
        message.warning($t('page.userManagement.selectUsersToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.userManagement.confirmBatchDelete', { count: selectedKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeleteUsers({ ids: selectedKeys.value as number[] });
            message.success($t('page.userManagement.batchDeleteSuccess'));
            updateSelectedKeys([]);
            refresh();
          } catch (error: any) {
            message.error(error?.message || $t('common.error'));
          }
        }
      );
    }

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
      }
    };

    // 表格列配置
    const columns = [
      {
        key: 'username',
        title: $t('page.userManagement.username'),
        width: 140,
        fixed: 'left',
        ellipsis: { tooltip: true },
        render: 'avatar',
        renderConfig: {
          avatarField: 'avatar',
          nameField: 'username',
          showOnlineStatus: false
        }
      },
      {
        key: 'email',
        title: $t('page.userManagement.email'),
        width: 200,
        ellipsis: { tooltip: true }
      },
      {
        key: 'roles',
        title: $t('page.userManagement.role'),
        width: 180,
        render: 'tag',
        renderConfig: {
          type: 'popover',
          maxShow: 1,
          tagType: 'info',
          round: true,
          fieldMap: {
            label: 'name',
            value: 'id'
          }
        }
      },
      {
        key: 'isActive',
        title: $t('page.userManagement.status'),
        width: 90,
        render: 'status',
        renderConfig: {
          type: 'switch',
          onChange: handleToggleStatus
        }
      },
      {
        key: 'isOnline',
        title: $t('page.userManagement.onlineStatus'),
        width: 100,
        render: (row: User) => (
          <div class="flex items-center gap-6px">
            <div class={`w-6px h-6px rounded-full ${row.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span class={row.isOnline ? '' : 'text-gray-400'}>
              {row.isOnline ? $t('page.userManagement.online') : $t('page.userManagement.offline')}
            </span>
          </div>
        )
      },
      {
        key: 'isBlacklisted',
        title: $t('page.userManagement.blacklistStatus' as any),
        width: 100,
        render: 'status',
        renderConfig: {
          type: 'tag',
          trueLabel: $t('page.userManagement.blacklisted' as any),
          falseLabel: $t('page.userManagement.notBlacklisted' as any),
          trueType: 'error',
          falseType: 'success'
        }
      },
      {
        key: 'lastLoginAt',
        title: $t('page.userManagement.lastLoginAt'),
        width: 160,
        render: 'date',
        renderConfig: {
          format: 'smart',
          emptyText: '从未登录'
        }
      },
      {
        key: 'createdAt',
        title: $t('page.userManagement.createdAt'),
        width: 160,
        render: 'date',
        renderConfig: {
          format: 'datetime'
        }
      },
      {
        key: 'action',
        title: $t('common.operate'),
        width: 180,
        fixed: 'right',
        render: 'action',
        renderConfig: {
          buttons: [
            {
              label: $t('common.edit'),
              icon: 'i-carbon-edit',
              type: 'primary',
              secondary: true,
              onClick: handleEdit
            },
            {
              label: $t('common.delete'),
              icon: 'i-carbon-trash-can',
              type: 'error',
              secondary: true,
              onClick: handleDelete
            }
          ]
        }
      }
    ];

    // 加载角色列表
    async function loadRoles() {
      try {
        const { data } = await fetchRoleList();
        if (data?.lists && Array.isArray(data.lists)) {
          roles.value = data.lists;
        } else {
          roles.value = [];
        }
      } catch (error) {
        console.error('Failed to load roles', error);
        roles.value = [];
      }
    }

    onMounted(() => {
      loadRoles();
    });

    return () => {
      // 提取 props 避免类型递归问题
      const tablePageProps = {
        searchConfig,
        actionConfig,
        columns: columns as TableColumnConfig[],
        data: data.value,
        loading: loading.value,
        pagination: pagination as PaginationProps,
        selectedKeys: selectedKeys.value,
        onUpdateSelectedKeys: updateSelectedKeys,
        scrollX: 1600
      };
      return <TablePage {...tablePageProps} />;
    };
  }
});

