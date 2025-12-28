import { defineComponent, computed, ref, watch, onMounted, onUnmounted, type PropType } from 'vue';
import { useWorkflowCanvas } from '../hooks/useWorkflowCanvas';
import { useConnectionPositions } from '../hooks/useConnectionPositions';
import { NODE_DIMENSIONS } from '../constants/node-dimensions';
import CanvasGrid from './CanvasGrid';
import CanvasToolbar from './CanvasToolbar';
import CanvasConnections from './CanvasConnections';
import CanvasNodes from './CanvasNodes';
import CanvasEmptyState from './CanvasEmptyState';
import CanvasSelectionBox from './CanvasSelectionBox';
import Minimap from './Minimap';
import NodeConfigDrawer from '../panels/NodeConfigDrawer';

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

    // 使用连接线位置计算 Hook
    const { connectionPositions } = useConnectionPositions({
      nodes: canvas.nodes,
      connections: canvas.connections,
      viewport: canvas.viewport
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

    /**
     * 适应视图 - 自动缩放和平移画布以显示所有节点
     */
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
        maxX = Math.max(maxX, node.position.x + NODE_DIMENSIONS.WIDTH);
        maxY = Math.max(maxY, node.position.y + NODE_DIMENSIONS.HEIGHT);
      });

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;

      canvas.fitView(rect.width, rect.height, contentWidth, contentHeight);
    };

    /**
     * 监听选中节点变化，自动打开配置抽屉
     */
    watch(selectedNode, (node) => {
      showConfigDrawer.value = !!node;
    });

    /**
     * 更新节点配置
     */
    const handleUpdateNode = (nodeId: string, updates: Partial<Api.Workflow.WorkflowNode>) => {
      canvas.updateNode(nodeId, updates);
      canvas.saveHistory();
    };

    /**
     * 关闭配置抽屉
     */
    const handleCloseDrawer = () => {
      showConfigDrawer.value = false;
    };

    /**
     * 更新画布尺寸
     */
    const updateCanvasSize = () => {
      if (canvas.canvasRef.value) {
        const rect = canvas.canvasRef.value.getBoundingClientRect();
        canvasSize.value = {
          width: rect.width,
          height: rect.height
        };
      }
    };

    /**
     * 使用 ResizeObserver 监听画布尺寸变化
     */
    let resizeObserver: ResizeObserver | null = null;

    onMounted(() => {
      updateCanvasSize();

      if (canvas.canvasRef.value) {
        resizeObserver = new ResizeObserver(updateCanvasSize);
        resizeObserver.observe(canvas.canvasRef.value);
      }
    });

    onUnmounted(() => {
      resizeObserver?.disconnect();
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
              color='#f00'
            />
          )}

          {/* SVG 连接线层（独立于transform，使用屏幕坐标） */}
          <CanvasConnections
            connections={canvas.connections.value}
            connectionPositions={connectionPositions.value}
            connectionDraft={canvas.connectionDraft.value}
            onConnectionClick={canvas.removeConnection}
          />

          {/* 节点容器 */}
          <div style={canvas.transformStyle.value}>
            <CanvasNodes
              nodes={canvas.nodes.value}
              selectedNodeIds={canvas.selectedNodeIds.value}
              lockedNodeIds={Array.from(canvas.lockedNodeIds.value)}
              onNodeMouseDown={canvas.handleNodeMouseDown}
              onNodeClick={canvas.handleNodeClick}
              onNodeDelete={canvas.deleteNode}
              onNodeToggleLock={canvas.toggleNodeLock}
              onPortMouseDown={canvas.handlePortMouseDown}
              onPortMouseUp={canvas.handlePortMouseUp}
            />
          </div>

          {/* 空状态提示 */}
          {canvas.nodes.value.length === 0 && <CanvasEmptyState />}

          {/* 框选矩形 */}
          {canvas.isSelecting.value && (
            <CanvasSelectionBox selectionBox={canvas.normalizedSelectionBox.value} />
          )}

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

