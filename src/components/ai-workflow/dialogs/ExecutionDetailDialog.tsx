import { defineComponent, onMounted, ref, computed, type PropType } from 'vue';
import {
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NTag,
  NTimeline,
  NTimelineItem,
  NSpin,
  NEmpty,
  NTabs,
  NTabPane,
  NCode
} from 'naive-ui';
// 暂时使用 Mock 数据，后续替换为真实 API
import { mockWorkflowApi } from '@/service/api/workflow-mock';
const { fetchExecutionDetail } = mockWorkflowApi;
import { useMessage } from 'naive-ui';

export default defineComponent({
  name: 'ExecutionDetailDialog',
  props: {
    executionId: {
      type: String as PropType<string>,
      required: true
    }
  },
  setup(props) {
    const message = useMessage();
    const loading = ref(true);
    const execution = ref<Api.Workflow.ExecutionDetail | null>(null);

    const statusTypeMap = {
      pending: 'default',
      running: 'info',
      success: 'success',
      failed: 'error',
      cancelled: 'warning'
    } as const;

    const statusLabelMap = {
      pending: '等待中',
      running: '运行中',
      success: '成功',
      failed: '失败',
      cancelled: '已取消'
    };

    const formatDuration = (ms?: number) => {
      if (!ms) return '-';
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
      return `${(ms / 60000).toFixed(2)}min`;
    };

    const formatTime = (time?: string) => {
      if (!time) return '-';
      return new Date(time).toLocaleString('zh-CN');
    };

    async function loadData() {
      loading.value = true;
      try {
        const { data } = await fetchExecutionDetail(props.executionId);
        execution.value = data;
      } catch (error: any) {
        message.error(`加载执行详情失败: ${error.message}`);
      } finally {
        loading.value = false;
      }
    }

    onMounted(() => {
      loadData();
    });

    return () => (
      <div class="p-4">
        <NSpin show={loading.value}>
          {execution.value ? (
            <div>
              <NCard title="基本信息" class="mb-4">
                <NDescriptions bordered columns={2}>
                  <NDescriptionsItem label="执行ID">{execution.value.id}</NDescriptionsItem>
                  <NDescriptionsItem label="工作流">
                    {execution.value.workflowName}
                  </NDescriptionsItem>
                  <NDescriptionsItem label="状态">
                    <NTag type={statusTypeMap[execution.value.status]}>
                      {statusLabelMap[execution.value.status]}
                    </NTag>
                  </NDescriptionsItem>
                  <NDescriptionsItem label="耗时">
                    {formatDuration(execution.value.duration)}
                  </NDescriptionsItem>
                  <NDescriptionsItem label="开始时间">
                    {formatTime(execution.value.startTime)}
                  </NDescriptionsItem>
                  <NDescriptionsItem label="结束时间">
                    {formatTime(execution.value.endTime)}
                  </NDescriptionsItem>
                  {execution.value.triggeredBy && (
                    <NDescriptionsItem label="触发者" span={2}>
                      {execution.value.triggeredBy}
                    </NDescriptionsItem>
                  )}
                  {execution.value.error && (
                    <NDescriptionsItem label="错误信息" span={2}>
                      <NTag type="error">{execution.value.error}</NTag>
                    </NDescriptionsItem>
                  )}
                </NDescriptions>
              </NCard>

              <NTabs type="line" animated>
                <NTabPane name="nodes" tab="节点执行结果">
                  {execution.value.nodeResults && execution.value.nodeResults.length > 0 ? (
                    <NTimeline>
                      {execution.value.nodeResults.map(result => (
                        <NTimelineItem
                          key={result.nodeId}
                          type={statusTypeMap[result.status]}
                          title={`节点: ${result.nodeId}`}
                          time={formatTime(result.startTime)}
                        >
                          <div class="space-y-2">
                            <div>
                              状态:{' '}
                              <NTag type={statusTypeMap[result.status]} size="small">
                                {statusLabelMap[result.status]}
                              </NTag>
                            </div>
                            {result.duration && <div>耗时: {formatDuration(result.duration)}</div>}
                            {result.error && (
                              <div>
                                <span class="text-red-500">错误: {result.error}</span>
                              </div>
                            )}
                            {result.output && (
                              <div>
                                <div class="mb-1">输出:</div>
                                <NCode
                                  code={JSON.stringify(result.output, null, 2)}
                                  language="json"
                                  wordWrap
                                />
                              </div>
                            )}
                          </div>
                        </NTimelineItem>
                      ))}
                    </NTimeline>
                  ) : (
                    <NEmpty description="暂无节点执行结果" />
                  )}
                </NTabPane>

                <NTabPane name="logs" tab="执行日志">
                  {execution.value.logs && execution.value.logs.length > 0 ? (
                    <div class="space-y-2">
                      {execution.value.logs.map((log, index) => (
                        <div
                          key={index}
                          class={`p-2 rounded ${
                            log.level === 'error'
                              ? 'bg-red-50 dark:bg-red-900/20'
                              : log.level === 'warn'
                                ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                : 'bg-gray-50 dark:bg-gray-800'
                          }`}
                        >
                          <div class="flex items-start gap-2">
                            <span class="text-xs text-gray-500">{formatTime(log.timestamp)}</span>
                            <NTag
                              size="small"
                              type={
                                log.level === 'error'
                                  ? 'error'
                                  : log.level === 'warn'
                                    ? 'warning'
                                    : 'default'
                              }
                            >
                              {log.level.toUpperCase()}
                            </NTag>
                            {log.nodeId && <span class="text-xs text-gray-500">[{log.nodeId}]</span>}
                            <span class="flex-1">{log.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <NEmpty description="暂无执行日志" />
                  )}
                </NTabPane>

                {execution.value.input && (
                  <NTabPane name="input" tab="输入数据">
                    <NCode
                      code={JSON.stringify(execution.value.input, null, 2)}
                      language="json"
                      wordWrap
                    />
                  </NTabPane>
                )}

                {execution.value.output && (
                  <NTabPane name="output" tab="输出数据">
                    <NCode
                      code={JSON.stringify(execution.value.output, null, 2)}
                      language="json"
                      wordWrap
                    />
                  </NTabPane>
                )}
              </NTabs>
            </div>
          ) : (
            <NEmpty description="暂无数据" />
          )}
        </NSpin>
      </div>
    );
  }
});

