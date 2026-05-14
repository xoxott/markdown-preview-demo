import { computed, defineComponent, getCurrentInstance, onMounted, ref } from 'vue';
import { NBadge, NButton, NPopover, NSpace, NSwitch, NTag, NText, useMessage } from 'naive-ui';
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
import { useTable } from '@/hooks/common/table';
import TablePage from '@/components/table-page/TablePage';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';
import type { UserFormData } from './components/dialog';
import { useUserDialog } from './components/useUserDialog';

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

    const {
      data,
      loading,
      pagination,
      getData,
      searchParams,
      updateSearchParams,
      resetSearchParams
    } = useTable<typeof fetchUserList>({
      apiFn: fetchUserList,
      apiParams: {
        page: 1,
        limit: 10,
        search: '',
        isActive: undefined as boolean | undefined,
        isOnline: undefined as boolean | undefined,
        isBlacklisted: undefined as boolean | undefined,
        roleCode: undefined as string | undefined
      },
      columns: () => tableListPlaceholderColumns<typeof fetchUserList>(),
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

    const searchConfig = computed<SearchFieldConfig[]>(() => [
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
        placeholder: $t('page.userManagement.blacklistStatusPlaceholder'),
        width: '130px',
        options: [
          { label: $t('page.userManagement.blacklisted'), value: true },
          { label: $t('page.userManagement.notBlacklisted'), value: false }
        ]
      },
      {
        type: 'select',
        field: 'roleCode',
        placeholder: '筛选角色',
        width: '130px',
        options: roles.value.map(role => ({
          label: role.name,
          value: role.code
        }))
      }
    ]);

    const tableColumns = computed((): TableColumnConfig<User>[] => [
      {
        title: $t('page.userManagement.username'),
        key: 'username',
        width: 140,
        fixed: 'left',
        ellipsis: {
          tooltip: true
        },
        render: (row: User) => (
          <NSpace size="small" align="center">
            <div class="flex items-center gap-6px">
              {row.avatar ? (
                <img
                  src={row.avatar}
                  alt={row.username}
                  class="h-28px w-28px rounded-full object-cover"
                />
              ) : (
                <div class="h-28px w-28px flex items-center justify-center rounded-full bg-primary text-12px text-white font-500">
                  {row.username.charAt(0).toUpperCase()}
                </div>
              )}
              <NText strong>{row.username}</NText>
            </div>
          </NSpace>
        )
      },
      {
        title: $t('page.userManagement.email'),
        key: 'email',
        width: 200,
        ellipsis: {
          tooltip: true
        }
      },
      {
        title: $t('page.userManagement.role'),
        key: 'roles',
        width: 180,
        render: (row: User) => {
          if (!row.roles || row.roles.length === 0) {
            return <NText depth={3}>-</NText>;
          }
          if (row.roles.length === 1) {
            return (
              <NTag type="info" size="small" round>
                {row.roles[0].name}
              </NTag>
            );
          }
          return (
            <NPopover trigger="hover" placement="top">
              {{
                trigger: () => (
                  <NBadge value={row.roles.length} type="info">
                    <NTag type="info" size="small" round>
                      {row.roles[0].name}
                    </NTag>
                  </NBadge>
                ),
                default: () => (
                  <NSpace size="small" vertical>
                    {row.roles.map((role: Api.UserManagement.Role) => (
                      <NTag key={role.id} type="info" size="small" round>
                        {role.name}
                      </NTag>
                    ))}
                  </NSpace>
                )
              }}
            </NPopover>
          );
        }
      },
      {
        title: $t('page.userManagement.status'),
        key: 'isActive',
        width: 90,
        render: (row: User) => (
          <NSwitch
            value={row.isActive}
            onUpdateValue={value => handleToggleStatus(row.id, value)}
            size="small"
          />
        )
      },
      {
        title: $t('page.userManagement.onlineStatus'),
        key: 'isOnline',
        width: 100,
        render: (row: User) => (
          <div class="flex items-center gap-6px">
            <div
              class={`w-6px h-6px rounded-full ${row.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
            />
            <NText depth={row.isOnline ? 1 : 3}>
              {row.isOnline ? $t('page.userManagement.online') : $t('page.userManagement.offline')}
            </NText>
          </div>
        )
      },
      {
        title: $t('page.userManagement.blacklistStatus'),
        key: 'isBlacklisted',
        width: 100,
        render: (row: User) => {
          if (row.isBlacklisted) {
            return (
              <NPopover trigger="hover" placement="top">
                {{
                  trigger: () => (
                    <NTag type="error" size="small" round>
                      {$t('page.userManagement.blacklisted')}
                    </NTag>
                  ),
                  default: () => (
                    <div class="max-w-300px">
                      {row.blacklistReason && (
                        <div class="mb-4px">
                          <NText strong>原因: </NText>
                          <NText>{row.blacklistReason}</NText>
                        </div>
                      )}
                      {row.blacklistedAt && (
                        <div>
                          <NText depth={3} class="text-12px">
                            {new Date(row.blacklistedAt).toLocaleString('zh-CN')}
                          </NText>
                        </div>
                      )}
                    </div>
                  )
                }}
              </NPopover>
            );
          }
          return (
            <NTag type="success" size="small" round>
              {$t('page.userManagement.notBlacklisted')}
            </NTag>
          );
        }
      },
      {
        title: $t('page.userManagement.lastLoginAt'),
        key: 'lastLoginAt',
        width: 160,
        render: (row: User) => {
          if (!row.lastLoginAt) return <NText depth={3}>从未登录</NText>;
          const date = new Date(row.lastLoginAt);
          const now = new Date();
          const diff = now.getTime() - date.getTime();
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));

          if (days === 0) {
            return (
              <NText type="success">
                {date.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </NText>
            );
          }
          if (days < 7) {
            return <NText>{days}天前</NText>;
          }
          return <NText depth={3}>{date.toLocaleDateString('zh-CN')}</NText>;
        }
      },
      {
        title: $t('page.userManagement.createdAt'),
        key: 'createdAt',
        width: 160,
        render: (row: User) => {
          if (!row.createdAt) return '-';
          return new Date(row.createdAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      },
      {
        title: $t('common.operate'),
        key: 'action',
        width: 180,
        fixed: 'right',
        render: (row: User) => (
          <NSpace size="small">
            <NButton size="small" type="primary" secondary onClick={() => handleEdit(row)}>
              <div class="flex items-center gap-4px">
                <div class="i-carbon-edit text-14px" />
                <span>{$t('common.edit')}</span>
              </div>
            </NButton>
            <NButton size="small" type="error" secondary onClick={() => handleDelete(row)}>
              <div class="flex items-center gap-4px">
                <div class="i-carbon-trash-can text-14px" />
                <span>{$t('common.delete')}</span>
              </div>
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
        scrollX={1600}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
