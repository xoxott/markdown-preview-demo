import type { PermissionFormData } from '@/components/permission-management/dialog';
import { usePermissionDialog } from '@/components/permission-management/usePermissionDialog';
import { useNaiveForm } from '@/hooks/common/form';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import {
  fetchBatchDeletePermissions,
  fetchCreatePermission,
  fetchDeletePermission,
  fetchPermissionDetail,
  fetchPermissionList,
  fetchTogglePermissionStatus,
  fetchUpdatePermission
} from '@/service/api/permission';
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

type Permission = Api.PermissionManagement.Permission;

export default defineComponent({
  name: 'PermissionManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const permissionDialog = usePermissionDialog();
    const dialog = useDialog(instance?.appContext.app);
    const { formRef: searchFormRef, resetFields } = useNaiveForm();

    const selectedRowKeys = ref<number[]>([]);

    // 资源选项（用于搜索筛选）
    const resourceOptions = [
      { label: '全部', value: undefined },
      { label: '用户', value: 'user' },
      { label: '角色', value: 'role' },
      { label: '权限', value: 'permission' },
      { label: '系统', value: 'system' },
      { label: '其他', value: 'other' }
    ];

    // 操作选项（用于搜索筛选）
    const actionOptions = [
      { label: '全部', value: undefined },
      { label: '读取', value: 'read' },
      { label: '写入', value: 'write' },
      { label: '删除', value: 'delete' },
      { label: '创建', value: 'create' },
      { label: '管理', value: 'manage' }
    ];

    // 排序字段选项
    const sortByOptions = [
      { label: '创建时间', value: 'createdAt' },
      { label: '更新时间', value: 'updatedAt' },
      { label: '名称', value: 'name' },
      { label: '代码', value: 'code' },
      { label: '资源', value: 'resource' },
      { label: '操作', value: 'action' }
    ];

    // 搜索表单数据
    const searchForm = reactive({
      search: '',
      isActive: undefined,
      resource: undefined,
      action: undefined,
      sortBy: undefined as string | undefined,
      sortOrder: undefined as 'asc' | 'desc' | undefined
    });

    // 打开新增对话框
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
        onConfirm: async (data: PermissionFormData) => {
          try {
            await fetchCreatePermission({
              name: data.name,
              code: data.code,
              resource: data.resource,
              action: data.action,
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
    async function handleEdit(row: Permission) {
      try {
        const { data: permissionDetail } = await fetchPermissionDetail(row.id);
        if (!permissionDetail) {
          message.error($t('page.permissionManagement.getDetailFailed' as any));
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
          onConfirm: async (data: PermissionFormData) => {
            try {
              const updateData: Api.PermissionManagement.UpdatePermissionRequest = {
                name: data.name,
                resource: data.resource,
                action: data.action,
                description: data.description || undefined,
                isActive: data.isActive
              };
              await fetchUpdatePermission(row.id, updateData);
              message.success($t('common.updateSuccess'));
              getData();
            } catch (error: any) {
              message.error(error?.message || '操作失败');
              throw error;
            }
          }
        });
      } catch (error: any) {
        message.error(error?.message || $t('page.permissionManagement.getDetailFailed' as any));
      }
    }

    // 切换权限状态
    async function handleToggleStatus(permissionId: number, isActive: boolean) {
      try {
        await fetchTogglePermissionStatus(permissionId, isActive);
        message.success($t('page.permissionManagement.toggleStatusSuccess' as any));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
        getData(); // 刷新数据以恢复状态
      }
    }

    // 删除权限
    async function handleDelete(row: Permission) {
      await dialog.confirmDelete(row.name, async () => {
        try {
          await fetchDeletePermission(row.id);
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
          title: $t('page.permissionManagement.name' as any),
          key: 'name',
          width: 150
        },
        {
          title: $t('page.permissionManagement.code' as any),
          key: 'code',
          width: 150
        },
        {
          title: $t('page.permissionManagement.resource' as any),
          key: 'resource',
          width: 120
        },
        {
          title: $t('page.permissionManagement.action' as any),
          key: 'action',
          width: 120
        },
        {
          title: $t('page.permissionManagement.description' as any),
          key: 'description',
          width: 200,
          render: (row: Permission) => {
            return row.description || '-';
          }
        },
        {
          title: $t('page.permissionManagement.status' as any),
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
          title: $t('page.permissionManagement.createdAt' as any),
          key: 'createdAt',
          width: 180,
          render: (row: Permission) => {
            if (!row.createdAt) return '-';
            return new Date(row.createdAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.permissionManagement.updatedAt' as any),
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
        apiFn: fetchPermissionList,
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
        message.warning($t('page.permissionManagement.selectPermissionsToDelete' as any));
        return;
      }
      await dialog.confirmDelete(
        $t('page.permissionManagement.confirmBatchDelete' as any, { count: selectedRowKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeletePermissions({ ids: selectedRowKeys.value });
            message.success($t('page.permissionManagement.batchDeleteSuccess' as any));
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
                placeholder={$t('page.permissionManagement.searchPlaceholder' as any)}
                style={{ width: '200px' }}
                clearable
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </NFormItem>
            <NFormItem path="resource">
              <NSelect
                v-model:value={searchForm.resource}
                placeholder={$t('page.permissionManagement.resourcePlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={resourceOptions}
              />
            </NFormItem>
            <NFormItem path="action">
              <NSelect
                v-model:value={searchForm.action}
                placeholder={$t('page.permissionManagement.actionPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={actionOptions}
              />
            </NFormItem>
            <NFormItem path="sortBy">
              <NSelect
                v-model:value={searchForm.sortBy}
                placeholder="排序字段"
                style={{ width: '120px' }}
                clearable
                options={sortByOptions}
              />
            </NFormItem>
            <NFormItem path="sortOrder">
              <NSelect
                v-model:value={searchForm.sortOrder}
                placeholder="排序方式"
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: '升序', value: 'asc' },
                  { label: '降序', value: 'desc' }
                ]}
              />
            </NFormItem>
            <NFormItem path="isActive">
              <NSelect
                v-model:value={searchForm.isActive}
                placeholder={$t('page.permissionManagement.statusPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.permissionManagement.active' as any), value: true as any },
                  { label: $t('page.permissionManagement.inactive' as any), value: false as any }
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
            rowKey={(row: Permission) => row.id}
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

