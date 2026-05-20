import { computed, defineComponent, getCurrentInstance, onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  fetchBatchDeleteLogs,
  fetchClearLogs,
  fetchDeleteLog,
  fetchLogDetail,
  fetchLogList
} from '@/service/api/log';
import { fetchUserList } from '@/service/api/user';
import TablePage from '@/components/table-page/TablePage';
import { useAdminListTable } from '@/components/table-page/hooks';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { useLogDialog } from './components/useLogDialog';
import {
  LOG_LIST_SCROLL_X,
  createLogSearchFields,
  createLogTableColumns,
  serializeLogListFilters
} from './listUiConfig';

type Log = Api.LogManagement.Log;

function fetchLogListForTable(params: Api.LogManagement.LogListParams) {
  return fetchLogList({
    ...params,
    ...serializeLogListFilters(params as unknown as Record<string, unknown>)
  });
}

export default defineComponent({
  name: 'LogManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const dialog = useDialog(instance?.appContext.app);
    const logDialog = useLogDialog(instance?.appContext.app);

    const selectedRowKeys = ref<number[]>([]);

    const users = ref<Api.UserManagement.User[]>([]);
    const userOptions = computed(() =>
      users.value.map(user => ({
        label: `${user.username} (${user.email})`,
        value: user.id
      }))
    );

    async function loadUsers() {
      try {
        const { data } = await fetchUserList({ page: 1, limit: 1000 });
        users.value = data?.lists ?? [];
      } catch {
        users.value = [];
      }
    }

    const { data, loading, pagination, getData, searchParams, onSearch, onReset } =
      useAdminListTable({
        apiFn: fetchLogListForTable,
        listFilters: {
          search: '',
          userId: undefined,
          ip: undefined,
          statusCode: undefined,
          method: undefined,
          startDate: undefined,
          endDate: undefined,
          sortBy: undefined,
          sortOrder: undefined
        },
        showTotal: true,
        immediate: true
      });

    async function handleViewDetail(row: Log) {
      try {
        const { data: logDetail } = await fetchLogDetail(row.id);
        if (logDetail) {
          await logDialog.showLogDetail({ log: logDetail });
        }
      } catch (error: unknown) {
        const err = error as { message?: string };
        message.error(err?.message || $t('page.logManagement.getDetailFailed'));
      }
    }

    async function handleDelete(row: Log) {
      await dialog.confirmDelete($t('page.logManagement.confirmDelete'), async () => {
        await fetchDeleteLog(row.id);
        message.success($t('common.deleteSuccess'));
        getData();
      });
    }

    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.logManagement.selectLogsToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.logManagement.confirmBatchDelete', { count: selectedRowKeys.value.length }),
        async () => {
          await fetchBatchDeleteLogs({ ids: selectedRowKeys.value });
          message.success($t('page.logManagement.batchDeleteSuccess'));
          selectedRowKeys.value = [];
          getData();
        }
      );
    }

    async function handleClearLogs() {
      await dialog.confirmDelete($t('page.logManagement.confirmClearLogs'), async () => {
        await fetchClearLogs();
        message.success($t('page.logManagement.clearLogsSuccess'));
        selectedRowKeys.value = [];
        getData();
      });
    }

    onMounted(() => {
      loadUsers();
    });

    const searchConfig = computed(() => createLogSearchFields(userOptions.value));

    const tableColumns = computed(() =>
      createLogTableColumns({
        onView: handleViewDetail,
        onDelete: handleDelete
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
            batchDelete: { onClick: handleBatchDelete },
            refresh: { onClick: getData }
          },
          custom: [
            {
              label: $t('page.logManagement.clearLogs'),
              icon: 'carbon:clean',
              type: 'warning',
              onClick: handleClearLogs
            }
          ]
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
        scrollX={LOG_LIST_SCROLL_X}
        searchLabelWidth={96}
        searchSectionCollapsible
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
