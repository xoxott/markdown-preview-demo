/**
 * Flow 示例 8: 贝塞尔曲线弧度配置
 * 展示 bezierControlOffset 配置对连接线弧度的影响
 */

import { defineComponent, ref } from 'vue';
import { NCard, NH3, NText, NSpace, NTag } from 'naive-ui';
import FlowCanvas from '@/components/flow/components/FlowCanvas';
import type { FlowNode, FlowEdge, FlowConfig } from '@/components/flow';

export default defineComponent({
  name: 'FlowBezierExample',
  setup() {
    // 创建相同布局的节点
    const createNodes = (): FlowNode[] => [
      {
        id: 'node-1',
        type: 'default',
        position: { x: 50, y: 80 },
        size: { width: 120, height: 50 },
        data: { label: '起点' },
        handles: [
          { id: 'source-1', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'node-2',
        type: 'default',
        position: { x: 250, y: 80 },
        size: { width: 120, height: 50 },
        data: { label: '终点' },
        handles: [
          { id: 'target-2', type: 'target', position: 'left' }
        ]
      }
    ];

    // 示例 1: 默认弧度 (0.5)
    const defaultNodes = ref<FlowNode[]>(createNodes());
    const defaultEdges = ref<FlowEdge[]>([
      {
        id: 'edge-default',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'source-1',
        targetHandle: 'target-2',
        type: 'bezier'
      }
    ]);
    const defaultConfig = ref<Partial<FlowConfig>>({
      edges: {
        bezierControlOffset: 0.5 // 默认值
      }
    });

    // 示例 2: 小弧度 (0.1)
    const smallNodes = ref<FlowNode[]>(createNodes());
    const smallEdges = ref<FlowEdge[]>([
      {
        id: 'edge-small',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'source-1',
        targetHandle: 'target-2',
        type: 'bezier'
      }
    ]);
    const smallConfig = ref<Partial<FlowConfig>>({
      edges: {
        bezierControlOffset: 0.1 // 小弧度，接近直线
      }
    });

    // 示例 3: 大弧度 (0.9)
    const largeNodes = ref<FlowNode[]>(createNodes());
    const largeEdges = ref<FlowEdge[]>([
      {
        id: 'edge-large',
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'source-1',
        targetHandle: 'target-2',
        type: 'bezier'
      }
    ]);
    const largeConfig = ref<Partial<FlowConfig>>({
      edges: {
        bezierControlOffset: 0.9 // 大弧度，明显曲线
      }
    });

    // 示例 4: 单条线配置不同弧度（全局 0.3）
    const mixedNodes = ref<FlowNode[]>([
      {
        id: 'node-a',
        type: 'default',
        position: { x: 50, y: 30 },
        size: { width: 100, height: 50 },
        data: { label: 'A' },
        handles: [
          { id: 'source-a', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'node-b',
        type: 'default',
        position: { x: 50, y: 100 },
        size: { width: 100, height: 50 },
        data: { label: 'B' },
        handles: [
          { id: 'source-b', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'node-c',
        type: 'default',
        position: { x: 50, y: 170 },
        size: { width: 100, height: 50 },
        data: { label: 'C' },
        handles: [
          { id: 'source-c', type: 'source', position: 'right' }
        ]
      },
      {
        id: 'node-d',
        type: 'default',
        position: { x: 270, y: 100 },
        size: { width: 100, height: 50 },
        data: { label: 'D' },
        handles: [
          { id: 'target-d', type: 'target', position: 'left' }
        ]
      }
    ]);
    const mixedEdges = ref<FlowEdge[]>([
      {
        id: 'edge-a-d',
        source: 'node-a',
        target: 'node-d',
        sourceHandle: 'source-a',
        targetHandle: 'target-d',
        type: 'bezier',
        bezierControlOffset: 0.1 // 小弧度
      },
      {
        id: 'edge-b-d',
        source: 'node-b',
        target: 'node-d',
        sourceHandle: 'source-b',
        targetHandle: 'target-d',
        type: 'bezier'
        // 使用全局配置 0.3
      },
      {
        id: 'edge-c-d',
        source: 'node-c',
        target: 'node-d',
        sourceHandle: 'source-c',
        targetHandle: 'target-d',
        type: 'bezier',
        bezierControlOffset: 0.8 // 大弧度
      }
    ]);
    const mixedConfig = ref<Partial<FlowConfig>>({
      edges: {
        bezierControlOffset: 0.3 // 全局默认
      }
    });

    return () => (
      <NCard bordered>
        <NH3 class="border-b pb-2 text-lg font-semibold">Flow 示例 8: 贝塞尔曲线弧度配置</NH3>
        <NText class="text-gray-500 mb-4 block">
          通过 <code>bezierControlOffset</code> 配置控制贝塞尔曲线的弧度（0-1 之间，值越大弧度越大）
        </NText>

        <NSpace vertical size="large">
          {/* 示例 1: 默认弧度 */}
          <div>
            <div class="flex items-center gap-2 mb-2">
              <NTag type="info">bezierControlOffset: 0.5 (默认)</NTag>
              <NText depth={3}>中等弧度</NText>
            </div>
            <div style={{ height: '200px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <FlowCanvas
                id="bezier-default-flow"
                initialNodes={defaultNodes.value}
                initialEdges={defaultEdges.value}
                config={defaultConfig.value}
                width="100%"
                height="100%"
              />
            </div>
          </div>

          {/* 示例 2: 小弧度 */}
          <div>
            <div class="flex items-center gap-2 mb-2">
              <NTag type="success">bezierControlOffset: 0.1</NTag>
              <NText depth={3}>小弧度，接近直线</NText>
            </div>
            <div style={{ height: '200px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <FlowCanvas
                id="bezier-small-flow"
                initialNodes={smallNodes.value}
                initialEdges={smallEdges.value}
                config={smallConfig.value}
                width="100%"
                height="100%"
              />
            </div>
          </div>

          {/* 示例 3: 大弧度 */}
          <div>
            <div class="flex items-center gap-2 mb-2">
              <NTag type="warning">bezierControlOffset: 0.9</NTag>
              <NText depth={3}>大弧度，明显曲线</NText>
            </div>
            <div style={{ height: '200px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <FlowCanvas
                id="bezier-large-flow"
                initialNodes={largeNodes.value}
                initialEdges={largeEdges.value}
                config={largeConfig.value}
                width="100%"
                height="100%"
              />
            </div>
          </div>

          {/* 示例 4: 混合配置 */}
          <div>
            <div class="mb-2">
              <div class="flex items-center gap-2 mb-1">
                <NTag type="info">全局: 0.3</NTag>
                <NText depth={3}>不同连接线使用不同弧度</NText>
              </div>
              <div class="flex items-center gap-3 ml-2">
                <NText depth={3} class="text-sm">A→D: 0.1（小）</NText>
                <NText depth={3} class="text-sm">B→D: 0.3（全局）</NText>
                <NText depth={3} class="text-sm">C→D: 0.8（大）</NText>
              </div>
            </div>
            <div style={{ height: '260px', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
              <FlowCanvas
                id="bezier-mixed-flow"
                initialNodes={mixedNodes.value}
                initialEdges={mixedEdges.value}
                config={mixedConfig.value}
                width="100%"
                height="100%"
              />
            </div>
          </div>
        </NSpace>
      </NCard>
    );
  }
});

