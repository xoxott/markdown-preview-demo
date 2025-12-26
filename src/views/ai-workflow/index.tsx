import { defineComponent, reactive, ref, getCurrentInstance } from 'vue';
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
  useMessage
} from 'naive-ui';
import { useRouter } from 'vue-router';
import { useTable } from '@/hooks/common/table';
import { useNaiveForm } from '@/hooks/common/form';
import { useDialog } from '@/components/base-dialog/useDialog';
import { useWorkflowDialog } from '@/components/ai-workflow/dialogs/useWorkflowDialog';
import { $t } from '@/locales';
// 暂时使用 Mock 数据，后续替换为真实 API
import { mockWorkflowApi } from '@/service/api/workflow-mock';

const {
  fetchWorkflowList,
  fetchCreateWorkflow,
  fetchUpdateWorkflow,
  fetchDeleteWorkflow,
  fetchBatchDeleteWorkflows,
  fetchCopyWorkflow,
  fetchPublishWorkflow,
  fetchArchiveWorkflow,
  fetchExecuteWorkflow,
  fetchRestoreWorkflowVersion
} = mockWorkflowApi;
import type { WorkflowFormData } from '@/components/ai-workflow/dialogs/dialog';

type Workflow = Api.Workflow.Workflow;

export default defineComponent({
  name: 'AIWorkflow',
  setup() {
    const message = useMessage();
    const router = useRouter();
    const instance = getCurrentInstance();
    const dialog = useDialog(instance?.appContext.app);
    const workflowDialog = useWorkflowDialog();
    const { formRef: searchFormRef, resetFields } = useNaiveForm();

    const selectedRowKeys = ref<string[]>([]);

    // 搜索表单
    const searchForm = reactive({
      search: '',
      status: undefined as Api.Workflow.WorkflowStatus | undefined
    });

    // 状态选项
    const statusOptions = [
      { label: '全部', value: undefined },
      { label: '草稿', value: 'draft' },
      { label: '已发布', value: 'published' },
      { label: '已归档', value: 'archived' }
    ];

    const statusTypeMap = {
      draft: 'default',
      published: 'success',
      archived: 'warning'
    } as const;

    const statusLabelMap = {
      draft: '草稿',
      published: '已发布',
      archived: '已归档'
    };

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
          title: '名称',
          key: 'name',
          width: 200,
          ellipsis: {
            tooltip: true
          }
        },
        {
          title: '描述',
          key: 'description',
          width: 250,
          ellipsis: {
            tooltip: true
          },
          render: (row: Workflow) => row.description || '-'
        },
        {
          title: '状态',
          key: 'status',
          width: 100,
          render: (row: Workflow) => (
            <NTag type={statusTypeMap[row.status]}>{statusLabelMap[row.status]}</NTag>
          )
        },
        {
          title: '版本',
          key: 'version',
          width: 80,
          render: (row: Workflow) => `v${row.version}`
        },
        {
          title: '节点数',
          key: 'nodeCount',
          width: 100
        },
        {
          title: '执行次数',
          key: 'executionCount',
          width: 100
        },
        {
          title: '最后执行时间',
          key: 'lastExecutedAt',
          width: 180,
          render: (row: Workflow) => {
            if (!row.lastExecutedAt) return '-';
            return new Date(row.lastExecutedAt).toLocaleString('zh-CN');
          }
        },
        {
          title: '创建时间',
          key: 'createdAt',
          width: 180,
          render: (row: Workflow) => new Date(row.createdAt).toLocaleString('zh-CN')
        },
        {
          title: $t('common.operate'),
          key: 'operate',
          width: 380,
          fixed: 'right',
          render: (row: Workflow) => (
            <NSpace size="small">
              <NButton size="small" type="primary" onClick={() => handleEdit(row)}>
                编辑
              </NButton>
              <NButton size="small" onClick={() => handleCopy(row)}>
                复制
              </NButton>
              <NButton size="small" type="info" onClick={() => handleExecute(row)}>
                执行
              </NButton>
              <NButton size="small" onClick={() => handleVersionHistory(row)}>
                版本
              </NButton>
              {row.status === 'draft' && (
                <NButton size="small" type="success" onClick={() => handlePublish(row)}>
                  发布
                </NButton>
              )}
              {row.status === 'published' && (
                <NButton size="small" type="warning" onClick={() => handleArchive(row)}>
                  归档
                </NButton>
              )}
              <NButton size="small" type="error" onClick={() => handleDelete(row)}>
                {$t('common.delete')}
              </NButton>
            </NSpace>
          )
        }
      ];
    }

    // 表格配置
    const { columns, data, loading, pagination, getData, updateSearchParams, resetSearchParams } = useTable({
      apiFn: fetchWorkflowList,
      apiParams: {
        page: 1,
        limit: 10,
        ...searchForm
      },
      columns: () => createColumns() as any,
      showTotal: true
    });

    // 新建工作流
    async function handleAdd() {
      const formData: WorkflowFormData = {
        name: '',
        description: '',
        tags: []
      };

      await workflowDialog.showWorkflowForm({
        isEdit: false,
        formData,
        onConfirm: async (data: WorkflowFormData) => {
          try {
            const result = await fetchCreateWorkflow({
              name: data.name,
              description: data.description,
              tags: data.tags
            });
            message.success($t('common.addSuccess'));
            // 跳转到编辑器
            router.push(`/ai-workflow/editor/${result.data.id}`);
          } catch (error: any) {
            message.error(error?.message || '操作失败');
            throw error;
          }
        }
      });
    }

    // 编辑工作流
    async function handleEdit(row: Workflow) {
      // 跳转到编辑器页面
      router.push(`/ai-workflow/editor/${row.id}`);
    }

    // 复制工作流
    async function handleCopy(row: Workflow) {
      try {
        await fetchCopyWorkflow(row.id, `${row.name} (副本)`);
        message.success('复制成功');
        getData();
      } catch (error: any) {
        message.error(error?.message || '复制失败');
      }
    }

    // 执行工作流
    async function handleExecute(row: Workflow) {
      try {
        const result = await fetchExecuteWorkflow(row.id);
        message.success('工作流已开始执行');
        // 显示执行详情
        workflowDialog.showExecutionDetail({
          executionId: result.data.id
        });
        getData();
      } catch (error: any) {
        message.error(error?.message || '执行失败');
      }
    }

    // 版本历史
    function handleVersionHistory(row: Workflow) {
      workflowDialog.showVersionHistory({
        workflowId: row.id,
        onRestore: async (version: number) => {
          await fetchRestoreWorkflowVersion(row.id, version);
          getData();
        }
      });
    }

    // 发布工作流
    async function handlePublish(row: Workflow) {
      await dialog.confirm({
        title: '确认发布',
        content: `确定要发布工作流 "${row.name}" 吗？`,
        confirmText: '确定',
        cancelText: '取消',
        type: 'warning',
        onConfirm: async () => {
          try {
            await fetchPublishWorkflow(row.id);
            message.success('发布成功');
            getData();
          } catch (error: any) {
            message.error(error?.message || '发布失败');
          }
        }
      });
    }

    // 归档工作流
    async function handleArchive(row: Workflow) {
      await dialog.confirm({
        title: '确认归档',
        content: `确定要归档工作流 "${row.name}" 吗？`,
        confirmText: '确定',
        cancelText: '取消',
        type: 'warning',
        onConfirm: async () => {
          try {
            await fetchArchiveWorkflow(row.id);
            message.success('归档成功');
            getData();
          } catch (error: any) {
            message.error(error?.message || '归档失败');
          }
        }
      });
    }

    // 删除工作流
    async function handleDelete(row: Workflow) {
      await dialog.confirmDelete(row.name, async () => {
        try {
          await fetchDeleteWorkflow(row.id);
          message.success($t('common.deleteSuccess'));
          getData();
        } catch (error: any) {
          message.error(error?.message || '操作失败');
        }
      });
    }

    // 搜索
    function handleSearch() {
      updateSearchParams({
        page: 1,
        ...searchForm
      });
      getData();
    }

    // 重置
    function handleReset() {
      resetFields();
      resetSearchParams();
      getData();
    }

    // 批量删除
    async function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) {
        message.warning('请选择要删除的工作流');
        return;
      }

      await dialog.confirmDelete(`${selectedRowKeys.value.length} 个工作流`, async () => {
        try {
          await fetchBatchDeleteWorkflows({ ids: selectedRowKeys.value });
          message.success($t('common.deleteSuccess'));
          selectedRowKeys.value = [];
          getData();
        } catch (error: any) {
          message.error(error?.message || $t('common.error'));
        }
      });
    }

    return () => (
      <NSpace vertical size={16}>
        {/* 搜索栏 */}
        <NCard>
          <NForm ref={searchFormRef} model={searchForm} inline>
            <NFormItem path="search">
              <NInput
                v-model:value={searchForm.search}
                placeholder="搜索工作流名称或描述"
                style={{ width: '250px' }}
                clearable
                onKeyup={(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </NFormItem>
            <NFormItem path="status">
              <NSelect
                v-model:value={searchForm.status}
                placeholder="选择状态"
                style={{ width: '120px' }}
                clearable
                options={statusOptions}
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
              新建工作流
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
            rowKey={(row: Workflow) => row.id}
            checkedRowKeys={selectedRowKeys.value}
            onUpdateCheckedRowKeys={keys => {
              selectedRowKeys.value = keys as string[];
            }}
            scrollX={2000}
          />
        </NCard>
      </NSpace>
    );
  }
});

