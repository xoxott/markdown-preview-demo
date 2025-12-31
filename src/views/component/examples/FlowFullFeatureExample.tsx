/**
 * Flow 示例 4: 完整功能（带工具组件）
 */

import { defineComponent, ref } from 'vue';
import { NCard, NH3, NText } from 'naive-ui';
import { useMessage } from 'naive-ui';
import FlowCanvas from '@/components/flow/components/FlowCanvas';
import FlowBackground from '@/components/flow/components/FlowBackground';
import FlowMinimap from '@/components/flow/components/FlowMinimap';
import FlowToolbar from '@/components/flow/components/FlowToolbar';
import type { FlowNode, FlowEdge, FlowViewport } from '@/components/flow';

export default defineComponent({
  name: 'FlowFullFeatureExample',
  setup() {
    const message = useMessage();

    const fullFeatureNodes = ref<FlowNode[]>([
      {
        id: 'full-1',
        type: 'default',
        position: { x: 200, y: 100 },
        size: { width: 150, height: 60 },
        data: { label: '完整功能示例' },
        handles: [
          { id: 'source-f1', type: 'source', position: 'right' },
          { id: 'source-f1-top', type: 'source', position: 'top' }
        ]
      },
      {
        id: 'full-2',
        type: 'default',
        position: { x: 400, y: 100 },
        size: { width: 150, height: 60 },
        data: { label: '支持所有工具' },
        handles: [
          { id: 'target-f2', type: 'target', position: 'left' },
          { id: 'source-f2', type: 'source', position: 'right' },
          { id: 'target-f2-bottom', type: 'target', position: 'bottom' }
        ]
      },
      {
        id: 'full-3',
        type: 'default',
        position: { x: 300, y: 250 },
        size: { width: 150, height: 60 },
        data: { label: '小地图、工具栏' },
        handles: [
          { id: 'target-f3', type: 'target', position: 'top' },
          { id: 'source-f3', type: 'source', position: 'bottom' }
        ]
      }
    ]);

    const fullFeatureEdges = ref<FlowEdge[]>([
      {
        id: 'full-edge-1',
        source: 'full-1',
        target: 'full-2',
        type: 'bezier'
      },
      {
        id: 'full-edge-2',
        source: 'full-2',
        target: 'full-3',
        type: 'bezier'
      }
    ]);

    const fullFeatureViewport = ref<FlowViewport>({ x: 0, y: 0, zoom: 1 });

    const handleViewportChange = (newViewport: FlowViewport) => {
      fullFeatureViewport.value = newViewport;
    };

    const handleResetView = () => {
      fullFeatureViewport.value = { x: 0, y: 0, zoom: 1 };
      message.info('视图已重置');
    };

    const handleFitView = () => {
      // 计算所有节点的边界框并适应视图
      if (fullFeatureNodes.value.length > 0) {
        const minX = Math.min(...fullFeatureNodes.value.map(n => n.position.x));
        const minY = Math.min(...fullFeatureNodes.value.map(n => n.position.y));
        const maxX = Math.max(...fullFeatureNodes.value.map(n => n.position.x + (n.size?.width || 220)));
        const maxY = Math.max(...fullFeatureNodes.value.map(n => n.position.y + (n.size?.height || 72)));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const width = maxX - minX;
        const height = maxY - minY;

        // 简单的适应视图逻辑
        const scale = Math.min(800 / width, 400 / height, 1);
        fullFeatureViewport.value = {
          x: 400 - centerX * scale,
          y: 200 - centerY * scale,
          zoom: scale
        };
        message.success('已适应视图');
      }
    };

    return () => (
      <NCard bordered>
        <NH3 class="border-b pb-2 text-lg font-semibold">Flow 示例 4: 完整功能（带工具组件）</NH3>
        <NText class="text-gray-500 mb-4 block">
          包含网格背景、小地图、工具栏等完整功能的 Flow 画布
        </NText>
        <div
          style={{
            height: '500px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            position: 'relative'
          }}
        >
          <FlowCanvas
            id="full-feature-flow"
            initialNodes={fullFeatureNodes.value}
            initialEdges={fullFeatureEdges.value}
            initialViewport={fullFeatureViewport.value}
            width="100%"
            height="100%"
            onViewport-change={handleViewportChange}
          >
            <FlowBackground
              gridType="dots"
              gridSize={20}
              viewport={fullFeatureViewport.value}
            />
            <FlowMinimap
              nodes={fullFeatureNodes.value}
              viewport={fullFeatureViewport.value}
              onViewportChange={handleViewportChange}
              style={{ position: 'absolute', bottom: '20px', right: '20px', width: '200px', height: '150px' }}
            />
            <FlowToolbar
              viewport={fullFeatureViewport.value}
              minZoom={0.1}
              maxZoom={4}
              onZoomChange={(zoom: number) => {
                fullFeatureViewport.value = { ...fullFeatureViewport.value, zoom };
              }}
              onResetView={handleResetView}
              onFitView={handleFitView}
              style={{ position: 'absolute', top: '20px', right: '20px' }}
            />
          </FlowCanvas>
        </div>
      </NCard>
    );
  }
});

