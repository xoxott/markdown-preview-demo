/**
 * Flow 示例 3: 状态管理
 */

import { defineComponent, ref } from 'vue';
import { NCard, NH3, NText, NSpace, NButton } from 'naive-ui';
import { useMessage } from 'naive-ui';
import FlowCanvas from '@/components/flow/components/FlowCanvas';
import { useFlowState } from '@/components/flow';
import type { FlowNode, FlowEdge } from '@/components/flow';

export default defineComponent({
  name: 'FlowStateExample',
  setup() {
    const message = useMessage();

    const {
      nodes: stateNodes,
      edges: stateEdges,
      selectedNodeIds,
      addNode,
      removeNode,
      addEdge,
      selectNode,
      undo,
      redo,
      canUndo,
      canRedo
    } = useFlowState({
      initialNodes: [
        {
          id: 'state-node-1',
          type: 'default',
          position: { x: 100, y: 200 },
          size: { width: 150, height: 60 },
          data: { label: '状态节点 1' },
          handles: [
            { id: 'source-s1', type: 'source', position: 'right' },
            { id: 'target-s1', type: 'target', position: 'left' }
          ]
        }
      ],
      initialEdges: [],
      maxHistorySize: 50
    });

    const newNodeId = ref(2);
    const newEdgeId = ref(1);

    const handleAddNode = () => {
      const node: FlowNode = {
        id: `state-node-${newNodeId.value}`,
        type: 'default',
        position: {
          x: Math.random() * 400 + 100,
          y: Math.random() * 200 + 200
        },
        size: { width: 150, height: 60 },
        data: { label: `新节点 ${newNodeId.value}` },
        handles: [
          { id: `source-${newNodeId.value}`, type: 'source', position: 'right' },
          { id: `target-${newNodeId.value}`, type: 'target', position: 'left' }
        ]
      };
      addNode(node);
      newNodeId.value++;
      message.success('添加节点成功');
    };

    const handleAddEdge = () => {
      if (stateNodes.value.length < 2) {
        message.warning('至少需要 2 个节点才能创建连接');
        return;
      }
      const edge: FlowEdge = {
        id: `state-edge-${newEdgeId.value}`,
        source: stateNodes.value[0].id,
        target: stateNodes.value[stateNodes.value.length - 1].id,
        type: 'bezier'
      };
      addEdge(edge);
      newEdgeId.value++;
      message.success('添加连接成功');
    };

    return () => (
      <NCard bordered>
        <NH3 class="border-b pb-2 text-lg font-semibold">Flow 示例 3: 状态管理</NH3>
        <NText class="text-gray-500 mb-4 block">
          演示状态管理功能，包括添加/删除节点、撤销/重做等操作
        </NText>
        <NSpace class="mb-4">
          <NButton size="small" type="primary" onClick={handleAddNode}>
            添加节点
          </NButton>
          <NButton
            size="small"
            onClick={() => {
              if (stateNodes.value.length > 0) {
                removeNode(stateNodes.value[stateNodes.value.length - 1].id);
                message.success('删除节点成功');
              }
            }}
          >
            删除节点
          </NButton>
          <NButton size="small" onClick={handleAddEdge}>
            添加连接
          </NButton>
          <NButton size="small" onClick={undo} disabled={!canUndo.value}>
            撤销
          </NButton>
          <NButton size="small" onClick={redo} disabled={!canRedo.value}>
            重做
          </NButton>
        </NSpace>
        <NText class="text-sm text-gray-400 mb-4 block">
          节点数: {stateNodes.value.length}, 连接数: {stateEdges.value.length}, 选中节点:{' '}
          {selectedNodeIds.value.join(', ') || '无'}
        </NText>
        <div style={{ height: '300px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <FlowCanvas
            id="state-flow"
            initialNodes={stateNodes.value}
            initialEdges={stateEdges.value}
            width="100%"
            height="100%"
            onNode-click={(node: FlowNode) => selectNode(node.id)}
          />
        </div>
      </NCard>
    );
  }
});

