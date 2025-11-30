import type { VersionLogFormData } from '@/components/version-log-management/dialog';
import { useVersionLogDialog } from '@/components/version-log-management/useVersionLogDialog';
import { useNaiveForm } from '@/hooks/common/form';
import { useTable } from '@/hooks/common/table';
import { $t } from '@/locales';
import {
  fetchBatchDeleteVersionLogs,
  fetchCreateVersionLog,
  fetchDeleteVersionLog,
  fetchVersionLogDetail,
  fetchVersionLogList,
  fetchToggleVersionLogStatus,
  fetchUpdateVersionLog
} from '@/service/api/version-log';
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

type VersionLog = Api.VersionLogManagement.VersionLog;

export default defineComponent({
  name: 'VersionLogManagement',
  setup() {
    const message = useMessage();
    const instance = getCurrentInstance();
    const versionLogDialog = useVersionLogDialog();
    const dialog = useDialog(instance?.appContext.app);
    const { formRef: searchFormRef, resetFields } = useNaiveForm();

    const selectedRowKeys = ref<number[]>([]);

    // 类型选项（用于搜索筛选）
    const typeOptions = [
      { label: $t('page.versionLogManagement.all' as any), value: undefined },
      { label: $t('page.versionLogManagement.typeMajor' as any), value: 'major' },
      { label: $t('page.versionLogManagement.typeMinor' as any), value: 'minor' },
      { label: $t('page.versionLogManagement.typePatch' as any), value: 'patch' }
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
        onConfirm: async (data: VersionLogFormData) => {
          try {
            // 将字符串转换为数组（如果为空则设为 undefined）
            const features = data.features.trim() ? data.features.split('\n').filter(f => f.trim()) : undefined;
            const fixes = data.fixes.trim() ? data.fixes.split('\n').filter(f => f.trim()) : undefined;
            const improvements = data.improvements.trim() ? data.improvements.split('\n').filter(f => f.trim()) : undefined;

            await fetchCreateVersionLog({
              version: data.version,
              type: data.type,
              releaseDate: data.releaseDate,
              content: data.content,
              features,
              fixes,
              improvements,
              isPublished: data.isPublished,
              publishedAt: data.publishedAt || undefined
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
    async function handleEdit(row: VersionLog) {
      try {
        const { data: versionLogDetail } = await fetchVersionLogDetail(row.id);
        if (!versionLogDetail) {
          message.error($t('page.versionLogManagement.getDetailFailed' as any));
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
          onConfirm: async (data: VersionLogFormData) => {
            try {
              // 将字符串转换为数组（如果为空则设为 undefined）
              const features = data.features.trim() ? data.features.split('\n').filter(f => f.trim()) : undefined;
              const fixes = data.fixes.trim() ? data.fixes.split('\n').filter(f => f.trim()) : undefined;
              const improvements = data.improvements.trim() ? data.improvements.split('\n').filter(f => f.trim()) : undefined;

              const updateData: Api.VersionLogManagement.UpdateVersionLogRequest = {
                type: data.type,
                releaseDate: data.releaseDate,
                content: data.content,
                features,
                fixes,
                improvements,
                isPublished: data.isPublished,
                publishedAt: data.publishedAt || undefined
              };
              await fetchUpdateVersionLog(row.id, updateData);
              message.success($t('common.updateSuccess'));
              getData();
            } catch (error: any) {
              message.error(error?.message || '操作失败');
              throw error;
            }
          }
        });
      } catch (error: any) {
        message.error(error?.message || $t('page.versionLogManagement.getDetailFailed' as any));
      }
    }

    // 切换版本日志状态
    async function handleToggleStatus(versionLogId: number, isPublished: boolean) {
      try {
        await fetchToggleVersionLogStatus(versionLogId, isPublished);
        message.success($t('page.versionLogManagement.toggleStatusSuccess' as any));
        getData();
      } catch (error: any) {
        message.error(error?.message || '操作失败');
        getData(); // 刷新数据以恢复状态
      }
    }

    // 删除版本日志
    async function handleDelete(row: VersionLog) {
      await dialog.confirmDelete(row.version, async () => {
        try {
          await fetchDeleteVersionLog(row.id);
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
          title: $t('page.versionLogManagement.version' as any),
          key: 'version',
          width: 120,
          sorter: true
        },
        {
          title: $t('page.versionLogManagement.type' as any),
          key: 'type',
          width: 100,
          render: (row: VersionLog) => {
            if (!row.type) return '-';
            const typeMap: Record<string, string> = {
              major: $t('page.versionLogManagement.typeMajor' as any),
              minor: $t('page.versionLogManagement.typeMinor' as any),
              patch: $t('page.versionLogManagement.typePatch' as any)
            };
            const typeColorMap: Record<string, 'error' | 'warning' | 'info'> = {
              major: 'error',
              minor: 'warning',
              patch: 'info'
            };
            return <NTag type={typeColorMap[row.type] || 'default'}>{typeMap[row.type] || row.type}</NTag>;
          }
        },
        {
          title: $t('page.versionLogManagement.releaseDate' as any),
          key: 'releaseDate',
          width: 120,
          sorter: true,
          render: (row: VersionLog) => {
            if (!row.releaseDate) return '-';
            return new Date(row.releaseDate).toLocaleDateString('zh-CN');
          }
        },
        {
          title: $t('page.versionLogManagement.content' as any),
          key: 'content',
          width: 300,
          render: (row: VersionLog) => {
            const content = row.content || '-';
            return content.length > 50 ? content.substring(0, 50) + '...' : content;
          }
        },
        {
          title: $t('page.versionLogManagement.status' as any),
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
          title: $t('page.versionLogManagement.publishedAt' as any),
          key: 'publishedAt',
          width: 180,
          render: (row: VersionLog) => {
            if (!row.publishedAt) return '-';
            return new Date(row.publishedAt).toLocaleString('zh-CN');
          }
        },
        {
          title: $t('page.versionLogManagement.createdAt' as any),
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
        apiFn: fetchVersionLogList,
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
        message.warning($t('page.versionLogManagement.selectVersionLogsToDelete' as any));
        return;
      }
      await dialog.confirmDelete(
        $t('page.versionLogManagement.confirmBatchDelete' as any, { count: selectedRowKeys.value.length }),
        async () => {
          try {
            await fetchBatchDeleteVersionLogs({ ids: selectedRowKeys.value });
            message.success($t('page.versionLogManagement.batchDeleteSuccess' as any));
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
                placeholder={$t('page.versionLogManagement.searchPlaceholder' as any)}
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
                placeholder={$t('page.versionLogManagement.typePlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={typeOptions}
              />
            </NFormItem>
            <NFormItem path="isPublished">
              <NSelect
                v-model:value={searchForm.isPublished}
                placeholder={$t('page.versionLogManagement.statusPlaceholder' as any)}
                style={{ width: '120px' }}
                clearable
                options={[
                  { label: $t('page.versionLogManagement.published' as any), value: true as any },
                  { label: $t('page.versionLogManagement.unpublished' as any), value: false as any }
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
            rowKey={(row: VersionLog) => row.id}
            checkedRowKeys={selectedRowKeys.value}
            onUpdateCheckedRowKeys={(keys) => {
              selectedRowKeys.value = keys as number[];
            }}
            onUpdateSorter={(sorter: Array<{ columnKey: string; order: 'ascend' | 'descend' }> | null) => {
              if (sorter && sorter.length > 0) {
                const sortItem = sorter[0];
                searchForm.sortBy = sortItem.columnKey as string;
                searchForm.sortOrder = sortItem.order === 'ascend' ? 'asc' : 'desc';
              } else {
                searchForm.sortBy = undefined;
                searchForm.sortOrder = undefined;
              }
              handleSearch();
            }}
            scrollX={2000}
          />
        </NCard>
      </NSpace>
    );
  }
});

