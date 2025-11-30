import { useNaiveForm } from '@/hooks/common/form';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import {
  fetchBatchDeleteLogs,
  fetchDeleteLog,
  fetchLogDetail,
  fetchLogList,
  fetchClearLogs
} from '@/service/api/log';
import { fetchUserList } from '@/service/api/user';
import {
  NButton,
  NCard,
  NDataTable,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTag,
  NDatePicker,
  useMessage
} from 'naive-ui';
import { defineComponent, getCurrentInstance, reactive, ref, computed, onMounted } from 'vue';
import { useDialog } from '@/components/base-dialog/useDialog';
import BaseDialog from '@/components/base-dialog';

type Log = Api.LogManagement.Log;

export default defineComponent({
  name: 'LogManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const dialog = useDialog(instance?.appContext.app);
    const { formRef: searchFormRef, resetFields } = useNaiveForm();

    const selectedRowKeys = ref<number[]>([]);
    const logDetailVisible = ref(false);
    const currentLogDetail = ref<Log | null>(null);

    // 用户选项
    const users = ref<Api.UserManagement.User[]>([]);
    const userOptions = computed(() => {
      return [
        { label: $t('page.logManagement.all' as any), value: undefined },
        ...users.value.map(user => ({
          label: `${user.username} (${user.email})`,
          value: user.id
        }))
      ];
    });

    // 加载用户列表
    async function loadUsers() {
      try {
        const usersRes = await fetchUserList({ page: 1, limit: 1000 });
        if (usersRes.data?.lists) {
          users.value = usersRes.data.lists;
        }
      } catch (error: any) {
        console.error('Failed to load users:', error);
      }
    }

    // 操作类型选项
    const actionOptions = [
      { label: $t('page.logManagement.all' as any), value: undefined },
      { label: $t('page.logManagement.actionCreate' as any), value: 'create' },
      { label: $t('page.logManagement.actionUpdate' as any), value: 'update' },
      { label: $t('page.logManagement.actionDelete' as any), value: 'delete' },
      { label: $t('page.logManagement.actionLogin' as any), value: 'login' },
      { label: $t('page.logManagement.actionLogout' as any), value: 'logout' },
      { label: $t('page.logManagement.actionRead' as any), value: 'read' }
    ];

    // 模块选项
    const moduleOptions = [
      { label: $t('page.logManagement.all' as any), value: undefined },
      { label: $t('page.logManagement.moduleUser' as any), value: 'user' },
      { label: $t('page.logManagement.moduleRole' as any), value: 'role' },
      { label: $t('page.logManagement.modulePermission' as any), value: 'permission' },
      { label: $t('page.logManagement.moduleAnnouncement' as any), value: 'announcement' },
      { label: $t('page.logManagement.moduleNotification' as any), value: 'notification' },
      { label: $t('page.logManagement.moduleAlert' as any), value: 'alert' },
      { label: $t('page.logManagement.moduleSystem' as any), value: 'system' }
    ];

    // 搜索表单数据
    const searchForm = reactive({
      search: '',
      action: undefined,
      module: undefined,
      userId: undefined,
      ip: undefined,
      responseStatus: undefined,
      startDate: null as number | null,
      endDate: null as number | null,
      sortBy: undefined as string | undefined,
      sortOrder: undefined as 'asc' | 'desc' | undefined
    });

    // 查看日志详情
    async function handleViewDetail(row: Log) {
      try {
        const { data: logDetail } = await fetchLogDetail(row.id);
        if (logDetail) {
          currentLogDetail.value = logDetail;
          logDetailVisible.value = true;
        }
      } catch (error: any) {
        message.error(error?.message || $t('page.logManagement.getDetailFailed' as any));
      }
    }

    // 删除日志
    async function handleDelete(row: Log) {
      await dialog.confirmDelete(
        $t('page.logManagement.confirmDelete' as any),
        async () => {
          try {
            await fetchDeleteLog(row.id);
            message.success($t('common.deleteSuccess'));
            getData();
          } catch (error: any) {
            message.error(error?.message || '操作失败');
          }
        }
      );
    }

    // 批量删除
    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.logManagement.selectLogsToDelete' as any));
        return;
      }
      await dialog.confirmDelete(
        $t('page.logManagement.confirmBatchDelete' as any, { count: selectedRowKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeleteLogs({ ids: selectedRowKeys.value });
            message.success($t('page.logManagement.batchDeleteSuccess' as any));
            selectedRowKeys.value = [];
            getData();
          } catch (error: any) {
            message.error(error?.message || $t('common.error'));
          }
        }
      );
    }

    // 清空日志
    async function handleClearLogs() {
      await dialog.confirmDelete(
        $t('page.logManagement.confirmClearLogs' as any),
        async () => {
          try {
            await fetchClearLogs();
            message.success($t('page.logManagement.clearLogsSuccess' as any));
            selectedRowKeys.value = [];
            getData();
          } catch (error: any) {
            message.error(error?.message || $t('common.error'));
          }
        }
      );
    }

    // 获取状态码颜色
    function getStatusColor(status: number | null): 'success' | 'warning' | 'error' | 'info' {
      if (!status) return 'info';
      if (status >= 200 && status < 300) return 'success';
      if (status >= 300 && status < 400) return 'info';
      if (status >= 400 && status < 500) return 'warning';
      return 'error';
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
          title: $t('page.logManagement.action' as any),
          key: 'action',
          width: 120,
          render: (row: Log) => {
            const actionMap: Record<string, string> = {
              create: $t('page.logManagement.actionCreate' as any),
              update: $t('page.logManagement.actionUpdate' as any),
              delete: $t('page.logManagement.actionDelete' as any),
              login: $t('page.logManagement.actionLogin' as any),
              logout: $t('page.logManagement.actionLogout' as any),
              read: $t('page.logManagement.actionRead' as any)
            };
            return actionMap[row.action] || row.action;
          }
        },
        {
          title: $t('page.logManagement.module' as any),
          key: 'module',
          width: 120,
          render: (row: Log) => {
            return row.module || '-';
          }
        },
        {
          title: $t('page.logManagement.username' as any),
          key: 'username',
          width: 150,
          render: (row: Log) => {
            return row.username || '-';
          }
        },
        {
          title: $t('page.logManagement.ip' as any),
          key: 'ip',
          width: 150,
          render: (row: Log) => {
            return row.ip || '-';
          }
        },
        {
          title: $t('page.logManagement.requestMethod' as any),
          key: 'requestMethod',
          width: 100,
          render: (row: Log) => {
            if (!row.requestMethod) return '-';
            const methodColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
              GET: 'info',
              POST: 'success',
              PUT: 'warning',
              DELETE: 'error',
              PATCH: 'warning'
            };
            return (
              <NTag type={methodColors[row.requestMethod] || 'info'} size="small">
                {row.requestMethod}
              </NTag>
            );
          }
        },
        {
          title: $t('page.logManagement.requestUrl' as any),
          key: 'requestUrl',
          width: 300,
          render: (row: Log) => {
            const url = row.requestUrl || '-';
            return url.length > 50 ? url.substring(0, 50) + '...' : url;
          }
        },
        {
          title: $t('page.logManagement.responseStatus' as any),
          key: 'responseStatus',
          width: 120,
          render: (row: Log) => {
            if (row.responseStatus === null) return '-';
            return (
              <NTag type={getStatusColor(row.responseStatus)} size="small">
                {row.responseStatus}
              </NTag>
            );
          }
        },
        {
          title: $t('page.logManagement.duration' as any),
          key: 'duration',
          width: 100,
          render: (row: Log) => {
            if (row.duration === null) return '-';
            return `${row.duration}ms`;
          }
        },
        {
          title: $t('page.logManagement.createdAt' as any),
          key: 'createdAt',
          width: 180,
          render: (row: Log) => {
            if (!row.createdAt) return '-';
            return new Date(row.createdAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('common.operate'),
          key: 'operate',
          width: 200,
          fixed: 'right',
          render: (row: Log) => (
            <NSpace size="small">
              <NButton size="small" type="info" onClick={() => handleViewDetail(row)}>
                {$t('common.view')}
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
        apiFn: fetchLogList,
        apiParams: {
          page: 1,
          limit: 10,
          ...searchForm,
          startDate: searchForm.startDate ? new Date(searchForm.startDate).toISOString() : undefined,
          endDate: searchForm.endDate ? new Date(searchForm.endDate).toISOString() : undefined
        },
        columns: () => createColumns() as any,
        showTotal: true
      });

    // 搜索
    function handleSearch() {
      updateSearchParams({
        page: 1,
        ...searchForm,
        startDate: searchForm.startDate ? new Date(searchForm.startDate).toISOString() : undefined,
        endDate: searchForm.endDate ? new Date(searchForm.endDate).toISOString() : undefined
      });
      getData();
    }

    // 重置搜索
    function handleReset() {
      resetFields();
      searchForm.startDate = null;
      searchForm.endDate = null;
      resetSearchParams();
      getData();
    }

    // 初始化时加载用户列表
    onMounted(() => {
      loadUsers();
    });

    return () => (
      <NSpace vertical size={16}>
        {/* 搜索栏 */}
        <NCard>
          <NForm ref={searchFormRef} model={searchForm} inline>
            <NFormItem path="search">
              <NInput
                v-model:value={searchForm.search}
                placeholder={$t('page.logManagement.searchPlaceholder' as any)}
                style={{ width: '200px' }}
                clearable
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </NFormItem>
            <NFormItem path="action">
              <NSelect
                v-model:value={searchForm.action}
                placeholder={$t('page.logManagement.actionPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={actionOptions}
              />
            </NFormItem>
            <NFormItem path="module">
              <NSelect
                v-model:value={searchForm.module}
                placeholder={$t('page.logManagement.modulePlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={moduleOptions}
              />
            </NFormItem>
            <NFormItem path="userId">
              <NSelect
                v-model:value={searchForm.userId}
                placeholder={$t('page.logManagement.userPlaceholder' as any)}
                style={{ width: '150px' }}
                clearable
                filterable
                options={userOptions.value}
              />
            </NFormItem>
            <NFormItem path="ip">
              <NInput
                v-model:value={searchForm.ip}
                placeholder={$t('page.logManagement.ipPlaceholder' as any)}
                style={{ width: '150px' }}
                clearable
              />
            </NFormItem>
            <NFormItem path="startDate">
              <NDatePicker
                v-model:value={searchForm.startDate}
                type="datetime"
                placeholder={$t('page.logManagement.startDatePlaceholder' as any)}
                clearable
                style={{ width: '180px' }}
              />
            </NFormItem>
            <NFormItem path="endDate">
              <NDatePicker
                v-model:value={searchForm.endDate}
                type="datetime"
                placeholder={$t('page.logManagement.endDatePlaceholder' as any)}
                clearable
                style={{ width: '180px' }}
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
            <NButton type="error" disabled={selectedRowKeys.value.length === 0} onClick={handleBatchDelete}>
              {$t('common.batchDelete')}
            </NButton>
            <NButton type="warning" onClick={handleClearLogs}>
              {$t('page.logManagement.clearLogs' as any)}
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
            rowKey={(row: Log) => row.id}
            checkedRowKeys={selectedRowKeys.value}
            onUpdateCheckedRowKeys={(keys) => {
              selectedRowKeys.value = keys as number[];
            }}
            scrollX={2400}
          />
        </NCard>

        {/* 日志详情对话框 */}
        <BaseDialog
          show={logDetailVisible.value}
          title={$t('page.logManagement.logDetail' as any)}
          width={900}
          height="auto"
          draggable={true}
          resizable={false}
          onClose={() => {
            logDetailVisible.value = false;
            currentLogDetail.value = null;
          }}
        >
          {{
            default: () => {
              if (!currentLogDetail.value) return null;
              const log = currentLogDetail.value;
              return (
                <NSpace vertical size={16}>
                  <NCard title={$t('page.logManagement.basicInfo' as any)} size="small">
                    <NSpace vertical size={12}>
                      <div>
                        <strong>{$t('page.logManagement.id' as any)}:</strong> {log.id}
                      </div>
                      <div>
                        <strong>{$t('page.logManagement.action' as any)}:</strong> {log.action}
                      </div>
                      <div>
                        <strong>{$t('page.logManagement.module' as any)}:</strong> {log.module || '-'}
                      </div>
                      <div>
                        <strong>{$t('page.logManagement.username' as any)}:</strong> {log.username || '-'}
                      </div>
                      <div>
                        <strong>{$t('page.logManagement.ip' as any)}:</strong> {log.ip || '-'}
                      </div>
                      <div>
                        <strong>{$t('page.logManagement.createdAt' as any)}:</strong>{' '}
                        {log.createdAt ? new Date(log.createdAt).toLocaleString('zh-CN') : '-'}
                      </div>
                    </NSpace>
                  </NCard>
                  <NCard title={$t('page.logManagement.requestInfo' as any)} size="small">
                    <NSpace vertical size={12}>
                      <div>
                        <strong>{$t('page.logManagement.requestMethod' as any)}:</strong> {log.requestMethod || '-'}
                      </div>
                      <div>
                        <strong>{$t('page.logManagement.requestUrl' as any)}:</strong> {log.requestUrl || '-'}
                      </div>
                      <div>
                        <strong>{$t('page.logManagement.userAgent' as any)}:</strong> {log.userAgent || '-'}
                      </div>
                      {log.requestBody && (
                        <div>
                          <strong>{$t('page.logManagement.requestBody' as any)}:</strong>
                          <pre style={{ marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
                            {typeof log.requestBody === 'string' ? log.requestBody : JSON.stringify(log.requestBody, null, 2)}
                          </pre>
                        </div>
                      )}
                    </NSpace>
                  </NCard>
                  <NCard title={$t('page.logManagement.responseInfo' as any)} size="small">
                    <NSpace vertical size={12}>
                      <div>
                        <strong>{$t('page.logManagement.responseStatus' as any)}:</strong>{' '}
                        {log.responseStatus !== null ? (
                          <NTag type={getStatusColor(log.responseStatus)} size="small">
                            {log.responseStatus}
                          </NTag>
                        ) : (
                          '-'
                        )}
                      </div>
                      <div>
                        <strong>{$t('page.logManagement.duration' as any)}:</strong> {log.duration !== null ? `${log.duration}ms` : '-'}
                      </div>
                      {log.responseBody && (
                        <div>
                          <strong>{$t('page.logManagement.responseBody' as any)}:</strong>
                          <pre style={{ marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'auto', maxHeight: '200px' }}>
                            {typeof log.responseBody === 'string' ? log.responseBody : JSON.stringify(log.responseBody, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.error && (
                        <div>
                          <strong>{$t('page.logManagement.error' as any)}:</strong>
                          <pre style={{ marginTop: '8px', padding: '8px', background: '#fff1f0', borderRadius: '4px', overflow: 'auto', maxHeight: '200px', color: '#cf1322' }}>
                            {log.error}
                          </pre>
                        </div>
                      )}
                    </NSpace>
                  </NCard>
                </NSpace>
              );
            },
            footer: () => (
              <NSpace justify="end">
                <NButton onClick={() => {
                  logDetailVisible.value = false;
                  currentLogDetail.value = null;
                }}>
                  {$t('common.close')}
                </NButton>
              </NSpace>
            )
          }}
        </BaseDialog>
      </NSpace>
    );
  }
});

