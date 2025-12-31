/**
 * Flow 示例 2: 配置管理
 */

import { defineComponent, ref } from 'vue';
import { NCard, NH3, NText, NSpace, NButton } from 'naive-ui';
import { useMessage } from 'naive-ui';
import FlowCanvas from '@/components/flow/components/FlowCanvas';
import { useFlowConfig } from '@/components/flow';
import type { FlowNode, FlowEdge } from '@/components/flow';

export default defineComponent({
  name: 'FlowConfigExample',
  setup() {
    const message = useMessage();

    const { config: flowConfig, updateConfig: updateFlowConfig } = useFlowConfig({
      id: 'example-canvas-1',
      initialConfig: {
        canvas: {
          minZoom: 0.1,
          maxZoom: 4,
          defaultZoom: 1,
          showGrid: true,
          gridType: 'dots',
          gridSize: 20
        },
        nodes: {
          draggable: true,
          selectable: true,
          connectable: true
        },
        edges: {
          defaultType: 'bezier',
          animated: true,
          showArrow: true
        }
      }
    });

    const configNodes = ref<FlowNode[]>([
      {
        id: 'config-node-1',
        type: 'default',
        position: { x: 150, y: 150 },
        size: { width: 150, height: 60 },
        data: { label: '配置节点 1' },
        handles: [
          { id: 'source-c1', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'config-node-2',
        type: 'default',
        position: { x: 350, y: 150 },
        size: { width: 150, height: 60 },
        data: { label: '配置节点 2' },
        handles: [
          { id: 'target-c2', type: 'target', position: 'left' }
        ]
      }
    ]);

    const configEdges = ref<FlowEdge[]>([]);

    return () => (
      <NCard bordered>
        <NH3 class="border-b pb-2 text-lg font-semibold">Flow 示例 2: 配置管理</NH3>
        <NText class="text-gray-500 mb-4 block">
          演示配置管理功能，可以动态修改画布配置（网格、缩放、节点行为等）
        </NText>
        <NSpace class="mb-4" vertical>
          <NSpace>
            <NButton
              size="small"
              onClick={() => {
                updateFlowConfig({
                  canvas: { gridType: 'dots' }
                });
                message.success('切换为点状网格');
              }}
            >
              点状网格
            </NButton>
            <NButton
              size="small"
              onClick={() => {
                updateFlowConfig({
                  canvas: { gridType: 'lines' }
                });
                message.success('切换为线状网格');
              }}
            >
              线状网格
            </NButton>
            <NButton
              size="small"
              onClick={() => {
                updateFlowConfig({
                  edges: { animated: !flowConfig.value.edges?.animated }
                });
                message.success(
                  flowConfig.value.edges?.animated ? '关闭动画' : '开启动画'
                );
              }}
            >
              切换动画
            </NButton>
          </NSpace>
          <NText class="text-sm text-gray-400">
            当前配置: 网格类型={flowConfig.value.canvas?.gridType || 'dots'}, 动画=
            {flowConfig.value.edges?.animated ? '开启' : '关闭'}
          </NText>
        </NSpace>
        <div style={{ height: '300px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <FlowCanvas
            id="example-canvas-1"
            config={flowConfig.value}
            initialNodes={configNodes.value}
            initialEdges={configEdges.value}
            width="100%"
            height="100%"
          />
        </div>
      </NCard>
    );
  }
});

