import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { NButton, NSpace, NSwitch, NTag, useMessage } from 'naive-ui';
import {
  fetchBatchDeleteVersionLogs,
  fetchCreateVersionLog,
  fetchDeleteVersionLog,
  fetchToggleVersionLogStatus,
  fetchUpdateVersionLog,
  fetchVersionLogDetail,
  fetchVersionLogList
} from '@/service/api/version-log';
import { useTable } from '@/hooks/common/table';
import TablePage from '@/components/table-page/TablePage';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';
import type { VersionLogFormData } from './components/dialog';
import { useVersionLogDialog } from './components/useVersionLogDialog';

type VersionLog = Api.VersionLogManagement.VersionLog;

function normalizeRemoteSorter(sorter: unknown) {
  const cleared = {
    sortBy: undefined as string | undefined,
    sortOrder: undefined as 'asc' | 'desc' | undefined
  };
  if (!sorter) return cleared;
  const list = Array.isArray(sorter) ? sorter : [sorter];
  const first = list[0] as { columnKey?: string | number; order?: unknown } | undefined;
  if (!first?.columnKey) return cleared;
  const order = first.order;
  if (order !== 'ascend' && order !== 'descend') return cleared;
  return {
    sortBy: String(first.columnKey),
    sortOrder: (order === 'ascend' ? 'asc' : 'desc') as 'asc' | 'desc'
  };
}

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
      resetSearchParams
    } = useTable<typeof fetchVersionLogList>({
      apiFn: fetchVersionLogList,
      apiParams: {
        page: 1,
        limit: 10,
        search: '',
        isPublished: undefined as boolean | undefined,
        type: undefined as string | undefined,
        sortBy: undefined as string | undefined,
        sortOrder: undefined as 'asc' | 'desc' | undefined
      },
      columns: () => tableListPlaceholderColumns<typeof fetchVersionLogList>(),
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

    const searchConfig = computed<SearchFieldConfig[]>(() => [
      {
        type: 'input',
        field: 'search',
        placeholder: $t('page.versionLogManagement.searchPlaceholder'),
        icon: 'i-carbon-search',
        width: '200px'
      },
      {
        type: 'select',
        field: 'type',
        placeholder: $t('page.versionLogManagement.typePlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.versionLogManagement.typeMajor'), value: 'major' },
          { label: $t('page.versionLogManagement.typeMinor'), value: 'minor' },
          { label: $t('page.versionLogManagement.typePatch'), value: 'patch' }
        ]
      },
      {
        type: 'select',
        field: 'isPublished',
        placeholder: $t('page.versionLogManagement.statusPlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.versionLogManagement.published'), value: true },
          { label: $t('page.versionLogManagement.unpublished'), value: false }
        ]
      }
    ]);

    const tableColumns = computed((): TableColumnConfig<VersionLog>[] => [
      {
        title: $t('page.versionLogManagement.version'),
        key: 'version',
        width: 120,
        sorter: true
      },
      {
        title: $t('page.versionLogManagement.type'),
        key: 'type',
        width: 100,
        render: (row: VersionLog) => {
          if (!row.type) return '-';
          const typeMap: Record<string, string> = {
            major: $t('page.versionLogManagement.typeMajor'),
            minor: $t('page.versionLogManagement.typeMinor'),
            patch: $t('page.versionLogManagement.typePatch')
          };
          const typeColorMap: Record<string, 'error' | 'warning' | 'info'> = {
            major: 'error',
            minor: 'warning',
            patch: 'info'
          };
          return (
            <NTag type={typeColorMap[row.type] || 'default'}>{typeMap[row.type] || row.type}</NTag>
          );
        }
      },
      {
        title: $t('page.versionLogManagement.releaseDate'),
        key: 'releaseDate',
        width: 120,
        sorter: true,
        render: (row: VersionLog) => {
          if (!row.releaseDate) return '-';
          return new Date(row.releaseDate).toLocaleDateString('zh-CN');
        }
      },
      {
        title: $t('page.versionLogManagement.content'),
        key: 'content',
        width: 300,
        render: (row: VersionLog) => {
          const content = row.content || '-';
          return content.length > 50 ? `${content.substring(0, 50)}...` : content;
        }
      },
      {
        title: $t('page.versionLogManagement.status'),
        key: 'isPublished',
        width: 120,
        render: (row: VersionLog) => (
          <NSwitch
            value={row.isPublished}
            onUpdateValue={value => handleToggleStatus(row.id, value)}
            loading={false}
          />
        )
      },
      {
        title: $t('page.versionLogManagement.publishedAt'),
        key: 'publishedAt',
        width: 180,
        render: (row: VersionLog) => {
          if (!row.publishedAt) return '-';
          return new Date(row.publishedAt).toLocaleString('zh-CN');
        }
      },
      {
        title: $t('page.versionLogManagement.createdAt'),
        key: 'createdAt',
        width: 180,
        sorter: true,
        render: (row: VersionLog) => {
          if (!row.createdAt) return '-';
          return new Date(row.createdAt).toLocaleString('zh-CN');
        }
      },
      {
        title: $t('common.operate'),
        key: 'operate',
        width: 200,
        fixed: 'right',
        render: (row: VersionLog) => (
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
        scrollX={2000}
        searchCardBordered={false}
        actionCardBordered={false}
        tableProps={{
          remote: true,
          onUpdateSorter: sorter => {
            const { sortBy, sortOrder } = normalizeRemoteSorter(sorter);
            updateSearchParams({
              sortBy,
              sortOrder,
              page: 1,
              limit: pagination.pageSize ?? 10
            });
            getData();
          }
        }}
      />
    );
  }
});
