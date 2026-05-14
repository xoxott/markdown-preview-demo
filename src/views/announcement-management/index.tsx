import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { NButton, NSpace, NSwitch, NTag, useMessage } from 'naive-ui';
import {
  fetchAnnouncementDetail,
  fetchAnnouncementList,
  fetchBatchDeleteAnnouncements,
  fetchCreateAnnouncement,
  fetchDeleteAnnouncement,
  fetchToggleAnnouncementStatus,
  fetchUpdateAnnouncement
} from '@/service/api/announcement';
import { useTable } from '@/hooks/common/table';
import TablePage from '@/components/table-page/TablePage';
import type { SearchFieldConfig, TableColumnConfig } from '@/components/table-page/types';
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';
import type { AnnouncementFormData } from './components/dialog';
import { useAnnouncementDialog } from './components/useAnnouncementDialog';

type Announcement = Api.AnnouncementManagement.Announcement;

export default defineComponent({
  name: 'AnnouncementManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const announcementDialog = useAnnouncementDialog();
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
    } = useTable<typeof fetchAnnouncementList>({
      apiFn: fetchAnnouncementList,
      apiParams: {
        page: 1,
        limit: 10,
        search: '',
        isPublished: undefined as boolean | undefined,
        type: undefined as string | undefined,
        sortBy: undefined as string | undefined,
        sortOrder: undefined as 'asc' | 'desc' | undefined
      },
      columns: () => tableListPlaceholderColumns<typeof fetchAnnouncementList>(),
      showTotal: true,
      immediate: true
    });

    async function handleAdd() {
      const formData: AnnouncementFormData = {
        title: '',
        content: '',
        type: '',
        priority: null,
        isPublished: false,
        publishedAt: '',
        expiresAt: ''
      };

      await announcementDialog.showAnnouncementForm({
        isEdit: false,
        formData,
        onConfirm: async (form: AnnouncementFormData) => {
          await fetchCreateAnnouncement({
            title: form.title,
            content: form.content,
            type: form.type || undefined,
            priority: form.priority || undefined,
            isPublished: form.isPublished,
            publishedAt: form.publishedAt || undefined,
            expiresAt: form.expiresAt || undefined
          });
          message.success($t('common.addSuccess'));
          getData();
        }
      });
    }

    async function handleEdit(row: Announcement) {
      const { data: announcementDetail } = await fetchAnnouncementDetail(row.id);
      if (!announcementDetail) {
        message.error($t('page.announcementManagement.getDetailFailed'));
        return;
      }

      const formData: AnnouncementFormData = {
        title: announcementDetail.title,
        content: announcementDetail.content,
        type: announcementDetail.type || '',
        priority: announcementDetail.priority,
        isPublished: announcementDetail.isPublished,
        publishedAt: announcementDetail.publishedAt || '',
        expiresAt: announcementDetail.expiresAt || ''
      };

      await announcementDialog.showAnnouncementForm({
        isEdit: true,
        formData,
        onConfirm: async (form: AnnouncementFormData) => {
          const updateData: Api.AnnouncementManagement.UpdateAnnouncementRequest = {
            title: form.title,
            content: form.content,
            type: form.type || undefined,
            priority: form.priority || undefined,
            isPublished: form.isPublished,
            publishedAt: form.publishedAt || undefined,
            expiresAt: form.expiresAt || undefined
          };
          await fetchUpdateAnnouncement(row.id, updateData);
          message.success($t('common.updateSuccess'));
          getData();
        }
      });
    }

    async function handleToggleStatus(announcementId: number, isPublished: boolean) {
      try {
        await fetchToggleAnnouncementStatus(announcementId, isPublished);
        message.success($t('page.announcementManagement.toggleStatusSuccess'));
        getData();
      } catch {
        getData();
      }
    }

    async function handleDelete(row: Announcement) {
      await dialog.confirmDelete(row.title, async () => {
        await fetchDeleteAnnouncement(row.id);
        message.success($t('common.deleteSuccess'));
        getData();
      });
    }

    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning($t('page.announcementManagement.selectAnnouncementsToDelete'));
        return;
      }
      await dialog.confirmDelete(
        $t('page.announcementManagement.confirmBatchDelete', {
          count: selectedRowKeys.value.length
        }),
        async () => {
          await fetchBatchDeleteAnnouncements({ ids: selectedRowKeys.value });
          message.success($t('page.announcementManagement.batchDeleteSuccess'));
          selectedRowKeys.value = [];
          getData();
        }
      );
    }

    const searchConfig = computed<SearchFieldConfig[]>(() => [
      {
        type: 'input',
        field: 'search',
        placeholder: $t('page.announcementManagement.searchPlaceholder'),
        icon: 'i-carbon-search',
        width: '200px'
      },
      {
        type: 'select',
        field: 'type',
        placeholder: $t('page.announcementManagement.typePlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.announcementManagement.typeNotice'), value: 'notice' },
          { label: $t('page.announcementManagement.typeAnnouncement'), value: 'announcement' },
          { label: $t('page.announcementManagement.typeWarning'), value: 'warning' },
          { label: $t('page.announcementManagement.typeInfo'), value: 'info' }
        ]
      },
      {
        type: 'select',
        field: 'isPublished',
        placeholder: $t('page.announcementManagement.statusPlaceholder'),
        width: '120px',
        options: [
          { label: $t('page.announcementManagement.published'), value: true },
          { label: $t('page.announcementManagement.unpublished'), value: false }
        ]
      }
    ]);

    const tableColumns = computed((): TableColumnConfig<Announcement>[] => [
      {
        title: $t('page.announcementManagement.title'),
        key: 'title',
        width: 200
      },
      {
        title: $t('page.announcementManagement.content'),
        key: 'content',
        width: 300,
        render: (row: Announcement) => {
          const content = row.content || '-';
          return content.length > 50 ? `${content.substring(0, 50)}...` : content;
        }
      },
      {
        title: $t('page.announcementManagement.type'),
        key: 'type',
        width: 120,
        render: (row: Announcement) => {
          if (!row.type) return '-';
          const typeMap: Record<string, string> = {
            notice: $t('page.announcementManagement.typeNotice'),
            announcement: $t('page.announcementManagement.typeAnnouncement'),
            warning: $t('page.announcementManagement.typeWarning'),
            info: $t('page.announcementManagement.typeInfo')
          };
          return <NTag type="info">{typeMap[row.type] || row.type}</NTag>;
        }
      },
      {
        title: $t('page.announcementManagement.priority'),
        key: 'priority',
        width: 100,
        render: (row: Announcement) => row.priority ?? '-'
      },
      {
        title: $t('page.announcementManagement.status'),
        key: 'isPublished',
        width: 120,
        render: (row: Announcement) => (
          <NSwitch
            value={row.isPublished}
            onUpdateValue={(v: boolean) => handleToggleStatus(row.id, v)}
          />
        )
      },
      {
        title: $t('page.announcementManagement.publishedAt'),
        key: 'publishedAt',
        width: 180,
        render: (row: Announcement) =>
          row.publishedAt ? new Date(row.publishedAt).toLocaleString('zh-CN') : '-'
      },
      {
        title: $t('page.announcementManagement.expiresAt'),
        key: 'expiresAt',
        width: 180,
        render: (row: Announcement) =>
          row.expiresAt ? new Date(row.expiresAt).toLocaleString('zh-CN') : '-'
      },
      {
        title: $t('page.announcementManagement.createdAt'),
        key: 'createdAt',
        width: 180,
        render: (row: Announcement) =>
          row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN') : '-'
      },
      {
        title: $t('common.operate'),
        key: 'operate',
        width: 200,
        fixed: 'right',
        render: (row: Announcement) => (
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
      />
    );
  }
});
