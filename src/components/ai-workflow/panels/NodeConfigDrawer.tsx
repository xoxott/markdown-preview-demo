import { defineComponent, computed, watch, ref, type PropType } from 'vue';
import { NDrawer, NDrawerContent, NForm, NFormItem, NInput, NInputNumber, NSelect, NSwitch, NButton, NSpace, NDivider, NIcon, NTag } from 'naive-ui';
import { Icon } from '@iconify/vue';
import { NODE_TYPES } from '../nodes/NodeRegistry';

export default defineComponent({
  name: 'NodeConfigDrawer',
  props: {
    show: {
      type: Boolean,
      default: false
    },
    node: {
      type: Object as PropType<Api.Workflow.WorkflowNode | null>,
      default: null
    },
    onUpdate: {
      type: Function as PropType<(nodeId: string, updates: Partial<Api.Workflow.WorkflowNode>) => void>,
      default: undefined
    },
    onClose: {
      type: Function as PropType<() => void>,
      default: undefined
    }
  },
  setup(props) {
    // 表单数据
    const formData = ref<{
      label: string;
      description: string;
      config: any;
    }>({
      label: '',
      description: '',
      config: {}
    });

    // 监听节点变化，更新表单数据
    watch(() => props.node, (node) => {
      if (node) {
        formData.value = {
          label: node.name || '',
          description: node.description || '',
          config: { ...node.config }
        };
      }
    }, { immediate: true, deep: true });

    // 获取节点类型配置
    const nodeTypeConfig = computed(() => {
      if (!props.node) return null;
      return NODE_TYPES[props.node.type];
    });

    // 保存配置
    const handleSave = () => {
      if (!props.node || !props.onUpdate) return;

      props.onUpdate(props.node.id, {
        name: formData.value.label,
        description: formData.value.description,
        config: formData.value.config
      });

      props.onClose?.();
    };

    // 渲染不同类型节点的配置表单
    const renderConfigForm = () => {
      if (!props.node) return null;

      switch (props.node.type) {
        case 'ai':
          return (
            <>
              <NFormItem label="AI 模型">
                <NSelect
                  v-model:value={formData.value.config.model}
                  options={[
                    { label: 'GPT-4', value: 'gpt-4' },
                    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
                    { label: 'Claude 3', value: 'claude-3' }
                  ]}
                  placeholder="选择 AI 模型"
                />
              </NFormItem>

              <NFormItem label="提示词">
                <NInput
                  v-model:value={formData.value.config.prompt}
                  type="textarea"
                  rows={4}
                  placeholder="输入提示词..."
                />
              </NFormItem>

              <NFormItem label="系统提示">
                <NInput
                  v-model:value={formData.value.config.systemPrompt}
                  type="textarea"
                  rows={3}
                  placeholder="输入系统提示..."
                />
              </NFormItem>

              <NFormItem label="温度">
                <NInputNumber
                  v-model:value={formData.value.config.temperature}
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="0-2"
                  style={{ width: '100%' }}
                />
              </NFormItem>

              <NFormItem label="最大 Token 数">
                <NInputNumber
                  v-model:value={formData.value.config.maxTokens}
                  min={1}
                  max={4096}
                  placeholder="最大生成 token 数"
                  style={{ width: '100%' }}
                />
              </NFormItem>
            </>
          );

        case 'http':
          return (
            <>
              <NFormItem label="请求 URL">
                <NInput
                  v-model:value={formData.value.config.url}
                  placeholder="https://api.example.com/endpoint"
                />
              </NFormItem>

              <NFormItem label="请求方法">
                <NSelect
                  v-model:value={formData.value.config.method}
                  options={[
                    { label: 'GET', value: 'GET' },
                    { label: 'POST', value: 'POST' },
                    { label: 'PUT', value: 'PUT' },
                    { label: 'DELETE', value: 'DELETE' },
                    { label: 'PATCH', value: 'PATCH' }
                  ]}
                />
              </NFormItem>

              <NFormItem label="请求头 (JSON)">
                <NInput
                  v-model:value={formData.value.config.headers}
                  type="textarea"
                  rows={3}
                  placeholder='{"Content-Type": "application/json"}'
                />
              </NFormItem>

              <NFormItem label="请求体">
                <NInput
                  v-model:value={formData.value.config.body}
                  type="textarea"
                  rows={4}
                  placeholder="请求体内容..."
                />
              </NFormItem>

              <NFormItem label="超时时间 (ms)">
                <NInputNumber
                  v-model:value={formData.value.config.timeout}
                  min={0}
                  placeholder="超时时间"
                  style={{ width: '100%' }}
                />
              </NFormItem>
            </>
          );

        case 'database':
          return (
            <>
              <NFormItem label="连接字符串">
                <NInput
                  v-model:value={formData.value.config.connectionString}
                  placeholder="数据库连接字符串"
                  type="password"
                  showPasswordOn="click"
                />
              </NFormItem>

              <NFormItem label="SQL 查询">
                <NInput
                  v-model:value={formData.value.config.query}
                  type="textarea"
                  rows={6}
                  placeholder="SELECT * FROM table WHERE ..."
                />
              </NFormItem>

              <NFormItem label="查询参数 (JSON)">
                <NInput
                  v-model:value={formData.value.config.parameters}
                  type="textarea"
                  rows={3}
                  placeholder='{"param1": "value1"}'
                />
              </NFormItem>
            </>
          );

        case 'condition':
          return (
            <>
              <NFormItem label="条件表达式">
                <NInput
                  v-model:value={formData.value.config.expression}
                  placeholder="例如: input.value > 100"
                />
              </NFormItem>

              <NFormItem label="True 分支说明">
                <NInput
                  v-model:value={formData.value.config.trueBranch}
                  placeholder="条件为真时的说明"
                />
              </NFormItem>

              <NFormItem label="False 分支说明">
                <NInput
                  v-model:value={formData.value.config.falseBranch}
                  placeholder="条件为假时的说明"
                />
              </NFormItem>
            </>
          );

        case 'transform':
          return (
            <>
              <NFormItem label="转换语言">
                <NSelect
                  v-model:value={formData.value.config.language}
                  options={[
                    { label: 'JavaScript', value: 'javascript' },
                    { label: 'Python', value: 'python' }
                  ]}
                />
              </NFormItem>

              <NFormItem label="转换代码">
                <NInput
                  v-model:value={formData.value.config.code}
                  type="textarea"
                  rows={10}
                  placeholder="输入转换代码..."
                />
              </NFormItem>
            </>
          );

        case 'file':
          return (
            <>
              <NFormItem label="文件操作">
                <NSelect
                  v-model:value={formData.value.config.operation}
                  options={[
                    { label: '读取', value: 'read' },
                    { label: '写入', value: 'write' },
                    { label: '删除', value: 'delete' }
                  ]}
                />
              </NFormItem>

              <NFormItem label="文件路径">
                <NInput
                  v-model:value={formData.value.config.path}
                  placeholder="/path/to/file.txt"
                />
              </NFormItem>

              {formData.value.config.operation === 'write' && (
                <NFormItem label="文件内容">
                  <NInput
                    v-model:value={formData.value.config.content}
                    type="textarea"
                    rows={6}
                    placeholder="文件内容..."
                  />
                </NFormItem>
              )}
            </>
          );

        default:
          return (
            <div class="text-gray-500 text-center py-8">
              此节点类型暂无特殊配置
            </div>
          );
      }
    };

    return () => (
      <NDrawer
        show={props.show}
        width={420}
        placement="right"
        onUpdateShow={(show: boolean) => {
          if (!show) props.onClose?.();
        }}
      >
        <NDrawerContent
          title="节点配置"
          closable
          nativeScrollbar={false}
        >
          {{
            default: () => {
              if (!props.node) {
                return (
                  <div class="flex items-center justify-center h-full text-gray-400">
                    <div class="text-center">
                      <NIcon size={48} class="mb-4">
                        <Icon icon="mdi:cog-outline" />
                      </NIcon>
                      <div>请选择一个节点</div>
                    </div>
                  </div>
                );
              }

              return (
                <div class="space-y-4">
                  {/* 节点信息 */}
                  <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div class="flex items-center gap-3 mb-3">
                      {nodeTypeConfig.value && (
                        <div
                          class="flex items-center justify-center"
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: `${nodeTypeConfig.value.color}20`,
                            color: nodeTypeConfig.value.color
                          }}
                        >
                          <NIcon size={20}>
                            <Icon icon={nodeTypeConfig.value.icon} />
                          </NIcon>
                        </div>
                      )}
                      <div class="flex-1">
                        <div class="font-semibold text-gray-800 dark:text-gray-100">
                          {nodeTypeConfig.value?.label}
                        </div>
                        <div class="text-xs text-gray-500">
                          ID: {props.node.id}
                        </div>
                      </div>
                      <NTag type={props.node.type === 'start' ? 'success' : props.node.type === 'end' ? 'error' : 'info'} size="small">
                        {props.node.type}
                      </NTag>
                    </div>
                    {nodeTypeConfig.value?.description && (
                      <div class="text-sm text-gray-600 dark:text-gray-400">
                        {nodeTypeConfig.value.description}
                      </div>
                    )}
                  </div>

                  <NDivider />

                  {/* 基础配置 */}
                  <NForm labelPlacement="top" labelWidth="auto">
                    <NFormItem label="节点名称">
                      <NInput
                        v-model:value={formData.value.label}
                        placeholder="输入节点名称"
                      />
                    </NFormItem>

                    <NFormItem label="节点描述">
                      <NInput
                        v-model:value={formData.value.description}
                        type="textarea"
                        rows={2}
                        placeholder="输入节点描述"
                      />
                    </NFormItem>

                    <NDivider />

                    {/* 类型特定配置 */}
                    <div class="font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      节点配置
                    </div>
                    {renderConfigForm()}
                  </NForm>
                </div>
              );
            },
            footer: () => (
              <NSpace justify="end">
                <NButton onClick={props.onClose}>
                  取消
                </NButton>
                <NButton type="primary" onClick={handleSave}>
                  保存
                </NButton>
              </NSpace>
            )
          }}
        </NDrawerContent>
      </NDrawer>
    );
  }
});

