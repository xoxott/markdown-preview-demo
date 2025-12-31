/**
 * Flow 示例 6: 空状态
 */

import { defineComponent, ref } from 'vue';
import { NCard, NH3, NText } from 'naive-ui';
import FlowCanvas from '@/components/flow/components/FlowCanvas';
import FlowEmptyState from '@/components/flow/components/FlowEmptyState';
import type { FlowNode, FlowEdge } from '@/components/flow';

export default defineComponent({
  name: 'FlowEmptyExample',
  setup() {
    const emptyNodes = ref<FlowNode[]>([]);
    const emptyEdges = ref<FlowEdge[]>([]);

    return () => (
      <NCard bordered>
        <NH3 class="border-b pb-2 text-lg font-semibold">Flow 示例 6: 空状态</NH3>
        <NText class="text-gray-500 mb-4 block">当画布为空时显示的空状态组件</NText>
        <div style={{ height: '300px', border: '1px solid #e0e0e0', borderRadius: '4px', position: 'relative' }}>
          <FlowCanvas
            id="empty-flow"
            initialNodes={emptyNodes.value}
            initialEdges={emptyEdges.value}
            width="100%"
            height="100%"
          >
            <FlowEmptyState
              title="画布为空"
              description="点击添加节点开始创建流程图"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            />
          </FlowCanvas>
        </div>
      </NCard>
    );
  }
});

