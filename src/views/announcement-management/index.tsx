import type { AnnouncementFormData } from '@/components/announcement-management/dialog';
import { useAnnouncementDialog } from '@/components/announcement-management/useAnnouncementDialog';
import { useNaiveForm } from '@/hooks/common/form';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import {
  fetchBatchDeleteAnnouncements,
  fetchCreateAnnouncement,
  fetchDeleteAnnouncement,
  fetchAnnouncementDetail,
  fetchAnnouncementList,
  fetchToggleAnnouncementStatus,
  fetchUpdateAnnouncement
} from '@/service/api/announcement';
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
import { defineComponent, getCurrentInstance, reactive, ref } from 'vue';
import { useDialog } from '@/components/base-dialog/useDialog';

type Announcement = Api.AnnouncementManagement.Announcement;

export default defineComponent({
  name: 'AnnouncementManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const announcementDialog = useAnnouncementDialog();
    const dialog = useDialog(instance?.appContext.app);
    const { formRef: searchFormRef, resetFields } = useNaiveForm();

    const selectedRowKeys = ref<number[]>([]);

    // 类型选项（用于搜索筛选）
    const typeOptions = [
      { label: $t('page.announcementManagement.all' as any), value: undefined },
      { label: $t('page.announcementManagement.typeNotice' as any), value: 'notice' },
      { label: $t('page.announcementManagement.typeAnnouncement' as any), value: 'announcement' },
      { label: $t('page.announcementManagement.typeWarning' as any), value: 'warning' },
      { label: $t('page.announcementManagement.typeInfo' as any), value: 'info' }
    ];

    // 搜索表单数据
    const searchForm = reactive({
      search: '',
      isPublished: undefined,
      type: undefined,
      sortBy: undefined as string | undefined,
      sortOrder: undefined as 'asc' | 'desc' | undefined
    });

    // 打开新增对话框
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
        onConfirm: async (data: AnnouncementFormData) => {
          try {
            await fetchCreateAnnouncement({
              title: data.title,
              content: data.content,
              type: data.type || undefined,
              priority: data.priority || undefined,
              isPublished: data.isPublished,
              publishedAt: data.publishedAt || undefined,
              expiresAt: data.expiresAt || undefined
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
    async function handleEdit(row: Announcement) {
      try {
        const { data: announcementDetail } = await fetchAnnouncementDetail(row.id);
        if (!announcementDetail) {
          message.error($t('page.announcementManagement.getDetailFailed' as any));
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
          onConfirm: async (data: AnnouncementFormData) => {
            try {
              const updateData: Api.AnnouncementManagement.UpdateAnnouncementRequest = {
                title: data.title,
                content: data.content,
                type: data.type || undefined,
                priority: data.priority || undefined,
                isPublished: data.isPublished,
                publishedAt: data.publishedAt || undefined,
                expiresAt: data.expiresAt || undefined
              };
              await fetchUpdateAnnouncement(row.id, updateData);
              message.success($t('common.updateSuccess'));
              getData();
            } catch (error: any) {
              message.error(error?.message || '操作失败');
              throw error;
            }
          }
        });
      } catch (error: any) {
        message.error(error?.message || $t('page.announcementManagement.getDetailFailed' as any));
      }
    }

    // 切换公告状态
    async function handleToggleStatus(announcementId: number, isPublished: boolean) {
      try {
        await fetchToggleAnnouncementStatus(announcementId, isPublished);
        message.success($t('page.announcementManagement.toggleStatusSuccess' as any));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
        getData(); // 刷新数据以恢复状态
      }
    }

    // 删除公告
    async function handleDelete(row: Announcement) {
      await dialog.confirmDelete(row.title, async () => {
        try {
          await fetchDeleteAnnouncement(row.id);
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
          title: $t('page.announcementManagement.title' as any),
          key: 'title',
          width: 200
        },
        {
          title: $t('page.announcementManagement.content' as any),
          key: 'content',
          width: 300,
          render: (row: Announcement) => {
            const content = row.content || '-';
            return content.length > 50 ? content.substring(0, 50) + '...' : content;
          }
        },
        {
          title: $t('page.announcementManagement.type' as any),
          key: 'type',
          width: 120,
          render: (row: Announcement) => {
            if (!row.type) return '-';
            const typeMap: Record<string, string> = {
              notice: $t('page.announcementManagement.typeNotice' as any),
              announcement: $t('page.announcementManagement.typeAnnouncement' as any),
              warning: $t('page.announcementManagement.typeWarning' as any),
              info: $t('page.announcementManagement.typeInfo' as any)
            };
            return <NTag type="info">{typeMap[row.type] || row.type}</NTag>;
          }
        },
        {
          title: $t('page.announcementManagement.priority' as any),
          key: 'priority',
          width: 100,
          render: (row: Announcement) => {
            return row.priority || '-';
          }
        },
        {
          title: $t('page.announcementManagement.status' as any),
          key: 'isPublished',
          width: 120,
          render: (row: Announcement) => (
            <NSwitch
              value={row.isPublished}
              onUpdateValue={value => handleToggleStatus(row.id, value)}
              loading={false}
            />
          )
        },
        {
          title: $t('page.announcementManagement.publishedAt' as any),
          key: 'publishedAt',
          width: 180,
          render: (row: Announcement) => {
            if (!row.publishedAt) return '-';
            return new Date(row.publishedAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.announcementManagement.expiresAt' as any),
          key: 'expiresAt',
          width: 180,
          render: (row: Announcement) => {
            if (!row.expiresAt) return '-';
            return new Date(row.expiresAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.announcementManagement.createdAt' as any),
          key: 'createdAt',
          width: 180,
          render: (row: Announcement) => {
            if (!row.createdAt) return '-';
            return new Date(row.createdAt).toLocaleString('zh-CN');
          }
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
        apiFn: fetchAnnouncementList,
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
        message.warning($t('page.announcementManagement.selectAnnouncementsToDelete' as any));
        return;
      }
      await dialog.confirmDelete(
        $t('page.announcementManagement.confirmBatchDelete' as any, { count: selectedRowKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeleteAnnouncements({ ids: selectedRowKeys.value });
            message.success($t('page.announcementManagement.batchDeleteSuccess' as any));
            selectedRowKeys.value = [];
            getData();
          } catch (error: any) {
            message.error(error?.message || $t('common.error'));
          }
        }
      );
    }

    return () => (
      <NSpace vertical size={16}>
        {/* 搜索栏 */}
        <NCard>
          <NForm ref={searchFormRef} model={searchForm} inline>
            <NFormItem path="search">
              <NInput
                v-model:value={searchForm.search}
                placeholder={$t('page.announcementManagement.searchPlaceholder' as any)}
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
                placeholder={$t('page.announcementManagement.typePlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={typeOptions}
              />
            </NFormItem>
            <NFormItem path="isPublished">
              <NSelect
                v-model:value={searchForm.isPublished}
                placeholder={$t('page.announcementManagement.statusPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.announcementManagement.published' as any), value: true as any },
                  { label: $t('page.announcementManagement.unpublished' as any), value: false as any }
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
            rowKey={(row: Announcement) => row.id}
            checkedRowKeys={selectedRowKeys.value}
            onUpdateCheckedRowKeys={(keys) => {
              selectedRowKeys.value = keys as number[];
            }}
            scrollX={2000}
          />
        </NCard>
      </NSpace>
    );
  }
});

