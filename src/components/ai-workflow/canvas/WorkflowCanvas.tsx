import { defineComponent, computed, h, ref, watch, onMounted, onUnmounted, type PropType } from 'vue';
import { useWorkflowCanvas } from '../hooks/useWorkflowCanvas';
import { NODE_TYPES } from '../nodes/NodeRegistry';
import CanvasGrid from './CanvasGrid';
import CanvasToolbar from './CanvasToolbar';
import ConnectionLine from './ConnectionLine';
import Minimap from './Minimap';
import NodeConfigDrawer from '../panels/NodeConfigDrawer';
import { NIcon } from 'naive-ui';
import { Icon } from '@iconify/vue';

export default defineComponent({
  name: 'WorkflowCanvas',
  props: {
    initialDefinition: {
      type: Object as PropType<Api.Workflow.WorkflowDefinition>,
      default: undefined
    },
    onSave: {
      type: Function as PropType<(definition: Api.Workflow.WorkflowDefinition) => void>,
      default: undefined
    },
    onNodeSelect: {
      type: Function as PropType<(nodeId: string | null) => void>,
      default: undefined
    }
  },
  setup(props) {
    const canvas = useWorkflowCanvas({
      initialDefinition: props.initialDefinition
    });

    // 画布容器尺寸
    const canvasSize = ref({ width: 0, height: 0 });

    // 配置抽屉状态
    const showConfigDrawer = ref(false);
    const selectedNode = computed(() => {
      const selectedIds = canvas.selectedNodeIds.value;
      if (selectedIds.length === 1) {
        return canvas.getNode(selectedIds[0]);
      }
      return null;
    });

    // 优化：使用计算属性直接计算连接线位置，无需额外的刷新触发器
    // 这样可以自动响应 viewport 和节点位置的变化
    const connectionPositions = computed(() => {
      // 依赖 viewport 和节点位置
      const { x, y, zoom } = canvas.viewport.value;
      const nodes = canvas.nodes.value;

      // 创建位置缓存
      const positions = new Map<
        string,
        { source: { x: number; y: number } | null; target: { x: number; y: number } | null }
      >();

      // 批量计算所有连接线的位置
      canvas.connections.value.forEach(conn => {
        const sourcePos = getPortPosition(conn.source, conn.sourceHandle, 'output');
        const targetPos = getPortPosition(conn.target, conn.targetHandle, 'input');
        positions.set(conn.id, { source: sourcePos, target: targetPos });
      });

      return positions;
    });

    // 计算节点和端口位置
    const getNodePosition = (nodeId: string) => {
      const node = canvas.getNode(nodeId);
      if (!node) return null;
      return {
        x: node.position.x * canvas.viewport.value.zoom + canvas.viewport.value.x,
        y: node.position.y * canvas.viewport.value.zoom + canvas.viewport.value.y
      };
    };

    // 精确计算端口中心位置（纯计算方式，性能最优）
    const getPortPosition = (nodeId: string, portId: string, type: 'input' | 'output') => {
      const node = canvas.getNode(nodeId);
      if (!node) return null;

      // 节点尺寸常量（与 BaseNode 实际渲染保持一致）
      const NODE_CONTAINER_WIDTH = 220; // minWidth
      const NODE_ACTUAL_HEIGHT = 72; // 实测高度

      // 端口配置
      const PORT_TOTAL_SIZE = 20; // 14px + 6px border
      const PORT_RADIUS = PORT_TOTAL_SIZE / 2; // 10px
      const PORT_CONTAINER_OFFSET = 10; // 容器偏移
      const PORT_GAP = 10; // 端口之间的间距（与 BaseNode 中的 gap 一致）

      // 计算节点在视口中的位置（应用缩放和平移）
      const zoom = canvas.viewport.value.zoom;
      const nodeX = node.position.x * zoom + canvas.viewport.value.x;
      const nodeY = node.position.y * zoom + canvas.viewport.value.y;

      // 水平位置计算
      let portX: number;
      if (type === 'input') {
        portX = nodeX - PORT_CONTAINER_OFFSET * zoom + PORT_RADIUS * zoom;
      } else {
        portX = nodeX + NODE_CONTAINER_WIDTH * zoom + PORT_CONTAINER_OFFSET * zoom - PORT_RADIUS * zoom;
      }

      // 垂直位置计算 - 考虑多个端口的情况
      const ports = type === 'input' ? node.inputs : node.outputs;

      if (!ports || ports.length === 0) {
        // 如果没有端口，返回节点中心
        return { x: portX, y: nodeY + (NODE_ACTUAL_HEIGHT * zoom) / 2 };
      }

      const portIndex = ports.findIndex(p => p.id === portId);

      if (portIndex === -1) {
        // 如果找不到端口，返回节点中心
        return { x: portX, y: nodeY + (NODE_ACTUAL_HEIGHT * zoom) / 2 };
      }

      // 计算端口容器的总高度
      const portCount = ports.length;
      const totalPortsHeight = portCount * PORT_TOTAL_SIZE + (portCount - 1) * PORT_GAP;

      // 端口容器在节点垂直中心，使用 translateY(-50%)
      // 所以第一个端口的顶部位置是：nodeY + NODE_HEIGHT/2 - totalPortsHeight/2
      const firstPortTop = nodeY + (NODE_ACTUAL_HEIGHT * zoom) / 2 - (totalPortsHeight * zoom) / 2;

      // 当前端口的中心位置
      const portY = firstPortTop + (portIndex * (PORT_TOTAL_SIZE + PORT_GAP) + PORT_RADIUS) * zoom;

      return { x: portX, y: portY };
    };

    // 保存工作流
    const handleSave = () => {
      if (props.onSave) {
        const definition = canvas.getWorkflowDefinition();
        props.onSave(definition);
      }
    };

    // 清空画布
    const handleClear = () => {
      if (confirm('确定要清空画布吗？')) {
        canvas.clearCanvas();
      }
    };

    // 适应视图
    const handleFitView = () => {
      if (!canvas.canvasRef.value || canvas.nodes.value.length === 0) return;

      const rect = canvas.canvasRef.value.getBoundingClientRect();
      const nodes = canvas.nodes.value;

      // 计算所有节点的边界
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      nodes.forEach(node => {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + 200); // 节点宽度
        maxY = Math.max(maxY, node.position.y + 80); // 节点高度
      });

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      canvas.fitView(rect.width, rect.height, contentWidth, contentHeight);
    };

    // 节点选择变化
    const handleNodeSelect = (nodeId: string) => {
      canvas.selectNode(nodeId);
      props.onNodeSelect?.(nodeId);
    };

    // 监听选中节点变化，自动打开配置抽屉
    watch(selectedNode, (node) => {
      if (node) {
        showConfigDrawer.value = true;
      } else {
        showConfigDrawer.value = false;
      }
    });

    // 更新节点配置
    const handleUpdateNode = (nodeId: string, updates: Partial<Api.Workflow.WorkflowNode>) => {
      canvas.updateNode(nodeId, updates);
      canvas.saveHistory();
    };

    // 关闭配置抽屉
    const handleCloseDrawer = () => {
      showConfigDrawer.value = false;
      // 可选：关闭时取消选中
      // canvas.deselectAll();
    };

    // 监听画布尺寸变化
    const updateCanvasSize = () => {
      if (canvas.canvasRef.value) {
        const rect = canvas.canvasRef.value.getBoundingClientRect();
        canvasSize.value = {
          width: rect.width,
          height: rect.height
        };
      }
    };

    // 使用 ResizeObserver 监听尺寸变化
    let resizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      updateCanvasSize();

      if (canvas.canvasRef.value) {
        resizeObserver = new ResizeObserver(updateCanvasSize);
        resizeObserver.observe(canvas.canvasRef.value);
      }
    });

    onUnmounted(() => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    });

    return () => (
      <div class="workflow-canvas-container flex flex-col h-full w-full">
        {/* 工具栏 */}
        <CanvasToolbar
          zoom={canvas.viewport.value.zoom}
          canUndo={canvas.canUndo.value}
          canRedo={canvas.canRedo.value}
          selectedCount={canvas.selectedNodeIds.value.length}
          showGrid={canvas.showGrid.value}
          showMinimap={canvas.showMinimap.value}
          onZoomIn={canvas.zoomIn}
          onZoomOut={canvas.zoomOut}
          onResetZoom={canvas.resetZoom}
          onFitView={handleFitView}
          onUndo={canvas.undo}
          onRedo={canvas.redo}
          onAlignLeft={() => { canvas.alignLeft(); canvas.saveHistory(); }}
          onAlignRight={() => { canvas.alignRight(); canvas.saveHistory(); }}
          onAlignTop={() => { canvas.alignTop(); canvas.saveHistory(); }}
          onAlignBottom={() => { canvas.alignBottom(); canvas.saveHistory(); }}
          onDistributeHorizontal={() => { canvas.distributeHorizontal(); canvas.saveHistory(); }}
          onDistributeVertical={() => { canvas.distributeVertical(); canvas.saveHistory(); }}
          onToggleGrid={canvas.toggleGrid}
          onToggleMinimap={canvas.toggleMinimap}
          onLockSelected={canvas.lockSelectedNodes}
          onUnlockSelected={canvas.unlockSelectedNodes}
          onValidate={() => {
            const errors = canvas.validateWorkflow();
            if (errors.length === 0) {
              window.$message?.success('工作流验证通过！');
            } else {
              const errorMessages = errors.map(e => e.message).join('\n');
              window.$message?.error(`工作流验证失败:\n${errorMessages}`);
            }
          }}
          onSave={handleSave}
          onClear={handleClear}
        />

        {/* 画布区域 */}
        <div
          ref={canvas.canvasRef}
          class="flex-1 relative overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20"
          style={{ minHeight: 0 }}
          onMousedown={canvas.handleCanvasMouseDown}
          onMousemove={canvas.handleCanvasMouseMove}
          onMouseup={canvas.handleCanvasMouseUp}
          onWheel={canvas.handleCanvasWheel}
          onDrop={canvas.handleCanvasDrop}
          onDragover={canvas.handleCanvasDragOver}
          onContextmenu={(e: MouseEvent) => e.preventDefault()}
        >
          {/* 网格背景 - 可切换显示 */}
          {canvas.showGrid.value && (
            <CanvasGrid
              offsetX={canvas.viewport.value.x}
              offsetY={canvas.viewport.value.y}
              zoom={canvas.viewport.value.zoom}
            />
          )}

          {/* SVG 连接线层（独立于transform，使用屏幕坐标） */}
          <svg
            class="absolute top-0 left-0"
            style={{
              width: '100%',
              height: '100%',
              overflow: 'visible',
              zIndex: 1,
              pointerEvents: 'none'
            }}
          >
            {/* 已有的连接线 */}
            {canvas.connections.value.map(conn => {
              // 从计算属性中获取位置，自动响应变化
              const positions = connectionPositions.value.get(conn.id);
              if (!positions || !positions.source || !positions.target) return null;

              return (
                <ConnectionLine
                  key={conn.id}
                  connection={conn}
                  sourcePos={positions.source}
                  targetPos={positions.target}
                  animated={conn.animated}
                  onClick={(id: string) => canvas.removeConnection(id)}
                />
              );
            })}

            {/* 正在绘制的连接线 */}
            {canvas.connectionDraft.value && (
              <ConnectionLine draft={canvas.connectionDraft.value} />
            )}
          </svg>

          {/* 节点容器 */}
          <div style={canvas.transformStyle.value}>
            {/* 节点层 */}
            {canvas.nodes.value.map(node => {
              const NodeComponent = NODE_TYPES[node.type]?.component;
              if (!NodeComponent) return null;

              // 优化：预先计算节点是否被选中，避免在渲染函数中调用 includes
              const isSelected = canvas.selectedNodeIds.value.includes(node.id);

              return (
                <div
                  key={node.id}
                  class="absolute"
                  style={{
                    left: `${node.position.x}px`,
                    top: `${node.position.y}px`,
                    pointerEvents: 'auto',
                    cursor: 'move',
                    // 优化：使用 will-change 提示浏览器优化
                    willChange: 'transform'
                  }}
                  onMousedown={(e: MouseEvent) => {
                    if (e.button === 0) {
                      canvas.handleNodeMouseDown(node.id, e);
                    }
                  }}
                  onMouseup={(e: MouseEvent) => {
                    if (e.button === 0) {
                      canvas.handleNodeClick(node.id, e);
                    }
                  }}
                >
                  {h(NodeComponent, {
                    id: node.id,
                    type: node.type,
                    data: node.data,
                    config: node.config,
                    inputs: node.inputs,
                    outputs: node.outputs,
                    selected: isSelected,
                    locked: canvas.isNodeLocked(node.id),
                    onDelete: canvas.deleteNode,
                    onToggleLock: canvas.toggleNodeLock,
                    onPortMouseDown: canvas.handlePortMouseDown,
                    onPortMouseUp: canvas.handlePortMouseUp
                  })}
                </div>
              );
            })}
          </div>

          {/* 提示信息 */}
          {canvas.nodes.value.length === 0 && (
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="text-center">
                <div class="mb-6">
                  <NIcon size={80} color="#d1d5db" class="dark:opacity-50">
                    <Icon icon="mdi:robot-outline" />
                  </NIcon>
                </div>
                <div class="text-xl font-medium text-gray-600 dark:text-gray-400 mb-4">
                  从左侧拖拽节点到画布开始创建工作流
                </div>
                <div class="space-y-2 text-sm text-gray-500 dark:text-gray-500">
                  <div class="flex items-center justify-center gap-2">
                    <NIcon size={16}>
                      <Icon icon="mdi:mouse" />
                    </NIcon>
                    <span>鼠标滚轮缩放画布</span>
                  </div>
                  <div class="flex items-center justify-center gap-2">
                    <NIcon size={16}>
                      <Icon icon="mdi:cursor-move" />
                    </NIcon>
                    <span>左键或右键拖拽平移画布</span>
                  </div>
                  <div class="flex items-center justify-center gap-2">
                    <NIcon size={16}>
                      <Icon icon="mdi:drag" />
                    </NIcon>
                    <span>拖拽节点移动位置</span>
                  </div>
                  <div class="flex items-center justify-center gap-2">
                    <NIcon size={16}>
                      <Icon icon="mdi:connection" />
                    </NIcon>
                    <span>拖拽端口创建连接</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 框选矩形 */}
          {canvas.isSelecting.value && canvas.normalizedSelectionBox.value && (
            <div
              class="absolute pointer-events-none"
              style={{
                left: `${canvas.normalizedSelectionBox.value.left}px`,
                top: `${canvas.normalizedSelectionBox.value.top}px`,
                width: `${canvas.normalizedSelectionBox.value.width}px`,
                height: `${canvas.normalizedSelectionBox.value.height}px`,
                border: '2px dashed #3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '4px'
              }}
            />
          )}

          {/* 小地图 */}
          {/* 小地图 - 可切换显示 */}
          {canvas.showMinimap.value && canvas.nodes.value.length > 0 && canvasSize.value.width > 0 && (
            <Minimap
              nodes={canvas.nodes.value}
              viewport={canvas.viewport.value}
              canvasWidth={canvasSize.value.width}
              canvasHeight={canvasSize.value.height}
              width={200}
              height={150}
              onViewportChange={(x, y) => {
                canvas.viewport.value = {
                  ...canvas.viewport.value,
                  x,
                  y
                };
              }}
            />
          )}
        </div>

        {/* 节点配置抽屉 */}
        <NodeConfigDrawer
          show={showConfigDrawer.value}
          node={selectedNode.value}
          onUpdate={handleUpdateNode}
          onClose={handleCloseDrawer}
        />
      </div>
    );
  }
});

