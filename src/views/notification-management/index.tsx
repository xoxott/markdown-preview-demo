import type { NotificationFormData } from '@/components/notification-management/dialog';
import { useNotificationDialog } from '@/components/notification-management/useNotificationDialog';
import { useNaiveForm } from '@/hooks/common/form';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
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

type Notification = Api.NotificationManagement.Notification;

export default defineComponent({
  name: 'NotificationManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const notificationDialog = useNotificationDialog();
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

    // 类型选项（用于搜索筛选）
    const typeOptions = [
      { label: $t('page.notificationManagement.all' as any), value: undefined },
      { label: $t('page.notificationManagement.typeInfo' as any), value: 'info' },
      { label: $t('page.notificationManagement.typeWarning' as any), value: 'warning' },
      { label: $t('page.notificationManagement.typeError' as any), value: 'error' },
      { label: $t('page.notificationManagement.typeSuccess' as any), value: 'success' }
    ];

    // 搜索表单数据
    const searchForm = reactive({
      search: '',
      isSent: undefined,
      type: undefined,
      targetUserId: undefined,
      sortBy: undefined as string | undefined,
      sortOrder: undefined as 'asc' | 'desc' | undefined
    });

    // 打开新增对话框
    async function handleAdd() {
      // 确保用户和角色列表已加载
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
        onConfirm: async (data: NotificationFormData) => {
          try {
            await fetchCreateNotification({
              title: data.title,
              content: data.content,
              type: data.type || undefined,
              priority: data.priority || undefined,
              isSent: data.isSent,
              sentAt: data.sentAt || undefined,
              expiresAt: data.expiresAt || undefined,
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
    async function handleEdit(row: Notification) {
      try {
        const { data: notificationDetail } = await fetchNotificationDetail(row.id);
        if (!notificationDetail) {
          message.error($t('page.notificationManagement.getDetailFailed' as any));
          return;
        }

        // 确保用户和角色列表已加载
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
          onConfirm: async (data: NotificationFormData) => {
            try {
              const updateData: Api.NotificationManagement.UpdateNotificationRequest = {
                title: data.title,
                content: data.content,
                type: data.type || undefined,
                priority: data.priority || undefined,
                isSent: data.isSent,
                sentAt: data.sentAt || undefined,
                expiresAt: data.expiresAt || undefined,
                targetUserIds: data.targetUserIds.length > 0 ? data.targetUserIds : undefined,
                targetRoleCodes: data.targetRoleCodes.length > 0 ? data.targetRoleCodes : undefined
              };
              await fetchUpdateNotification(row.id, updateData);
              message.success($t('common.updateSuccess'));
              getData();
            } catch (error: any) {
              message.error(error?.message || '操作失败');
              throw error;
            }
          }
        });
      } catch (error: any) {
        message.error(error?.message || $t('page.notificationManagement.getDetailFailed' as any));
      }
    }

    // 切换通知状态
    async function handleToggleStatus(notificationId: number, isSent: boolean) {
      try {
        await fetchToggleNotificationStatus(notificationId, isSent);
        message.success($t('page.notificationManagement.toggleStatusSuccess' as any));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
        getData(); // 刷新数据以恢复状态
      }
    }

    // 删除通知
    async function handleDelete(row: Notification) {
      await dialog.confirmDelete(row.title, async () => {
        try {
          await fetchDeleteNotification(row.id);
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
          title: $t('page.notificationManagement.title' as any),
          key: 'title',
          width: 200
        },
        {
          title: $t('page.notificationManagement.content' as any),
          key: 'content',
          width: 300,
          render: (row: Notification) => {
            const content = row.content || '-';
            return content.length > 50 ? content.substring(0, 50) + '...' : content;
          }
        },
        {
          title: $t('page.notificationManagement.type' as any),
          key: 'type',
          width: 120,
          render: (row: Notification) => {
            if (!row.type) return '-';
            const typeMap: Record<string, string> = {
              info: $t('page.notificationManagement.typeInfo' as any),
              warning: $t('page.notificationManagement.typeWarning' as any),
              error: $t('page.notificationManagement.typeError' as any),
              success: $t('page.notificationManagement.typeSuccess' as any)
            };
            return <NTag type="info">{typeMap[row.type] || row.type}</NTag>;
          }
        },
        {
          title: $t('page.notificationManagement.priority' as any),
          key: 'priority',
          width: 100,
          render: (row: Notification) => {
            return row.priority || '-';
          }
        },
        {
          title: $t('page.notificationManagement.targetUsers' as any),
          key: 'targetUserIds',
          width: 150,
          render: (row: Notification) => {
            if (!row.targetUserIds || row.targetUserIds.length === 0) {
              return row.targetRoleCodes && row.targetRoleCodes.length > 0
                ? $t('page.notificationManagement.targetRoles' as any)
                : $t('page.notificationManagement.allUsers' as any);
            }
            return `${row.targetUserIds.length} ${$t('page.notificationManagement.users' as any)}`;
          }
        },
        {
          title: $t('page.notificationManagement.readStatus' as any),
          key: 'readStatus',
          width: 120,
          render: (row: Notification) => {
            if (row.readCount !== null && row.totalCount !== null && row.totalCount > 0) {
              return `${row.readCount}/${row.totalCount}`;
            }
            return '-';
          }
        },
        {
          title: $t('page.notificationManagement.status' as any),
          key: 'isSent',
          width: 120,
          render: (row: Notification) => (
            <NSwitch
              value={row.isSent}
              onUpdateValue={value => handleToggleStatus(row.id, value)}
              loading={false}
            />
          )
        },
        {
          title: $t('page.notificationManagement.sentAt' as any),
          key: 'sentAt',
          width: 180,
          render: (row: Notification) => {
            if (!row.sentAt) return '-';
            return new Date(row.sentAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.notificationManagement.expiresAt' as any),
          key: 'expiresAt',
          width: 180,
          render: (row: Notification) => {
            if (!row.expiresAt) return '-';
            return new Date(row.expiresAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.notificationManagement.createdAt' as any),
          key: 'createdAt',
          width: 180,
          render: (row: Notification) => {
            if (!row.createdAt) return '-';
            return new Date(row.createdAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('common.operate'),
          key: 'operate',
          width: 200,
          fixed: 'right',
          render: (row: Notification) => (
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
        apiFn: fetchNotificationList,
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
        message.warning($t('page.notificationManagement.selectNotificationsToDelete' as any));
        return;
      }
      await dialog.confirmDelete(
        $t('page.notificationManagement.confirmBatchDelete' as any, { count: selectedRowKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeleteNotifications({ ids: selectedRowKeys.value });
            message.success($t('page.notificationManagement.batchDeleteSuccess' as any));
            selectedRowKeys.value = [];
            getData();
          } catch (error: any) {
            message.error(error?.message || $t('common.error'));
          }
        }
      );
    }

    // 按需加载用户和角色列表（只在需要时加载）
    let usersAndRolesLoaded = false;
    async function ensureUsersAndRolesLoaded() {
      if (!usersAndRolesLoaded && (users.value.length === 0 || roles.value.length === 0)) {
        await loadUsersAndRoles();
        usersAndRolesLoaded = true;
      }
    }

    return () => (
      <NSpace vertical size={16}>
        {/* 搜索栏 */}
        <NCard>
          <NForm ref={searchFormRef} model={searchForm} inline>
            <NFormItem path="search">
              <NInput
                v-model:value={searchForm.search}
                placeholder={$t('page.notificationManagement.searchPlaceholder' as any)}
                style={{ width: '200px' }}
                clearable
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </NFormItem>
            <NFormItem path="type">
              <NSelect
                v-model:value={searchForm.type}
                placeholder={$t('page.notificationManagement.typePlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={typeOptions}
              />
            </NFormItem>
            <NFormItem path="isSent">
              <NSelect
                v-model:value={searchForm.isSent}
                placeholder={$t('page.notificationManagement.statusPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.notificationManagement.sent' as any), value: true as any },
                  { label: $t('page.notificationManagement.unsent' as any), value: false as any }
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
            rowKey={(row: Notification) => row.id}
            checkedRowKeys={selectedRowKeys.value}
            onUpdateCheckedRowKeys={(keys) => {
              selectedRowKeys.value = keys as number[];
            }}
            scrollX={2200}
          />
        </NCard>
      </NSpace>
    );
  }
});

