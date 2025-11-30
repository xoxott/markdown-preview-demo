import type { RoleFormData } from '@/components/role-management/dialog';
import { useRoleDialog } from '@/components/role-management/useRoleDialog';
import { useNaiveForm } from '@/hooks/common/form';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import {
  fetchBatchDeleteRoles,
  fetchCreateRole,
  fetchDeleteRole,
  fetchRoleDetail,
  fetchRoleList,
  fetchToggleRoleStatus,
  fetchUpdateRole
} from '@/service/api/role';
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
  useMessage
} from 'naive-ui';
import { defineComponent, getCurrentInstance, reactive, ref } from 'vue';
import { useDialog } from '@/components/base-dialog/useDialog';

type Role = Api.RoleManagement.Role;

export default defineComponent({
  name: 'RoleManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const roleDialog = useRoleDialog();
    const dialog = useDialog(instance?.appContext.app);
    const { formRef: searchFormRef, resetFields } = useNaiveForm();

    const selectedRowKeys = ref<number[]>([]);

    // 搜索表单数据
    const searchForm = reactive({
      search: '',
      isActive: undefined
    });

    // 打开新增对话框
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
        onConfirm: async (data: RoleFormData) => {
          try {
            await fetchCreateRole({
              name: data.name,
              code: data.code,
              description: data.description || undefined,
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
    async function handleEdit(row: Role) {
      try {
        const { data: roleDetail } = await fetchRoleDetail(row.id);
        if (!roleDetail) {
          message.error($t('page.roleManagement.getDetailFailed' as any));
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
          onConfirm: async (data: RoleFormData) => {
            try {
              const updateData: Api.RoleManagement.UpdateRoleRequest = {
                name: data.name,
                description: data.description || undefined,
                isActive: data.isActive
              };
              await fetchUpdateRole(row.id, updateData);
              message.success($t('common.updateSuccess'));
              getData();
            } catch (error: any) {
              message.error(error?.message || '操作失败');
              throw error;
            }
          }
        });
      } catch (error: any) {
        message.error(error?.message || $t('page.roleManagement.getDetailFailed' as any));
      }
    }

    // 切换角色状态
    async function handleToggleStatus(roleId: number, isActive: boolean) {
      try {
        await fetchToggleRoleStatus(roleId, isActive);
        message.success($t('page.roleManagement.toggleStatusSuccess' as any));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
        getData(); // 刷新数据以恢复状态
      }
    }

    // 删除角色
    async function handleDelete(row: Role) {
      await dialog.confirmDelete(row.name, async () => {
        try {
          await fetchDeleteRole(row.id);
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
          title: $t('page.roleManagement.name' as any),
          key: 'name',
          width: 150
        },
        {
          title: $t('page.roleManagement.code' as any),
          key: 'code',
          width: 150
        },
        {
          title: $t('page.roleManagement.description' as any),
          key: 'description',
          width: 200,
          render: (row: Role) => {
            return row.description || '-';
          }
        },
        {
          title: $t('page.roleManagement.status' as any),
          key: 'isActive',
          width: 100,
          render: (row: Role) => (
            <NSwitch
              value={row.isActive}
              onUpdateValue={value => handleToggleStatus(row.id, value)}
              loading={false}
            />
          )
        },
        {
          title: $t('page.roleManagement.createdAt' as any),
          key: 'createdAt',
          width: 180,
          render: (row: Role) => {
            if (!row.createdAt) return '-';
            return new Date(row.createdAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.roleManagement.updatedAt' as any),
          key: 'updatedAt',
          width: 180,
          render: (row: Role) => {
            if (!row.updatedAt) return '-';
            return new Date(row.updatedAt).toLocaleString('zh-CN');
          }
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
        apiFn: fetchRoleList,
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
        message.warning($t('page.roleManagement.selectRolesToDelete' as any));
        return;
      }
      await dialog.confirmDelete(
        $t('page.roleManagement.confirmBatchDelete' as any, { count: selectedRowKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeleteRoles({ ids: selectedRowKeys.value });
            message.success($t('page.roleManagement.batchDeleteSuccess' as any));
            selectedRowKeys.value = [];
            getData();
          } catch (error: any) {
            message.error(error?.message || $t('common.error'));
          }
        }
      );
    }

    return () => (
      <NSpace vertical size={16}>
        {/* 搜索栏 */}
        <NCard>
          <NForm ref={searchFormRef} model={searchForm} inline>
            <NFormItem path="search">
              <NInput
                v-model:value={searchForm.search}
                placeholder={$t('page.roleManagement.searchPlaceholder' as any)}
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
                placeholder={$t('page.roleManagement.statusPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.roleManagement.active' as any), value: true as any },
                  { label: $t('page.roleManagement.inactive' as any), value: false as any }
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
            rowKey={(row: Role) => row.id}
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

