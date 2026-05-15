import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { useMessage } from 'naive-ui';
import {
  fetchBatchDeleteVersionLogs,
  fetchCreateVersionLog,
  fetchDeleteVersionLog,
  fetchToggleVersionLogStatus,
  fetchUpdateVersionLog,
  fetchVersionLogDetail,
  fetchVersionLogList
} from '@/service/api/version-log';
import { useDialog } from '@/components/base-dialog/useDialog';
import TablePage from '@/components/table-page/TablePage';
import { useAdminListTable } from '@/components/table-page/hooks';
import { $t } from '@/locales';
import type { VersionLogFormData } from './components/dialog';
import { useVersionLogDialog } from './components/useVersionLogDialog';
import {
  VERSION_LOG_LIST_SCROLL_X,
  createVersionLogSearchFields,
  createVersionLogTableColumns,
  normalizeVersionLogRemoteSorter
} from './listUiConfig';

type VersionLog = Api.VersionLogManagement.VersionLog;

export default defineComponent({
  name: 'VersionLogManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const versionLogDialog = useVersionLogDialog();
    const dialog = useDialog(instance?.appContext.app);

    const selectedRowKeys = ref<number[]>([]);

    const {
      data,
      loading,
      pagination,
      getData,
      searchParams,
      updateSearchParams,
      onSearch,
      onReset,
      getListLimit
    } = useAdminListTable({
      apiFn: fetchVersionLogList,
      listFilters: {
        search: '',
        isPublished: undefined as number | undefined,
        type: undefined as string | undefined,
        sortBy: undefined as string | undefined,
        sortOrder: undefined as 'asc' | 'desc' | undefined
      },
      showTotal: true,
      immediate: true
    });

    async function handleAdd() {
      const formData: VersionLogFormData = {
        version: '',
        type: '',
        releaseDate: '',
        content: '',
        features: '',
        fixes: '',
        improvements: '',
        isPublished: false,
        publishedAt: ''
      };

      await versionLogDialog.showVersionLogForm({
        isEdit: false,
        formData,
        onConfirm: async (form: VersionLogFormData) => {
          const features = form.features.trim()
            ? form.features.split('\n').filter(f => f.trim())
            : undefined;
          const fixes = form.fixes.trim()
            ? form.fixes.split('\n').filter(f => f.trim())
            : undefined;
          const improvements = form.improvements.trim()
            ? form.improvements.split('\n').filter(f => f.trim())
            : undefined;

          await fetchCreateVersionLog({
            version: form.version,
            type: form.type,
            releaseDate: form.releaseDate,
            content: form.content,
            features,
            fixes,
            improvements,
            isPublished: form.isPublished,
            publishedAt: form.publishedAt || undefined
          });
          message.success($t('common.addSuccess'));
          getData();
        }
      });
    }

    async function handleEdit(row: VersionLog) {
      const { data: versionLogDetail } = await fetchVersionLogDetail(row.id);
      if (!versionLogDetail) {
        message.error($t('page.versionLogManagement.getDetailFailed'));
        return;
      }

      const formData: VersionLogFormData = {
        version: versionLogDetail.version,
        type: versionLogDetail.type,
        releaseDate: versionLogDetail.releaseDate,
        content: versionLogDetail.content,
        features: versionLogDetail.features?.join('\n') || '',
        fixes: versionLogDetail.fixes?.join('\n') || '',
        improvements: versionLogDetail.improvements?.join('\n') || '',
        isPublished: versionLogDetail.isPublished,
        publishedAt: versionLogDetail.publishedAt || ''
      };

      await versionLogDialog.showVersionLogForm({
        isEdit: true,
        formData,
        onConfirm: async (form: VersionLogFormData) => {
          const features = form.features.trim()
            ? form.features.split('\n').filter(f => f.trim())
            : undefined;
          const fixes = form.fixes.trim()
            ? form.fixes.split('\n').filter(f => f.trim())
            : undefined;
          const improvements = form.improvements.trim()
            ? form.improvements.split('\n').filter(f => f.trim())
            : undefined;

          const updateData: Api.VersionLogManagement.UpdateVersionLogRequest = {
            type: form.type,
            releaseDate: form.releaseDate,
            content: form.content,
            features,
            fixes,
            improvements,
            isPublished: form.isPublished,
            publishedAt: form.publishedAt || undefined
          };
          await fetchUpdateVersionLog(row.id, updateData);
          message.success($t('common.updateSuccess'));
          getData();
        }
      });
    }

    async function handleToggleStatus(versionLogId: number, isPublished: boolean) {
      try {
        await fetchToggleVersionLogStatus(versionLogId, isPublished);
        message.success($t('page.versionLogManagement.toggleStatusSuccess'));
        getData();
      } catch {
        getData();
      }
    }

    async function handleDelete(row: VersionLog) {
      await dialog.confirmDelete(row.version, async () => {
        await fetchDeleteVersionLog(row.id);
        message.success($t('common.deleteSuccess'));
        getData();
      });
    }

    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.versionLogManagement.selectVersionLogsToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.versionLogManagement.confirmBatchDelete', {
          count: selectedRowKeys.value.length
        }),
        async () => {
          await fetchBatchDeleteVersionLogs({ ids: selectedRowKeys.value });
          message.success($t('page.versionLogManagement.batchDeleteSuccess'));
          selectedRowKeys.value = [];
          getData();
        }
      );
    }

    const searchConfig = computed(() => createVersionLogSearchFields());

    const tableColumns = computed(() =>
      createVersionLogTableColumns({
        onEdit: handleEdit,
        onDelete: handleDelete,
        onToggleStatus: handleToggleStatus
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
        scrollX={VERSION_LOG_LIST_SCROLL_X}
        searchCardBordered={false}
        actionCardBordered={false}
        tableProps={{
          remote: true,
          onUpdateSorter: sorter => {
            const { sortBy, sortOrder } = normalizeVersionLogRemoteSorter(sorter);
            updateSearchParams({
              sortBy,
              sortOrder,
              page: 1,
              limit: getListLimit()
            });
            getData();
          }
        }}
      />
    );
  }
});
