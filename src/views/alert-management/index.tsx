import type { AlertFormData } from '@/components/alert-management/dialog';
import { useAlertDialog } from '@/components/alert-management/useAlertDialog';
import { useNaiveForm } from '@/hooks/common/form';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import {
  fetchBatchDeleteAlerts,
  fetchCreateAlert,
  fetchDeleteAlert,
  fetchAlertDetail,
  fetchAlertList,
  fetchToggleAlertStatus,
  fetchUpdateAlert,
  fetchAcknowledgeAlert,
  fetchResolveAlert
} from '@/service/api/alert';
import { fetchUserList } from '@/service/api/user';
import { fetchRoleList } from '@/service/api/role';
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
import { defineComponent, getCurrentInstance, reactive, ref, computed, onMounted } from 'vue';
import { useDialog } from '@/components/base-dialog/useDialog';

type Alert = Api.AlertManagement.Alert;

export default defineComponent({
  name: 'AlertManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const alertDialog = useAlertDialog();
    const dialog = useDialog(instance?.appContext.app);
    const { formRef: searchFormRef, resetFields } = useNaiveForm();

    const selectedRowKeys = ref<number[]>([]);

    // 用户和角色选项
    const users = ref<Api.UserManagement.User[]>([]);
    const roles = ref<Api.RoleManagement.Role[]>([]);

    const userOptions = computed(() => {
      return users.value.map(user => ({
        label: `${user.username} (${user.email})`,
        value: user.id
      }));
    });

    const roleOptions = computed(() => {
      return roles.value.map(role => ({
        label: role.name,
        value: role.code
      }));
    });

    // 加载用户和角色列表
    async function loadUsersAndRoles() {
      try {
        const [usersRes, rolesRes] = await Promise.all([
          fetchUserList({ page: 1, limit: 1000 }),
          fetchRoleList({ page: 1, limit: 1000 })
        ]);
        if (usersRes.data?.lists) {
          users.value = usersRes.data.lists;
        }
        if (rolesRes.data?.lists) {
          roles.value = rolesRes.data.lists;
        }
      } catch (error: any) {
        console.error('Failed to load users and roles:', error);
      }
    }

    // 级别选项（用于搜索筛选）
    const levelOptions = [
      { label: $t('page.alertManagement.all' as any), value: undefined },
      { label: $t('page.alertManagement.levelCritical' as any), value: 'critical' },
      { label: $t('page.alertManagement.levelWarning' as any), value: 'warning' },
      { label: $t('page.alertManagement.levelInfo' as any), value: 'info' }
    ];

    // 状态选项（用于搜索筛选）
    const statusOptions = [
      { label: $t('page.alertManagement.all' as any), value: undefined },
      { label: $t('page.alertManagement.statusActive' as any), value: 'active' },
      { label: $t('page.alertManagement.statusResolved' as any), value: 'resolved' },
      { label: $t('page.alertManagement.statusAcknowledged' as any), value: 'acknowledged' }
    ];

    // 搜索表单数据
    const searchForm = reactive({
      search: '',
      status: undefined,
      level: undefined,
      isEnabled: undefined,
      sortBy: undefined as string | undefined,
      sortOrder: undefined as 'asc' | 'desc' | undefined
    });

    // 打开新增对话框
    async function handleAdd() {
      // 确保用户和角色列表已加载
      if (users.value.length === 0 || roles.value.length === 0) {
        await loadUsersAndRoles();
      }

      const formData: AlertFormData = {
        name: '',
        description: '',
        level: 'warning',
        condition: '',
        threshold: null,
        metric: '',
        isEnabled: true,
        targetUserIds: [],
        targetRoleCodes: []
      };

      await alertDialog.showAlertForm({
        isEdit: false,
        formData,
        userOptions: userOptions.value,
        roleOptions: roleOptions.value,
        onConfirm: async (data: AlertFormData) => {
          try {
            await fetchCreateAlert({
              name: data.name,
              description: data.description || undefined,
              level: data.level,
              condition: data.condition || undefined,
              threshold: data.threshold || undefined,
              metric: data.metric || undefined,
              isEnabled: data.isEnabled,
              targetUserIds: data.targetUserIds.length > 0 ? data.targetUserIds : undefined,
              targetRoleCodes: data.targetRoleCodes.length > 0 ? data.targetRoleCodes : undefined
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
    async function handleEdit(row: Alert) {
      try {
        const { data: alertDetail } = await fetchAlertDetail(row.id);
        if (!alertDetail) {
          message.error($t('page.alertManagement.getDetailFailed' as any));
          return;
        }

        // 确保用户和角色列表已加载
        if (users.value.length === 0 || roles.value.length === 0) {
          await loadUsersAndRoles();
        }

        const formData: AlertFormData = {
          name: alertDetail.name,
          description: alertDetail.description || '',
          level: alertDetail.level,
          condition: alertDetail.condition || '',
          threshold: alertDetail.threshold,
          metric: alertDetail.metric || '',
          isEnabled: alertDetail.isEnabled,
          targetUserIds: alertDetail.targetUserIds || [],
          targetRoleCodes: alertDetail.targetRoleCodes || []
        };

        await alertDialog.showAlertForm({
          isEdit: true,
          formData,
          userOptions: userOptions.value,
          roleOptions: roleOptions.value,
          onConfirm: async (data: AlertFormData) => {
            try {
              const updateData: Api.AlertManagement.UpdateAlertRequest = {
                name: data.name,
                description: data.description || undefined,
                level: data.level,
                condition: data.condition || undefined,
                threshold: data.threshold || undefined,
                metric: data.metric || undefined,
                isEnabled: data.isEnabled,
                targetUserIds: data.targetUserIds.length > 0 ? data.targetUserIds : undefined,
                targetRoleCodes: data.targetRoleCodes.length > 0 ? data.targetRoleCodes : undefined
              };
              await fetchUpdateAlert(row.id, updateData);
              message.success($t('common.updateSuccess'));
              getData();
            } catch (error: any) {
              message.error(error?.message || '操作失败');
              throw error;
            }
          }
        });
      } catch (error: any) {
        message.error(error?.message || $t('page.alertManagement.getDetailFailed' as any));
      }
    }

    // 切换告警状态（启用/禁用）
    async function handleToggleStatus(alertId: number, isEnabled: boolean) {
      try {
        await fetchToggleAlertStatus(alertId, isEnabled);
        message.success($t('page.alertManagement.toggleStatusSuccess' as any));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
        getData(); // 刷新数据以恢复状态
      }
    }

    // 确认告警
    async function handleAcknowledge(row: Alert) {
      try {
        await fetchAcknowledgeAlert(row.id);
        message.success($t('page.alertManagement.acknowledgeSuccess' as any));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
      }
    }

    // 解决告警
    async function handleResolve(row: Alert) {
      try {
        await fetchResolveAlert(row.id);
        message.success($t('page.alertManagement.resolveSuccess' as any));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
      }
    }

    // 删除告警
    async function handleDelete(row: Alert) {
      await dialog.confirmDelete(row.name, async () => {
        try {
          await fetchDeleteAlert(row.id);
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
          title: $t('page.alertManagement.name' as any),
          key: 'name',
          width: 200
        },
        {
          title: $t('page.alertManagement.level' as any),
          key: 'level',
          width: 120,
          render: (row: Alert) => {
            const levelMap: Record<string, { label: string; type: 'error' | 'warning' | 'info' }> = {
              critical: { label: $t('page.alertManagement.levelCritical' as any), type: 'error' },
              warning: { label: $t('page.alertManagement.levelWarning' as any), type: 'warning' },
              info: { label: $t('page.alertManagement.levelInfo' as any), type: 'info' }
            };
            const level = levelMap[row.level] || { label: row.level, type: 'info' };
            return <NTag type={level.type}>{level.label}</NTag>;
          }
        },
        {
          title: $t('page.alertManagement.status' as any),
          key: 'status',
          width: 120,
          render: (row: Alert) => {
            const statusMap: Record<string, string> = {
              active: $t('page.alertManagement.statusActive' as any),
              resolved: $t('page.alertManagement.statusResolved' as any),
              acknowledged: $t('page.alertManagement.statusAcknowledged' as any)
            };
            return statusMap[row.status] || row.status;
          }
        },
        {
          title: $t('page.alertManagement.metric' as any),
          key: 'metric',
          width: 120,
          render: (row: Alert) => {
            return row.metric || '-';
          }
        },
        {
          title: $t('page.alertManagement.threshold' as any),
          key: 'threshold',
          width: 100,
          render: (row: Alert) => {
            return row.threshold !== null ? row.threshold : '-';
          }
        },
        {
          title: $t('page.alertManagement.triggerCount' as any),
          key: 'triggerCount',
          width: 120,
          render: (row: Alert) => {
            return row.triggerCount !== null ? row.triggerCount : '-';
          }
        },
        {
          title: $t('page.alertManagement.targetUsers' as any),
          key: 'targetUserIds',
          width: 150,
          render: (row: Alert) => {
            if (!row.targetUserIds || row.targetUserIds.length === 0) {
              return row.targetRoleCodes && row.targetRoleCodes.length > 0
                ? $t('page.alertManagement.targetRoles' as any)
                : $t('page.alertManagement.allUsers' as any);
            }
            return `${row.targetUserIds.length} ${$t('page.alertManagement.users' as any)}`;
          }
        },
        {
          title: $t('page.alertManagement.enabled' as any),
          key: 'isEnabled',
          width: 100,
          render: (row: Alert) => (
            <NSwitch
              value={row.isEnabled}
              onUpdateValue={value => handleToggleStatus(row.id, value)}
              loading={false}
            />
          )
        },
        {
          title: $t('page.alertManagement.lastTriggeredAt' as any),
          key: 'lastTriggeredAt',
          width: 180,
          render: (row: Alert) => {
            if (!row.lastTriggeredAt) return '-';
            return new Date(row.lastTriggeredAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.alertManagement.createdAt' as any),
          key: 'createdAt',
          width: 180,
          render: (row: Alert) => {
            if (!row.createdAt) return '-';
            return new Date(row.createdAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('common.operate'),
          key: 'operate',
          width: 280,
          fixed: 'right',
          render: (row: Alert) => (
            <NSpace size="small">
              <NButton size="small" type="primary" onClick={() => handleEdit(row)}>
                {$t('common.edit')}
              </NButton>
              {row.status === 'active' && (
                <>
                  <NButton size="small" type="info" onClick={() => handleAcknowledge(row)}>
                    {$t('page.alertManagement.acknowledge' as any)}
                  </NButton>
                  <NButton size="small" type="success" onClick={() => handleResolve(row)}>
                    {$t('page.alertManagement.resolve' as any)}
                  </NButton>
                </>
              )}
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
        apiFn: fetchAlertList,
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
        message.warning($t('page.alertManagement.selectAlertsToDelete' as any));
        return;
      }
      await dialog.confirmDelete(
        $t('page.alertManagement.confirmBatchDelete' as any, { count: selectedRowKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeleteAlerts({ ids: selectedRowKeys.value });
            message.success($t('page.alertManagement.batchDeleteSuccess' as any));
            selectedRowKeys.value = [];
            getData();
          } catch (error: any) {
            message.error(error?.message || $t('common.error'));
          }
        }
      );
    }

    // 初始化时加载用户和角色
    onMounted(() => {
      loadUsersAndRoles();
    });

    return () => (
      <NSpace vertical size={16}>
        {/* 搜索栏 */}
        <NCard>
          <NForm ref={searchFormRef} model={searchForm} inline>
            <NFormItem path="search">
              <NInput
                v-model:value={searchForm.search}
                placeholder={$t('page.alertManagement.searchPlaceholder' as any)}
                style={{ width: '200px' }}
                clearable
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </NFormItem>
            <NFormItem path="level">
              <NSelect
                v-model:value={searchForm.level}
                placeholder={$t('page.alertManagement.levelPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={levelOptions}
              />
            </NFormItem>
            <NFormItem path="status">
              <NSelect
                v-model:value={searchForm.status}
                placeholder={$t('page.alertManagement.statusPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={statusOptions}
              />
            </NFormItem>
            <NFormItem path="isEnabled">
              <NSelect
                v-model:value={searchForm.isEnabled}
                placeholder={$t('page.alertManagement.enabledStatusPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.alertManagement.enabled' as any), value: true as any },
                  { label: $t('page.alertManagement.disabled' as any), value: false as any }
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
            rowKey={(row: Alert) => row.id}
            checkedRowKeys={selectedRowKeys.value}
            onUpdateCheckedRowKeys={(keys) => {
              selectedRowKeys.value = keys as number[];
            }}
            scrollX={2400}
          />
        </NCard>
      </NSpace>
    );
  }
});

