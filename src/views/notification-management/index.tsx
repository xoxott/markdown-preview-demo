import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  fetchBatchDeleteNotifications,
  fetchCreateNotification,
  fetchDeleteNotification,
  fetchNotificationDetail,
  fetchNotificationList,
  fetchToggleNotificationStatus,
  fetchUpdateNotification
} from '@/service/api/notification';
import { fetchUserList } from '@/service/api/user';
import { fetchRoleList } from '@/service/api/role';
import TablePage from '@/components/table-page/TablePage';
import { useAdminListTable } from '@/components/table-page/hooks';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { useNotificationDialog } from './components/useNotificationDialog';
import type { NotificationFormData } from './components/dialog';
import {
  NOTIFICATION_LIST_SCROLL_X,
  createNotificationSearchFields,
  createNotificationTableColumns
} from './listUiConfig';

type Notification = Api.NotificationManagement.Notification;

export default defineComponent({
  name: 'NotificationManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const notificationDialog = useNotificationDialog();
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
        apiFn: fetchNotificationList,
        listFilters: {
          search: '',
          isSent: undefined as boolean | undefined,
          type: undefined as string | undefined,
          targetUserId: undefined as number | undefined,
          sortBy: undefined as string | undefined,
          sortOrder: undefined as 'asc' | 'desc' | undefined
        },
        showTotal: true,
        immediate: true
      });

    async function handleAdd() {
      if (users.value.length === 0 || roles.value.length === 0) {
        await loadUsersAndRoles();
      }

      const formData: NotificationFormData = {
        title: '',
        content: '',
        type: '',
        priority: null,
        isSent: false,
        sentAt: '',
        expiresAt: '',
        targetUserIds: [],
        targetRoleCodes: []
      };

      await notificationDialog.showNotificationForm({
        isEdit: false,
        formData,
        userOptions: userOptions.value,
        roleOptions: roleOptions.value,
        onConfirm: async (form: NotificationFormData) => {
          await fetchCreateNotification({
            title: form.title,
            content: form.content,
            type: form.type || undefined,
            priority: form.priority || undefined,
            isSent: form.isSent,
            sentAt: form.sentAt || undefined,
            expiresAt: form.expiresAt || undefined,
            targetUserIds: form.targetUserIds.length > 0 ? form.targetUserIds : undefined,
            targetRoleCodes: form.targetRoleCodes.length > 0 ? form.targetRoleCodes : undefined
          });
          message.success($t('common.addSuccess'));
          getData();
        }
      });
    }

    async function handleEdit(row: Notification) {
      const { data: notificationDetail } = await fetchNotificationDetail(row.id);
      if (!notificationDetail) {
        message.error($t('page.notificationManagement.getDetailFailed'));
        return;
      }

      await ensureUsersAndRolesLoaded();

      const formData: NotificationFormData = {
        title: notificationDetail.title,
        content: notificationDetail.content,
        type: notificationDetail.type || '',
        priority: notificationDetail.priority,
        isSent: notificationDetail.isSent,
        sentAt: notificationDetail.sentAt || '',
        expiresAt: notificationDetail.expiresAt || '',
        targetUserIds: notificationDetail.targetUserIds || [],
        targetRoleCodes: notificationDetail.targetRoleCodes || []
      };

      await notificationDialog.showNotificationForm({
        isEdit: true,
        formData,
        userOptions: userOptions.value,
        roleOptions: roleOptions.value,
        onConfirm: async (form: NotificationFormData) => {
          const updateData: Api.NotificationManagement.UpdateNotificationRequest = {
            title: form.title,
            content: form.content,
            type: form.type || undefined,
            priority: form.priority || undefined,
            isSent: form.isSent,
            sentAt: form.sentAt || undefined,
            expiresAt: form.expiresAt || undefined,
            targetUserIds: form.targetUserIds.length > 0 ? form.targetUserIds : undefined,
            targetRoleCodes: form.targetRoleCodes.length > 0 ? form.targetRoleCodes : undefined
          };
          await fetchUpdateNotification(row.id, updateData);
          message.success($t('common.updateSuccess'));
          getData();
        }
      });
    }

    async function handleToggleStatus(notificationId: number, isSent: boolean) {
      try {
        await fetchToggleNotificationStatus(notificationId, isSent);
        message.success($t('page.notificationManagement.toggleStatusSuccess'));
        getData();
      } catch {
        getData();
      }
    }

    async function handleDelete(row: Notification) {
      await dialog.confirmDelete(row.title, async () => {
        await fetchDeleteNotification(row.id);
        message.success($t('common.deleteSuccess'));
        getData();
      });
    }

    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.notificationManagement.selectNotificationsToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.notificationManagement.confirmBatchDelete', {
          count: selectedRowKeys.value.length
        }),
        async () => {
          await fetchBatchDeleteNotifications({ ids: selectedRowKeys.value });
          message.success($t('page.notificationManagement.batchDeleteSuccess'));
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

    const searchConfig = computed(() => createNotificationSearchFields());

    const tableColumns = computed(() =>
      createNotificationTableColumns({
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
        scrollX={NOTIFICATION_LIST_SCROLL_X}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
