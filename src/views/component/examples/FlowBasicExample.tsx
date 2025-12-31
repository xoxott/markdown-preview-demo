/**
 * Flow 示例 1: 基础使用
 */

import { defineComponent, ref } from 'vue';
import { NCard, NH3, NText } from 'naive-ui';
import { useMessage } from 'naive-ui';
import FlowCanvas from '@/components/flow/components/FlowCanvas';
import type { FlowNode, FlowEdge } from '@/components/flow';

export default defineComponent({
  name: 'FlowBasicExample',
  setup() {
    const message = useMessage();

    const basicNodes = ref<FlowNode[]>([
      {
        id: 'node-1',
        type: 'default',
        position: { x: 100, y: 100 },
        size: { width: 150, height: 60 },
        data: { label: '开始节点' },
        handles: [
          { id: 'source-1', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'node-2',
        type: 'default',
        position: { x: 300, y: 100 },
        size: { width: 150, height: 60 },
        data: { label: '处理节点' },
        handles: [
          { id: 'target-2', type: 'target', position: 'left' },
          { id: 'source-2', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'node-3',
        type: 'default',
        position: { x: 500, y: 100 },
        size: { width: 150, height: 60 },
        data: { label: '结束节点' },
        handles: [
          { id: 'target-3', type: 'target', position: 'left' }
        ]
      }
    ]);

    const basicEdges = ref<FlowEdge[]>([
      {
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'source-1',
        targetHandle: 'target-2',
        type: 'bezier'
      },
      {
        id: 'edge-2',
        source: 'node-2',
        target: 'node-3',
        sourceHandle: 'source-2',
        targetHandle: 'target-3',
        type: 'bezier'
      }
    ]);

    const handleBasicNodeClick = (node: FlowNode, event: MouseEvent) => {
      message.info(`点击了节点: ${node.data?.label || node.id}`);
    };

    const handleBasicConnect = (connection: any) => {
      message.success(`创建连接: ${connection.source} -> ${connection.target}`);
    };

    return () => (
      <NCard bordered>
        <NH3 class="border-b pb-2 text-lg font-semibold">Flow 示例 1: 基础使用</NH3>
        <NText class="text-gray-500 mb-4 block">
          最基本的 Flow 画布，包含节点和连接线，支持点击和连接事件
        </NText>
        <div style={{ height: '300px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <FlowCanvas
            id="basic-flow"
            initialNodes={basicNodes.value}
            initialEdges={basicEdges.value}
            width="100%"
            height="100%"
            onNode-click={handleBasicNodeClick}
            onConnect={handleBasicConnect}
          />
        </div>
      </NCard>
    );
  }
});

