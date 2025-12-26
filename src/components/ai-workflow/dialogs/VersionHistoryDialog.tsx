import { defineComponent, onMounted, ref, type PropType } from 'vue';
import {
  NDataTable,
  NButton,
  NSpace,
  NSpin,
  NEmpty,
  NTag,
  useMessage,
  useDialog,
  type DataTableColumns
} from 'naive-ui';
// 暂时使用 Mock 数据，后续替换为真实 API
import { mockWorkflowApi } from '@/service/api/workflow-mock';
const { fetchWorkflowVersions } = mockWorkflowApi;

export default defineComponent({
  name: 'VersionHistoryDialog',
  props: {
    workflowId: {
      type: String as PropType<string>,
      required: true
    },
    onRestore: {
      type: Function as PropType<(version: number) => Promise<void>>,
      default: undefined
    }
  },
  setup(props) {
    const message = useMessage();
    const dialog = useDialog();
    const loading = ref(true);
    const versions = ref<Api.Workflow.WorkflowVersion[]>([]);
    const restoring = ref<number | null>(null);

    const columns: DataTableColumns<Api.Workflow.WorkflowVersion> = [
      {
        title: '版本号',
        key: 'version',
        width: 100,
        render: row => <NTag type="info">v{row.version}</NTag>
      },
      {
        title: '创建时间',
        key: 'createdAt',
        width: 180,
        render: row => new Date(row.createdAt).toLocaleString('zh-CN')
      },
      {
        title: '创建者',
        key: 'createdBy',
        width: 120,
        render: row => row.createdBy || '-'
      },
      {
        title: '变更说明',
        key: 'changes',
        ellipsis: {
          tooltip: true
        },
        render: row => row.changes || '无'
      },
      {
        title: '节点数',
        key: 'nodeCount',
        width: 100,
        render: row => row.definition?.nodes?.length || 0
      },
      {
        title: '操作',
        key: 'actions',
        width: 120,
        fixed: 'right',
        render: row => (
          <NSpace size="small">
            <NButton
              size="small"
              type="primary"
              loading={restoring.value === row.version}
              disabled={restoring.value !== null}
              onClick={() => handleRestore(row.version)}
            >
              恢复
            </NButton>
          </NSpace>
        )
      }
    ];

    async function loadData() {
      loading.value = true;
      try {
        const { data } = await fetchWorkflowVersions(props.workflowId);
        versions.value = data || [];
      } catch (error: any) {
        message.error(`加载版本历史失败: ${error.message}`);
      } finally {
        loading.value = false;
      }
    }

    async function handleRestore(version: number) {
      dialog.warning({
        title: '确认恢复',
        content: `确定要恢复到版本 v${version} 吗？当前版本将被保存为新版本。`,
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: async () => {
          if (!props.onRestore) {
            message.warning('未提供恢复回调函数');
            return;
          }

          restoring.value = version;
          try {
            await props.onRestore(version);
            message.success('版本恢复成功');
            await loadData();
          } catch (error: any) {
            message.error(`版本恢复失败: ${error.message}`);
          } finally {
            restoring.value = null;
          }
        }
      });
    }

    onMounted(() => {
      loadData();
    });

    return () => (
      <div class="p-4">
        <NSpin show={loading.value}>
          {versions.value.length > 0 ? (
            <NDataTable columns={columns} data={versions.value} bordered={false} />
          ) : (
            <NEmpty description="暂无版本历史" />
          )}
        </NSpin>
      </div>
    );
  }
});

