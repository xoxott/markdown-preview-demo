import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { useMessage } from 'naive-ui';
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
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import TablePage from '@/components/table-page/TablePage';
import { useAdminListTable } from '@/components/table-page/hooks';
import { useAlertDialog } from './components/useAlertDialog';
import type { AlertFormData } from './components/dialog';
import {
  ALERT_LIST_SCROLL_X,
  createAlertSearchFields,
  createAlertTableColumns
} from './listUiConfig';

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

    const { data, loading, pagination, getData, searchParams, onSearch, onReset } =
      useAdminListTable({
        apiFn: fetchAlertList,
        listFilters: {
          search: '',
          status: undefined as string | undefined,
          level: undefined as string | undefined,
          isEnabled: undefined as number | undefined,
          sortBy: undefined as string | undefined,
          sortOrder: undefined as 'asc' | 'desc' | undefined
        },
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

    const searchConfig = computed(() => createAlertSearchFields());

    const tableColumns = computed(() =>
      createAlertTableColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onToggleStatus: handleToggleStatus,
        onAcknowledge: handleAcknowledge,
        onResolve: handleResolve
      })
    );

    return () => (
      <TablePage
        class="h-full"
        enableColumnSetting={true}
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
        scrollX={ALERT_LIST_SCROLL_X}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
