import { computed, defineComponent, onMounted, onUnmounted, ref, type PropType } from 'vue';
import { NODE_DIMENSIONS } from '../constants/node-dimensions';
import BackgroundSettingsDialog from '../dialogs/BackgroundSettingsDialog';
import ConnectionLineSettingsDialog from '../dialogs/ConnectionLineSettingsDialog';
import { useCanvasSettings } from '../hooks/useCanvasSettings';
import { useConnectionPositions } from '../hooks/useConnectionPositions';
import { useWorkflowCanvas } from '../hooks/useWorkflowCanvas';
import NodeConfigDrawer from '../panels/NodeConfigDrawer';
import CanvasConnections from './CanvasConnections';
import CanvasEmptyState from './CanvasEmptyState';
import CanvasGrid from './CanvasGrid';
import CanvasNodes from './CanvasNodes';
import CanvasSelectionBox from './CanvasSelectionBox';
import CanvasToolbar from './CanvasToolbar';
import Minimap from './Minimap';

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

    // 使用画布设置 Hook
    const {
      connectionLineStyle,
      backgroundSettings,
      updateConnectionLineStyle,
      updateBackgroundSettings
    } = useCanvasSettings();

    // 画布容器尺寸
    const canvasSize = ref({ width: 0, height: 0 });

    // 配置抽屉状态
    const showConfigDrawer = ref(false);

    // 设置对话框状态
    const showConnectionLineDialog = ref(false);
    const showBackgroundDialog = ref(false);
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
     * 处理节点点击 - 只在点击时打开配置抽屉
     */
    const handleNodeClickWithConfig = (nodeId: string, e: MouseEvent) => {
      canvas.handleNodeClick(nodeId, e);

      // 只有在单击选中单个节点时才打开配置抽屉
      // 圈选或多选时不打开
      if (!e.ctrlKey && !e.metaKey) {
        // 延迟一帧，确保 selectedNodeIds 已更新
        requestAnimationFrame(() => {
          if (canvas.selectedNodeIds.value.length === 1 && canvas.selectedNodeIds.value[0] === nodeId) {
            showConfigDrawer.value = true;
          }
        });
      }
    };

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
          onConnectionLineSettings={() => showConnectionLineDialog.value = true}
          onBackgroundSettings={() => showBackgroundDialog.value = true}
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
          {backgroundSettings.value.showGrid && (
            <CanvasGrid
              offsetX={canvas.viewport.value.x}
              offsetY={canvas.viewport.value.y}
              zoom={canvas.viewport.value.zoom}
              size={backgroundSettings.value.gridSize}
              color={backgroundSettings.value.gridColor}
              gridType={backgroundSettings.value.gridType}
              backgroundColor={backgroundSettings.value.backgroundColor}
            />
          )}

          {/* SVG 连接线层（独立于transform，使用屏幕坐标） */}
          <CanvasConnections
            connections={canvas.connections.value}
            connectionPositions={connectionPositions.value}
            connectionDraft={canvas.connectionDraft.value}
            connectionLineStyle={connectionLineStyle.value}
            onConnectionClick={canvas.removeConnection}
          />

          {/* 节点容器 */}
          <div style={canvas.transformStyle.value}>
            <CanvasNodes
              nodes={canvas.nodes.value}
              selectedNodeIds={canvas.selectedNodeIds.value}
              lockedNodeIds={Array.from(canvas.lockedNodeIds.value)}
              onNodeMouseDown={canvas.handleNodeMouseDown}
              onNodeClick={handleNodeClickWithConfig}
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

        {/* 连接线设置对话框 */}
        <ConnectionLineSettingsDialog
          show={showConnectionLineDialog.value}
          settings={connectionLineStyle.value}
          onUpdate={updateConnectionLineStyle}
          onClose={() => showConnectionLineDialog.value = false}
        />

        {/* 背景设置对话框 */}
        <BackgroundSettingsDialog
          show={showBackgroundDialog.value}
          settings={backgroundSettings.value}
          onUpdate={updateBackgroundSettings}
          onClose={() => showBackgroundDialog.value = false}
        />
      </div>
    );
  }
});

