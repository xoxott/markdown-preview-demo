import { defineComponent, computed, reactive, watch, type PropType } from 'vue';
import {
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NInputNumber,
  NSwitch,
  NButton,
  NEmpty,
  NDivider
} from 'naive-ui';
import MonacoEditor from '@/components/monaco/MonacoEditor';

export default defineComponent({
  name: 'NodeConfigPanel',
  props: {
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
    const formData = reactive<any>({
      label: '',
      description: '',
      config: {}
    });

    // 监听节点变化，更新表单数据
    watch(
      () => props.node,
      node => {
        if (node) {
          formData.label = node.name || '';
          formData.description = node.description || '';
          formData.config = { ...node.config };
        }
      },
      { immediate: true }
    );

    const handleSave = () => {
      if (!props.node || !props.onUpdate) return;

      props.onUpdate(props.node.id, {
        name: formData.label,
        description: formData.description,
        config: formData.config
      });
    };

    // 根据节点类型渲染不同的配置表单
    const renderConfigForm = () => {
      if (!props.node) return null;

      switch (props.node.type) {
        case 'ai':
          return renderAIConfig();
        case 'http':
          return renderHttpConfig();
        case 'database':
          return renderDatabaseConfig();
        case 'condition':
          return renderConditionConfig();
        case 'transform':
          return renderTransformConfig();
        case 'file':
          return renderFileConfig();
        default:
          return null;
      }
    };

    const renderAIConfig = () => (
      <>
        <NFormItem label="模型">
          <NSelect
            v-model:value={formData.config.model}
            options={[
              { label: 'GPT-4', value: 'gpt-4' },
              { label: 'GPT-3.5', value: 'gpt-3.5-turbo' },
              { label: 'Claude', value: 'claude-3' }
            ]}
            placeholder="选择AI模型"
          />
        </NFormItem>
        <NFormItem label="提示词">
          <NInput
            v-model:value={formData.config.prompt}
            type="textarea"
            rows={4}
            placeholder="输入提示词"
          />
        </NFormItem>
        <NFormItem label="温度">
          <NInputNumber
            v-model:value={formData.config.temperature}
            min={0}
            max={2}
            step={0.1}
            placeholder="0-2"
          />
        </NFormItem>
        <NFormItem label="最大Tokens">
          <NInputNumber
            v-model:value={formData.config.maxTokens}
            min={1}
            max={4096}
            placeholder="最大生成长度"
          />
        </NFormItem>
      </>
    );

    const renderHttpConfig = () => (
      <>
        <NFormItem label="URL">
          <NInput v-model:value={formData.config.url} placeholder="https://api.example.com" />
        </NFormItem>
        <NFormItem label="方法">
          <NSelect
            v-model:value={formData.config.method}
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
            v-model:value={formData.config.headers}
            type="textarea"
            rows={3}
            placeholder='{"Content-Type": "application/json"}'
          />
        </NFormItem>
        <NFormItem label="请求体">
          <NInput v-model:value={formData.config.body} type="textarea" rows={4} />
        </NFormItem>
        <NFormItem label="超时 (秒)">
          <NInputNumber v-model:value={formData.config.timeout} min={1} max={300} />
        </NFormItem>
      </>
    );

    const renderDatabaseConfig = () => (
      <>
        <NFormItem label="连接字符串">
          <NInput
            v-model:value={formData.config.connectionString}
            type="password"
            showPasswordOn="click"
            placeholder="数据库连接字符串"
          />
        </NFormItem>
        <NFormItem label="查询语句">
          <NInput v-model:value={formData.config.query} type="textarea" rows={6} placeholder="SQL查询" />
        </NFormItem>
      </>
    );

    const renderConditionConfig = () => (
      <>
        <NFormItem label="条件表达式">
          <NInput
            v-model:value={formData.config.expression}
            type="textarea"
            rows={3}
            placeholder="例如: input.value > 100"
          />
        </NFormItem>
      </>
    );

    const renderTransformConfig = () => (
      <>
        <NFormItem label="转换代码">
          <div style={{ height: '300px', border: '1px solid #d0d0d0', borderRadius: '4px' }}>
            <MonacoEditor
              modelValue={formData.config.code || ''}
              language="javascript"
              onUpdate:modelValue={(val: string) => (formData.config.code = val)}
            />
          </div>
        </NFormItem>
        <NFormItem label="语言">
          <NSelect
            v-model:value={formData.config.language}
            options={[
              { label: 'JavaScript', value: 'javascript' },
              { label: 'Python', value: 'python' }
            ]}
          />
        </NFormItem>
      </>
    );

    const renderFileConfig = () => (
      <>
        <NFormItem label="操作类型">
          <NSelect
            v-model:value={formData.config.operation}
            options={[
              { label: '读取', value: 'read' },
              { label: '写入', value: 'write' },
              { label: '删除', value: 'delete' }
            ]}
          />
        </NFormItem>
        <NFormItem label="文件路径">
          <NInput v-model:value={formData.config.path} placeholder="/path/to/file" />
        </NFormItem>
        {formData.config.operation === 'write' && (
          <NFormItem label="文件内容">
            <NInput v-model:value={formData.config.content} type="textarea" rows={6} />
          </NFormItem>
        )}
      </>
    );

    return () => {
      if (!props.node) {
        return (
          <div class="h-full flex items-center justify-center bg-white dark:bg-gray-800">
            <NEmpty description="请选择一个节点进行配置" />
          </div>
        );
      }

      return (
        <div class="node-config-panel h-full flex flex-col bg-white dark:bg-gray-800">
          <div class="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 class="text-sm font-medium">节点配置</h3>
            {props.onClose && (
              <NButton text onClick={props.onClose}>
                ✕
              </NButton>
            )}
          </div>

          <div class="flex-1 overflow-y-auto p-4">
            <NForm labelPlacement="top" labelWidth={80}>
              {/* 基础信息 */}
              <NFormItem label="节点名称">
                <NInput v-model:value={formData.label} placeholder="节点名称" />
              </NFormItem>

              <NFormItem label="描述">
                <NInput
                  v-model:value={formData.description}
                  type="textarea"
                  rows={2}
                  placeholder="节点描述"
                />
              </NFormItem>

              <NDivider />

              {/* 节点特定配置 */}
              {renderConfigForm()}
            </NForm>
          </div>

          <div class="p-3 border-t border-gray-200 dark:border-gray-700">
            <NButton type="primary" block onClick={handleSave}>
              保存配置
            </NButton>
          </div>
        </div>
      );
    };
  }
});

