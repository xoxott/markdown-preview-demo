/**
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 21:48:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-08 14:34:28
 * @FilePath: \markdown-preview-demo\src\views\component\index.tsx
 * @Description: 组件示例页面，包含各种组件的使用示例
 */
import { defineComponent, ref, computed, onMounted } from 'vue';
import {
  NCard,
  NH3,
  NForm,
  NFormItem,
  NText,
  NScrollbar,
  NDivider,
  NButton,
  NSpace,
  NInputNumber,
  NSelect,
  useMessage
} from 'naive-ui';
import type { FileItem } from '@/components/file-explorer/types/file-explorer';
import NSelectionRect from '@/components/file-explorer/interaction/NSelectionRect';
import CustomUpload from '@/components/custom-upload';
import CountdownTimer from '@/components/custom/countdown-timer.vue';
import EditableText from '@/components/custom/editableText';

// Flow 组件导入
import FlowCanvas from '@/components/flow/components/FlowCanvas';
import FlowBackground from '@/components/flow/components/FlowBackground';
import FlowMinimap from '@/components/flow/components/FlowMinimap';
import FlowToolbar from '@/components/flow/components/FlowToolbar';
import FlowEmptyState from '@/components/flow/components/FlowEmptyState';
import FlowPerformanceMonitor from '@/components/flow/components/FlowPerformanceMonitor';
import {
  useFlowConfig,
  useFlowState,
  FlowEventEmitter,
  FlowConfigManager,
  FlowPluginLoader,
  type FlowNode,
  type FlowEdge,
  type FlowConfig,
  type FlowViewport
} from '@/components/flow';

export default defineComponent({
  name: 'ComponentExample',
  setup() {
    const message = useMessage();

    // ==================== 基础组件示例 ====================
    const handleChange = (files: File[]) => {
      console.log('上传的文件:', files);
    };

    const handleSelectionChange = (selected: FileItem[]) => {
      console.log('圈选的文件:', selected);
    };

    const handleSelectionStart = (selected: FileItem[]) => {
      console.log('开始圈选', selected);
    };

    const handleSelectionEnd = (selected: FileItem[]) => {
      console.log('结束圈选', selected);
    };

    // ==================== Flow 示例 1: 基础使用 ====================
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

    // ==================== Flow 示例 2: 配置管理 ====================
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

    // ==================== Flow 示例 3: 状态管理 ====================
    const {
      nodes: stateNodes,
      edges: stateEdges,
      viewport,
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

    // ==================== Flow 示例 4: 完整功能（带工具组件） ====================
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

    const handleZoomIn = () => {
      fullFeatureViewport.value = {
        ...fullFeatureViewport.value,
        zoom: Math.min(fullFeatureViewport.value.zoom + 0.1, 4)
      };
    };

    const handleZoomOut = () => {
      fullFeatureViewport.value = {
        ...fullFeatureViewport.value,
        zoom: Math.max(fullFeatureViewport.value.zoom - 0.1, 0.1)
      };
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

    // ==================== Flow 示例 5: 性能测试（可配置节点数量） ====================
    const perfNodeCount = ref(200); // 默认 200 个节点
    const perfShowMonitor = ref(true); // 显示性能监控

    // 生成性能测试节点（优化布局，确保在默认视图下可见）
    const generatePerformanceNodes = (count: number): FlowNode[] => {
      const nodes: FlowNode[] = [];

      // ✅ 优化：根据常见屏幕尺寸计算布局
      // 假设画布大小约为 1200x600（常见尺寸）
      const canvasWidth = 1200;
      const canvasHeight = 600;

      const nodeWidth = 120;  // 减小节点宽度
      const nodeHeight = 50;  // 减小节点高度
      const spacingX = 140;   // 减小水平间距
      const spacingY = 70;    // 减小垂直间距
      const padding = 30;     // 边距

      // 计算可用空间
      const availableWidth = canvasWidth - 2 * padding;
      const availableHeight = canvasHeight - 2 * padding;

      // 计算列数和行数
      const cols = Math.floor(availableWidth / spacingX);
      const rows = Math.ceil(count / cols);

      // 如果行数过多，调整布局使其更紧凑
      const actualSpacingY = rows > (availableHeight / spacingY)
        ? availableHeight / rows
        : spacingY;

      for (let i = 0; i < count; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * spacingX + padding;
        const y = row * actualSpacingY + padding;

        nodes.push({
          id: `perf-node-${i}`,
          type: 'default',
          position: { x, y },
          size: { width: nodeWidth, height: nodeHeight },
          data: { label: `节点 ${i + 1}` },
          draggable: true,      // 显式启用拖拽
          selectable: true,     // 显式启用选择
          connectable: true,    // 显式启用连接
          handles: [
            { id: `source-${i}`, type: 'source', position: 'right' },
            { id: `target-${i}`, type: 'target', position: 'left' }
          ]
        });
      }

      return nodes;
    };

    // 生成连接线（每行连接相邻节点）
    const generatePerformanceEdges = (nodeCount: number): FlowEdge[] => {
      const edges: FlowEdge[] = [];

      // ✅ 使用与节点生成相同的列数计算
      const canvasWidth = 1200;
      const spacingX = 140;
      const padding = 30;
      const availableWidth = canvasWidth - 2 * padding;
      const cols = Math.floor(availableWidth / spacingX);

      // 每行连接相邻节点
      for (let i = 0; i < nodeCount - 1; i++) {
        // 连接同一行的相邻节点
        if ((i + 1) % cols !== 0) {
          edges.push({
            id: `perf-edge-${i}-${i + 1}`,
            source: `perf-node-${i}`,
            target: `perf-node-${i + 1}`,
            sourceHandle: `source-${i}`,
            targetHandle: `target-${i + 1}`,
            type: 'bezier'
          });
        }
      }

      return edges;
    };

    // 初始化性能测试数据
    const performanceNodes = ref<FlowNode[]>(generatePerformanceNodes(perfNodeCount.value));
    const performanceEdges = ref<FlowEdge[]>(generatePerformanceEdges(perfNodeCount.value));

    // 重新生成性能测试数据
    const regeneratePerformanceData = () => {
      performanceNodes.value = generatePerformanceNodes(perfNodeCount.value);
      performanceEdges.value = generatePerformanceEdges(perfNodeCount.value);
      message.success(`已生成 ${perfNodeCount.value} 个节点`);
    };

    // ==================== Flow 示例 6: 空状态 ====================
    const emptyNodes = ref<FlowNode[]>([]);
    const emptyEdges = ref<FlowEdge[]>([]);

    return () => (
      <div class="p-4 space-y-4">
        <NCard bordered>
          <NH3 class="border-b pb-2 text-lg font-semibold">基础组件示例:</NH3>
          <NForm label-placement="left" show-label={true}>
            <NFormItem label="自定义上传组件" class="flex items-center">
              <CustomUpload
                multiple={true}
                max-count={5}
                accept=".png,.jpg,.jpeg,.gif"
                abstract
                onChange={handleChange}
              />
            </NFormItem>

            <NFormItem label="倒计时组件" class="flex items-center">
              <CountdownTimer seconds={35} label="预计剩余时间:" show-trend={true} />
            </NFormItem>

            <NFormItem label="可编辑文本组件" class="flex items-center">
              <EditableText value="可编辑内容" />
            </NFormItem>

            <NText class="text-red">
              支持圈选自动横向、纵向滚动 注：通过插槽插入 NScrollbar 使用
            </NText>

            <NFormItem label="圈选组件" class="flex items-center">
              <NSelectionRect>
                <NScrollbar class="h-50 w-100" x-scrollable>
                  {Array.from({ length: 50 }, (_, index) => {
                    const i = index + 1;
                    return (
                      <div
                        key={i}
                        data-selectable-id={`${i}`}
                        class="whitespace-nowrap"
                        style={{
                          width: '1200px',
                          marginTop: i === 50 ? '50px' : '',
                          marginBottom: i === 1 ? '50px' : ''
                        }}
                      >
                        在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选
                        {i}
                      </div>
                    );
                  })}
                </NScrollbar>
              </NSelectionRect>
            </NFormItem>
          </NForm>
        </NCard>

        <NDivider />

        {/* Flow 示例 1: 基础使用 */}
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

        {/* Flow 示例 2: 配置管理 */}
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

        {/* Flow 示例 3: 状态管理 */}
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

        {/* Flow 示例 4: 完整功能 */}
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

        {/* Flow 示例 5: 性能测试（可配置节点数量） */}
        <NCard bordered>
          <NH3 class="border-b pb-2 text-lg font-semibold">Flow 示例 5: 性能测试（可配置节点数量）</NH3>
          <NText class="text-gray-500 mb-4 block">
            测试大量节点的渲染性能。已启用空间索引、视口裁剪、RAF节流等优化。观察性能监控面板查看实时FPS。
          </NText>
          <NSpace class="mb-4" vertical>
            <NSpace>
              <NText class="text-sm">节点数量:</NText>
              <NInputNumber
                v-model:value={perfNodeCount.value}
                min={10}
                max={10000}
                step={50}
                style={{ width: '120px' }}
              />
              <NButton size="small" type="primary" onClick={regeneratePerformanceData}>
                重新生成
              </NButton>
              <NButton
                size="small"
                onClick={() => {
                  perfShowMonitor.value = !perfShowMonitor.value;
                }}
              >
                {perfShowMonitor.value ? '隐藏' : '显示'}性能监控
              </NButton>
            </NSpace>
            <NText class="text-sm text-gray-400">
              当前: {performanceNodes.value.length} 个节点, {performanceEdges.value.length} 条连接线
            </NText>
          </NSpace>
          <div style={{ height: '600px', border: '1px solid #e0e0e0', borderRadius: '4px', position: 'relative' }}>
            <FlowCanvas
              id="performance-flow"
              initialNodes={performanceNodes.value}
              initialEdges={performanceEdges.value}
              config={{
                performance: {
                  enableViewportCulling: true,
                  enableEdgeCanvasRendering: false,
                  edgeCanvasThreshold: 100,
                  virtualScrollBuffer: 200,
                  enableRAFThrottle: true
                },
                canvas: {
                  showGrid: true,
                  gridType: 'dots',
                  gridSize: 20,
                  zoomOnScroll: true,
                  panOnDrag: true
                },
                nodes: {
                  draggable: true,      // 启用节点拖拽
                  selectable: true,     // 启用节点选择
                  connectable: true     // 启用节点连接
                },
                interaction: {
                  nodesDraggable: true, // 全局启用拖拽
                  nodesSelectable: true // 全局启用选择
                }
              }}
              width="100%"
              height="100%"
            >
              {perfShowMonitor.value && (
                <FlowPerformanceMonitor
                  totalNodes={performanceNodes.value.length}
                  visibleNodes={performanceNodes.value.length}
                  totalEdges={performanceEdges.value.length}
                  visibleEdges={performanceEdges.value.length}
                  position="top-right"
                />
              )}
            </FlowCanvas>
          </div>
        </NCard>

        {/* Flow 示例 6: 空状态 */}
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
      </div>
    );
  }
});
