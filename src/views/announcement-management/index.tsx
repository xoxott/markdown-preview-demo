import { computed, defineComponent, getCurrentInstance, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { DEFAULT_TABLE_PAGE_SIZE } from '@/constants/datatable';
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
import { $t } from '@/locales';
import { useDialog } from '@/components/base-dialog/useDialog';
import { tableListPlaceholderColumns } from '@/views/_shared/tableListPlaceholderColumns';
import type { AnnouncementFormData } from './components/dialog';
import { useAnnouncementDialog } from './components/useAnnouncementDialog';
import {
  ANNOUNCEMENT_LIST_SCROLL_X,
  createAnnouncementSearchFields,
  createAnnouncementTableColumns
} from './listUiConfig';

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
        limit: DEFAULT_TABLE_PAGE_SIZE,
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

    const searchConfig = computed(() => createAnnouncementSearchFields());

    const tableColumns = computed(() =>
      createAnnouncementTableColumns({
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
        onSearch={() => {
          updateSearchParams({
            page: 1,
            limit: pagination.pageSize ?? DEFAULT_TABLE_PAGE_SIZE
          });
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
        scrollX={ANNOUNCEMENT_LIST_SCROLL_X}
        searchCardBordered={false}
        actionCardBordered={false}
      />
    );
  }
});
