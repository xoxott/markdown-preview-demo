import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NIcon, NSpace, NSpin, useMessage } from 'naive-ui';
import { Icon } from '@iconify/vue';
import WorkflowCanvas from '@/components/ai-workflow/canvas/WorkflowCanvas';
import NodeLibraryPanel from '@/components/ai-workflow/panels/NodeLibraryPanel';
import NodeConfigPanel from '@/components/ai-workflow/panels/NodeConfigPanel';
// 暂时使用 Mock 数据，后续替换为真实 API
import { mockWorkflowApi } from '@/service/api/workflow-mock';
const { fetchWorkflowDetail, fetchUpdateWorkflow } = mockWorkflowApi;

export default defineComponent({
  name: 'WorkflowEditor',
  setup() {
    const route = useRoute();
    const router = useRouter();
    const message = useMessage();

    const workflowId = computed(() => route.params.id as string);
    const workflow = ref<Api.Workflow.Workflow | null>(null);
    const loading = ref(true);
    const saving = ref(false);
    const selectedNodeId = ref<string | null>(null);
    const selectedNode = ref<Api.Workflow.WorkflowNode | null>(null);
    const showLeftPanel = ref(true);
    const showRightPanel = ref(false);

    // 加载工作流数据
    async function loadWorkflow() {
      if (!workflowId.value) return;

      loading.value = true;
      try {
        const { data } = await fetchWorkflowDetail(workflowId.value);
        workflow.value = data;
      } catch (error: any) {
        message.error(`加载工作流失败: ${error.message}`);
        router.push('/ai-workflow');
      } finally {
        loading.value = false;
      }
    }

    // 保存工作流
    async function handleSave(definition: Api.Workflow.WorkflowDefinition) {
      if (!workflowId.value) return;

      saving.value = true;
      try {
        await fetchUpdateWorkflow(workflowId.value, { definition });
        message.success('保存成功');
        if (workflow.value) {
          workflow.value.definition = definition;
        }
      } catch (error: any) {
        message.error(`保存失败: ${error.message}`);
      } finally {
        saving.value = false;
      }
    }

    // 节点选择
    function handleNodeSelect(nodeId: string | null) {
      selectedNodeId.value = nodeId;
      if (nodeId && workflow.value) {
        const node = workflow.value.definition.nodes.find(n => n.id === nodeId);
        selectedNode.value = node || null;
        showRightPanel.value = !!node;
      } else {
        selectedNode.value = null;
        showRightPanel.value = false;
      }
    }

    // 更新节点
    function handleNodeUpdate(nodeId: string, updates: Partial<Api.Workflow.WorkflowNode>) {
      if (!workflow.value) return;

      const node = workflow.value.definition.nodes.find(n => n.id === nodeId);
      if (node) {
        Object.assign(node, updates);
        selectedNode.value = { ...node };
        message.success('节点配置已更新');
      }
    }

    // 返回列表
    function handleBack() {
      router.push('/ai-workflow');
    }

    onMounted(() => {
      loadWorkflow();
    });

    return () => (
      <div class="workflow-editor h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        {/* 顶部工具栏 */}
        <div class="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div class="flex items-center gap-4">
            <NButton
              text
              onClick={handleBack}
              class="hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <NIcon size={22}>
                <Icon icon="mdi:arrow-left" />
              </NIcon>
            </NButton>
            <div class="border-l border-gray-300 dark:border-gray-600 h-8"></div>
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {workflow.value?.name || '工作流编辑器'}
              </h2>
              {workflow.value?.description && (
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {workflow.value.description}
                </p>
              )}
            </div>
          </div>

          <NSpace size="small">
            <NButton
              secondary
              size="small"
              onClick={() => {
                showLeftPanel.value = !showLeftPanel.value;
              }}
              class="transition-all"
            >
              <template v-slots:icon>
                <NIcon>
                  <Icon icon={showLeftPanel.value ? 'mdi:dock-left' : 'mdi:dock-window'} />
                </NIcon>
              </template>
              {showLeftPanel.value ? '隐藏节点库' : '显示节点库'}
            </NButton>
            <NButton
              secondary
              size="small"
              onClick={() => {
                showRightPanel.value = !showRightPanel.value;
              }}
              class="transition-all"
            >
              <template v-slots:icon>
                <NIcon>
                  <Icon icon={showRightPanel.value ? 'mdi:dock-right' : 'mdi:dock-window'} />
                </NIcon>
              </template>
              {showRightPanel.value ? '隐藏配置' : '显示配置'}
            </NButton>
          </NSpace>
        </div>

        {/* 主内容区 */}
        <div class="flex-1 flex overflow-hidden min-h-0">
          <div class="w-full h-full flex">
            {/* 左侧节点库面板 */}
            {showLeftPanel.value && (
              <div
                class="w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-r border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col"
                style={{ flexShrink: 0 }}
              >
                <NodeLibraryPanel />
              </div>
            )}

            {/* 中间画布区域 */}
            <div class="flex-1 overflow-hidden min-w-0 h-full">
              {workflow.value && (
                <WorkflowCanvas
                  initialDefinition={workflow.value.definition}
                  onSave={handleSave}
                  onNodeSelect={handleNodeSelect}
                />
              )}
            </div>

            {/* 右侧配置面板 */}
            {showRightPanel.value && (
              <div
                class="w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-l border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden flex flex-col"
                style={{ flexShrink: 0 }}
              >
                <NodeConfigPanel
                  node={selectedNode.value}
                  onUpdate={handleNodeUpdate}
                  onClose={() => {
                    showRightPanel.value = false;
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
});

