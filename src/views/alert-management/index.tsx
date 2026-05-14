import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { NButton, NSpace, NSwitch, NTag, useMessage } from 'naive-ui';
import {
  fetchAcknowledgeAlert,
  fetchAlertDetail,
  fetchAlertList,
  fetchBatchDeleteAlerts,
  fetchCreateAlert,
  fetchDeleteAlert,
  fetchResolveAlert,
  fetchToggleAlertStatus,
  fetchUpdateAlert
} from '@/service/api/alert';
import { fetchUserList } from '@/service/api/user';
import { fetchRoleList } from '@/service/api/role';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import TablePage from '@/components/table-page/TablePage';
import { useAlertDialog } from './components/useAlertDialog';
import type { AlertFormData } from './components/dialog';

type Alert = Api.AlertManagement.Alert;

export default defineComponent({
  name: 'AlertManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const alertDialog = useAlertDialog();
    const dialog = useDialog(instance?.appContext.app);

    const selectedRowKeys = ref<number[]>([]);

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
      } catch {
        /* 全局 request 已提示；此处仅避免未处理 rejection */
      }
    }

    const {
      data,
      loading,
      pagination,
      getData,
      searchParams,
      updateSearchParams,
      resetSearchParams
    } = useTable<typeof fetchAlertList>({
      apiFn: fetchAlertList,
      apiParams: {
        page: 1,
        limit: 10,
        search: '',
        status: undefined as string | undefined,
        level: undefined as string | undefined,
        isEnabled: undefined as boolean | undefined,
        sortBy: undefined as string | undefined,
        sortOrder: undefined as 'asc' | 'desc' | undefined
      },
      columns: () => tableListPlaceholderColumns<typeof fetchAlertList>(),
      showTotal: true,
      immediate: true
    });

    async function handleAdd() {
      await ensureUsersAndRolesLoaded();

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
        onConfirm: async (form: AlertFormData) => {
          await fetchCreateAlert({
            name: form.name,
            description: form.description || undefined,
            level: form.level,
            condition: form.condition || undefined,
            threshold: form.threshold || undefined,
            metric: form.metric || undefined,
            isEnabled: form.isEnabled,
            targetUserIds: form.targetUserIds.length > 0 ? form.targetUserIds : undefined,
            targetRoleCodes: form.targetRoleCodes.length > 0 ? form.targetRoleCodes : undefined
          });
          message.success($t('common.addSuccess'));
          getData();
        }
      });
    }

    async function handleEdit(row: Alert) {
      const { data: alertDetail } = await fetchAlertDetail(row.id);
      if (!alertDetail) {
        message.error($t('page.alertManagement.getDetailFailed'));
        return;
      }

      await ensureUsersAndRolesLoaded();

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
        onConfirm: async (form: AlertFormData) => {
          const updateData: Api.AlertManagement.UpdateAlertRequest = {
            name: form.name,
            description: form.description || undefined,
            level: form.level,
            condition: form.condition || undefined,
            threshold: form.threshold || undefined,
            metric: form.metric || undefined,
            isEnabled: form.isEnabled,
            targetUserIds: form.targetUserIds.length > 0 ? form.targetUserIds : undefined,
            targetRoleCodes: form.targetRoleCodes.length > 0 ? form.targetRoleCodes : undefined
          };
          await fetchUpdateAlert(row.id, updateData);
          message.success($t('common.updateSuccess'));
          getData();
        }
      });
    }

    async function handleToggleStatus(alertId: number, isEnabled: boolean) {
      try {
        await fetchToggleAlertStatus(alertId, isEnabled);
        message.success($t('page.alertManagement.toggleStatusSuccess'));
        getData();
      } catch {
        getData();
      }
    }

    async function handleAcknowledge(row: Alert) {
      await fetchAcknowledgeAlert(row.id);
      message.success($t('page.alertManagement.acknowledgeSuccess'));
      getData();
    }

    async function handleResolve(row: Alert) {
      await fetchResolveAlert(row.id);
      message.success($t('page.alertManagement.resolveSuccess'));
      getData();
    }

    async function handleDelete(row: Alert) {
      await dialog.confirmDelete(row.name, async () => {
        await fetchDeleteAlert(row.id);
        message.success($t('common.deleteSuccess'));
        getData();
      });
    }

    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.alertManagement.selectAlertsToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.alertManagement.confirmBatchDelete', {
          count: selectedRowKeys.value.length
        }),
        async () => {
          await fetchBatchDeleteAlerts({ ids: selectedRowKeys.value });
          message.success($t('page.alertManagement.batchDeleteSuccess'));
          selectedRowKeys.value = [];
          getData();
        }
      );
    }

    let usersAndRolesLoaded = false;
    async function ensureUsersAndRolesLoaded() {
      if (!usersAndRolesLoaded && (users.value.length === 0 || roles.value.length === 0)) {
        await loadUsersAndRoles();
        usersAndRolesLoaded = true;
      }
    }

    const searchConfig = computed<SearchFieldConfig[]>(() => [
      {
        type: 'input',
        field: 'search',
        placeholder: $t('page.alertManagement.searchPlaceholder'),
        icon: 'i-carbon-search',
        width: '200px'
      },
      {
        type: 'select',
        field: 'level',
        placeholder: $t('page.alertManagement.levelPlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.alertManagement.levelCritical'), value: 'critical' },
          { label: $t('page.alertManagement.levelWarning'), value: 'warning' },
          { label: $t('page.alertManagement.levelInfo'), value: 'info' }
        ]
      },
      {
        type: 'select',
        field: 'status',
        placeholder: $t('page.alertManagement.statusPlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.alertManagement.statusActive'), value: 'active' },
          { label: $t('page.alertManagement.statusResolved'), value: 'resolved' },
          { label: $t('page.alertManagement.statusAcknowledged'), value: 'acknowledged' }
        ]
      },
      {
        type: 'select',
        field: 'isEnabled',
        placeholder: $t('page.alertManagement.enabledStatusPlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.alertManagement.enabled'), value: true },
          { label: $t('page.alertManagement.disabled'), value: false }
        ]
      }
    ]);

    const tableColumns = computed((): TableColumnConfig<Alert>[] => [
      {
        title: $t('page.alertManagement.name'),
        key: 'name',
        width: 200
      },
      {
        title: $t('page.alertManagement.level'),
        key: 'level',
        width: 120,
        render: (row: Alert) => {
          const levelMap: Record<string, { label: string; type: 'error' | 'warning' | 'info' }> = {
            critical: { label: $t('page.alertManagement.levelCritical'), type: 'error' },
            warning: { label: $t('page.alertManagement.levelWarning'), type: 'warning' },
            info: { label: $t('page.alertManagement.levelInfo'), type: 'info' }
          };
          const level = levelMap[row.level] || { label: row.level, type: 'info' };
          return <NTag type={level.type}>{level.label}</NTag>;
        }
      },
      {
        title: $t('page.alertManagement.status'),
        key: 'status',
        width: 120,
        render: (row: Alert) => {
          const statusMap: Record<string, string> = {
            active: $t('page.alertManagement.statusActive'),
            resolved: $t('page.alertManagement.statusResolved'),
            acknowledged: $t('page.alertManagement.statusAcknowledged')
          };
          return statusMap[row.status] || row.status;
        }
      },
      {
        title: $t('page.alertManagement.metric'),
        key: 'metric',
        width: 120,
        render: (row: Alert) => row.metric || '-'
      },
      {
        title: $t('page.alertManagement.threshold'),
        key: 'threshold',
        width: 100,
        render: (row: Alert) => (row.threshold !== null ? row.threshold : '-')
      },
      {
        title: $t('page.alertManagement.triggerCount'),
        key: 'triggerCount',
        width: 120,
        render: (row: Alert) => (row.triggerCount !== null ? row.triggerCount : '-')
      },
      {
        title: $t('page.alertManagement.targetUsers'),
        key: 'targetUserIds',
        width: 150,
        render: (row: Alert) => {
          if (!row.targetUserIds || row.targetUserIds.length === 0) {
            return row.targetRoleCodes && row.targetRoleCodes.length > 0
              ? $t('page.alertManagement.targetRoles')
              : $t('page.alertManagement.allUsers');
          }
          return `${row.targetUserIds.length} ${$t('page.alertManagement.users')}`;
        }
      },
      {
        title: $t('page.alertManagement.enabled'),
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
        title: $t('page.alertManagement.lastTriggeredAt'),
        key: 'lastTriggeredAt',
        width: 180,
        render: (row: Alert) => {
          if (!row.lastTriggeredAt) return '-';
          return new Date(row.lastTriggeredAt).toLocaleString('zh-CN');
        }
      },
      {
        title: $t('page.alertManagement.createdAt'),
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
                  {$t('page.alertManagement.acknowledge')}
                </NButton>
                <NButton size="small" type="success" onClick={() => handleResolve(row)}>
                  {$t('page.alertManagement.resolve')}
                </NButton>
              </>
            )}
            <NButton size="small" type="error" onClick={() => handleDelete(row)}>
              {$t('common.delete')}
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
        scrollX={2400}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
