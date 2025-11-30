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
    function createColumns() {
      return [
        {
          type: 'selection',
          width: 50
        },
        {
          title: $t('common.index'),
          key: 'index',
          width: 80
        },
        {
          title: $t('page.userManagement.username'),
          key: 'username',
          width: 150
        },
        {
          title: $t('page.userManagement.email'),
          key: 'email',
          width: 200
        },
        {
          title: $t('page.userManagement.role'),
          key: 'roles',
          width: 200,
          render: (row: User) => {
            if (!row.roles || row.roles.length === 0) {
              return '-';
            }
            return (
              <NSpace size="small">
                {row.roles.map((role: Api.UserManagement.Role) => (
                  <NTag key={role.id} type="info" size="small">
                    {role.name}
                  </NTag>
                ))}
              </NSpace>
            );
          }
        },
        {
          title: $t('page.userManagement.status'),
          key: 'isActive',
          width: 100,
          render: (row: User) => (
            <NSwitch
              value={row.isActive}
              onUpdateValue={value => handleToggleStatus(row.id, value)}
              loading={false}
            />
          )
        },
        {
          title: $t('page.userManagement.onlineStatus'),
          key: 'isOnline',
          width: 100,
          render: (row: User) => (
            <NTag type={row.isOnline ? 'success' : 'default'} size="small">
              {row.isOnline ? $t('page.userManagement.online') : $t('page.userManagement.offline')}
            </NTag>
          )
        },
        {
          title: $t('page.userManagement.blacklistStatus' as any),
          key: 'isBlacklisted',
          width: 120,
          render: (row: User) => (
            <NTag type={row.isBlacklisted ? 'error' : 'success'} size="small">
              {row.isBlacklisted ? $t('page.userManagement.blacklisted' as any) : $t('page.userManagement.notBlacklisted' as any)}
            </NTag>
          )
        },
        {
          title: $t('page.userManagement.createdAt'),
          key: 'createdAt',
          width: 200,
          render: (row: User) => {
            if (!row.createdAt) return '-';
            return new Date(row.createdAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.userManagement.lastLoginAt'),
          key: 'lastLoginAt',
          width: 200,
          render: (row: User) => {
            if (!row.lastLoginAt) return '-';
            return new Date(row.lastLoginAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('common.operate'),
          key: 'action',
          width: 300,
          fixed: 'right',
          render: (row: User) => (
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
      <NSpace vertical size={16}>
        {/* 搜索栏 */}
        <NCard>
          <NForm ref={searchFormRef} model={searchForm} inline>
            <NFormItem path="search">
              <NInput
                v-model:value={searchForm.search}
                placeholder={$t('page.userManagement.searchPlaceholder')}
                style={{ width: '200px' }}
                clearable
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </NFormItem>
            <NFormItem path="isActive">
              <NSelect
                v-model:value={searchForm.isActive}
                placeholder={$t('page.userManagement.statusPlaceholder')}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.userManagement.active'), value: true as any },
                  { label: $t('page.userManagement.inactive'), value: false as any }
                ]}
              />
            </NFormItem>
            <NFormItem path="isOnline">
              <NSelect
                v-model:value={searchForm.isOnline}
                placeholder={$t('page.userManagement.onlineStatusPlaceholder')}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.userManagement.online'), value: true as any },
                  { label: $t('page.userManagement.offline'), value: false as any }
                ]}
              />
            </NFormItem>
            <NFormItem path="isBlacklisted">
              <NSelect
                v-model:value={searchForm.isBlacklisted}
                placeholder={$t('page.userManagement.blacklistStatusPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.userManagement.blacklisted' as any), value: true as any },
                  { label: $t('page.userManagement.notBlacklisted' as any), value: false as any }
                ]}
              />
            </NFormItem>
            <NFormItem>
              <NSpace>
                <NButton type="primary" onClick={handleSearch}>
                  {$t('common.search')}
                </NButton>
                <NButton onClick={handleReset}>
                  {$t('common.reset')}
                </NButton>
              </NSpace>
            </NFormItem>
          </NForm>
        </NCard>

        {/* 操作栏 */}
        <NCard>
          <NSpace>
            <NButton type="primary" onClick={handleAdd}>
              {$t('common.add')}
            </NButton>
            <NButton type="error" disabled={selectedRowKeys.value.length === 0} onClick={handleBatchDelete}>
              {$t('common.batchDelete')}
            </NButton>
            <NButton onClick={getData}>
              {$t('common.refresh')}
            </NButton>
          </NSpace>
        </NCard>

        {/* 表格 */}
        <NCard>
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
            scrollX={1800}
          />
        </NCard>
      </NSpace>
    );
  }
});

