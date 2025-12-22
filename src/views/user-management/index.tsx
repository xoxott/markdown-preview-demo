import type { UserFormData } from '@/components/user-management/dialog';
import { useUserDialog } from '@/components/user-management/useUserDialog';
import { useNaiveForm } from '@/hooks/common/form';
import { useTable } from '@/hooks/common/table';
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
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NSwitch,
  NTag,
  NPopover,
  NText,
  NBadge,
  useMessage
} from 'naive-ui';
import { computed, defineComponent, getCurrentInstance, onMounted, reactive, ref } from 'vue';
import { useDialog } from '@/components/base-dialog/useDialog';

type User = Api.UserManagement.User;

export default defineComponent({
  name: 'UserManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const userDialog = useUserDialog();
    const dialog = useDialog(instance?.appContext.app);
    const { formRef: searchFormRef, resetFields } = useNaiveForm();

    const selectedRowKeys = ref<number[]>([]);

    // 角色列表
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

    // 搜索表单数据
    const searchForm = reactive({
      search: '',
      isActive: undefined,
      isOnline: undefined,
      isBlacklisted: undefined,
      roleCode: undefined
    });

    // 打开新增对话框
    async function handleAdd() {
      // 确保角色列表已加载
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
            getData();
          } catch (error: any) {
            message.error(error?.message || '操作失败');
            throw error;
          }
        }
      });
    }

    // 打开编辑对话框
    async function handleEdit(row: User) {
      // 确保角色列表已加载
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
          roleOptions: roleOptions.value,
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
              getData();
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
    async function handleToggleStatus(userId: number, isActive: boolean) {
      try {
        await fetchToggleUserStatus(userId, isActive);
        message.success($t('page.userManagement.toggleStatusSuccess'));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
        getData(); // 刷新数据以恢复状态
      }
    }

    // 删除用户
    async function handleDelete(row: User) {
      await dialog.confirmDelete(row.username, async () => {
        try {
          await fetchDeleteUser(row.id);
          message.success($t('common.deleteSuccess'));
          getData();
        } catch (error: any) {
          message.error(error?.message || '操作失败');
        }
      });
    }

    // 创建表格列
    function createColumns(): any[] {
      return [
        {
          type: 'selection',
          width: 50,
          fixed: 'left'
        },
        {
          title: $t('common.index'),
          key: 'index',
          width: 70,
          fixed: 'left',
          render: (_row: User, index: number) => {
            return ((pagination.page || 1) - 1) * (pagination.pageSize || 10) + index + 1;
          }
        },
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
                  <img src={row.avatar} alt={row.username} class="w-28px h-28px rounded-full object-cover" />
                ) : (
                  <div class="w-28px h-28px rounded-full bg-primary text-white flex items-center justify-center text-12px font-500">
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
              <div class={`w-6px h-6px rounded-full ${row.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <NText depth={row.isOnline ? 1 : 3}>
                {row.isOnline ? $t('page.userManagement.online') : $t('page.userManagement.offline')}
              </NText>
            </div>
          )
        },
        {
          title: $t('page.userManagement.blacklistStatus' as any),
          key: 'isBlacklisted',
          width: 100,
          render: (row: User) => {
            if (row.isBlacklisted) {
              return (
                <NPopover trigger="hover" placement="top">
                  {{
                    trigger: () => (
                      <NTag type="error" size="small" round>
                        {$t('page.userManagement.blacklisted' as any)}
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
                {$t('page.userManagement.notBlacklisted' as any)}
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
              return <NText type="success">{date.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</NText>;
            } else if (days < 7) {
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
              <NButton
                size="small"
                type="primary"
                secondary
                onClick={() => handleEdit(row)}
              >
                <div class="flex items-center gap-4px">
                  <div class="i-carbon-edit text-14px" />
                  <span>{$t('common.edit')}</span>
                </div>
              </NButton>
              <NButton
                size="small"
                type="error"
                secondary
                onClick={() => handleDelete(row)}
              >
                <div class="flex items-center gap-4px">
                  <div class="i-carbon-trash-can text-14px" />
                  <span>{$t('common.delete')}</span>
                </div>
              </NButton>
            </NSpace>
          )
        }
      ];
    }

    // 表格配置
    const {
      columns,
      data,
      loading,
      pagination,
      getData,
      updateSearchParams,
      resetSearchParams
    } = useTable({
        apiFn: fetchUserList,
        apiParams: {
          page: 1,
          limit: 10,
          ...searchForm
        },
        columns: () => createColumns() as any,
        showTotal: true
      });

    // 搜索
    function handleSearch() {
      updateSearchParams({
        page: 1,
        ...searchForm
      });
      getData();
    }

    // 重置搜索
    function handleReset() {
      resetFields();
      resetSearchParams();
      getData();
    }


    // 批量删除
    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.userManagement.selectUsersToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.userManagement.confirmBatchDelete', { count: selectedRowKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeleteUsers({ ids: selectedRowKeys.value });
            message.success($t('page.userManagement.batchDeleteSuccess'));
            selectedRowKeys.value = [];
            getData();
          } catch (error: any) {
            message.error(error?.message || $t('common.error'));
          }
        }
      );
    }

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

    return () => (
      <div class="h-full flex flex-col gap-16px overflow-hidden p-16px">
        {/* 搜索栏 */}
        <NCard class="flex-shrink-0" bordered={false}>
          {{
            default: () => (
              <NForm ref={searchFormRef} model={searchForm} inline labelPlacement="left">
                <NFormItem path="search" class="!mb-0">
                  <NInput
                    v-model:value={searchForm.search}
                    placeholder={$t('page.userManagement.searchPlaceholder')}
                    style={{ width: '220px' }}
                    clearable
                    onKeyup={(e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                  >
                    {{
                      prefix: () => <div class="i-carbon-search text-16px text-gray-400" />
                    }}
                  </NInput>
                </NFormItem>
                <NFormItem path="isActive" class="!mb-0">
                  <NSelect
                    v-model:value={searchForm.isActive}
                    placeholder={$t('page.userManagement.statusPlaceholder')}
                    style={{ width: '130px' }}
                    clearable
                    options={[
                      { label: $t('page.userManagement.active'), value: true as any },
                      { label: $t('page.userManagement.inactive'), value: false as any }
                    ]}
                  />
                </NFormItem>
                <NFormItem path="isOnline" class="!mb-0">
                  <NSelect
                    v-model:value={searchForm.isOnline}
                    placeholder={$t('page.userManagement.onlineStatusPlaceholder')}
                    style={{ width: '130px' }}
                    clearable
                    options={[
                      { label: $t('page.userManagement.online'), value: true as any },
                      { label: $t('page.userManagement.offline'), value: false as any }
                    ]}
                  />
                </NFormItem>
                <NFormItem path="isBlacklisted" class="!mb-0">
                  <NSelect
                    v-model:value={searchForm.isBlacklisted}
                    placeholder={$t('page.userManagement.blacklistStatusPlaceholder' as any)}
                    style={{ width: '130px' }}
                    clearable
                    options={[
                      { label: $t('page.userManagement.blacklisted' as any), value: true as any },
                      { label: $t('page.userManagement.notBlacklisted' as any), value: false as any }
                    ]}
                  />
                </NFormItem>
                <NFormItem path="roleCode" class="!mb-0">
                  <NSelect
                    v-model:value={searchForm.roleCode}
                    placeholder="筛选角色"
                    style={{ width: '130px' }}
                    clearable
                    options={roles.value.map(role => ({
                      label: role.name,
                      value: role.code
                    }))}
                  />
                </NFormItem>
                <NFormItem class="!mb-0">
                  <NSpace size="small">
                    <NButton type="primary" onClick={handleSearch}>
                      <div class="flex items-center gap-4px">
                        <div class="i-carbon-search text-16px" />
                        <span>{$t('common.search')}</span>
                      </div>
                    </NButton>
                    <NButton onClick={handleReset}>
                      <div class="flex items-center gap-4px">
                        <div class="i-carbon-reset text-16px" />
                        <span>{$t('common.reset')}</span>
                      </div>
                    </NButton>
                  </NSpace>
                </NFormItem>
              </NForm>
            )
          }}
        </NCard>

        {/* 操作栏 */}
        <NCard class="flex-shrink-0" bordered={false}>
          {{
            default: () => (
              <div class="flex items-center justify-between">
                <NSpace size="small">
                  <NButton type="primary" onClick={handleAdd}>
                    <div class="flex items-center gap-4px">
                      <div class="i-carbon-add text-16px" />
                      <span>{$t('common.add')}</span>
                    </div>
                  </NButton>
                  <NButton
                    type="error"
                    disabled={selectedRowKeys.value.length === 0}
                    onClick={handleBatchDelete}
                  >
                    <div class="flex items-center gap-4px">
                      <div class="i-carbon-trash-can text-16px" />
                      <span>{$t('common.batchDelete')}</span>
                      {selectedRowKeys.value.length > 0 && (
                        <NBadge value={selectedRowKeys.value.length} type="error" />
                      )}
                    </div>
                  </NButton>
                  <NButton onClick={getData}>
                    <div class="flex items-center gap-4px">
                      <div class="i-carbon-renew text-16px" />
                      <span>{$t('common.refresh')}</span>
                    </div>
                  </NButton>
                </NSpace>
                <NText depth={3} class="text-13px">
                  共 {pagination.itemCount || 0} 条数据
                  {selectedRowKeys.value.length > 0 && `, 已选择 ${selectedRowKeys.value.length} 条`}
                </NText>
              </div>
            )
          }}
        </NCard>

        {/* 表格 */}
        <NCard class="flex-1 overflow-hidden" bordered={false} contentStyle={{ height: '100%', padding: 0 }}>
          {{
            default: () => (
              <NDataTable
                columns={columns.value as any}
                data={data.value}
                loading={loading.value}
                pagination={pagination}
                rowKey={(row: User) => row.id}
                checkedRowKeys={selectedRowKeys.value}
                onUpdateCheckedRowKeys={(keys) => {
                  selectedRowKeys.value = keys as number[];
                }}
                scrollX={1600}
                maxHeight="100%"
                striped
                size="small"
              />
            )
          }}
        </NCard>
      </div>
    );
  }
});

