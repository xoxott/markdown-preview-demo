import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useCanvasZoom } from './useCanvasZoom';
import { useNodeDragDrop } from './useNodeDragDrop';
import { useNodeConnection } from './useNodeConnection';
import { useSelectionBox } from './useSelectionBox';
import { useHistory } from './useHistory';
import { useNodeAlignment } from './useNodeAlignment';
import { useWorkflowValidation } from './useWorkflowValidation';

export interface UseWorkflowCanvasOptions {
  initialDefinition?: Api.Workflow.WorkflowDefinition;
}

export function useWorkflowCanvas(options: UseWorkflowCanvasOptions = {}) {
  const canvasRef = ref<HTMLElement | null>(null);
  const isPanning = ref(false);
  const panStart = ref({ x: 0, y: 0 });
  const isCanvasDragging = ref(false);
  const canvasDragStart = ref({ x: 0, y: 0 });

  // UI 配置状态
  const showGrid = ref(true); // 显示网格
  const showMinimap = ref(true); // 显示小地图
  const lockedNodeIds = ref<Set<string>>(new Set()); // 锁定的节点ID集合

  // 性能优化：使用 RAF 节流
  let rafId: number | null = null;
  let pendingMouseMove: MouseEvent | null = null;
  // 记录上一次处理的鼠标位置（用于计算增量）
  let lastProcessedMousePos: { x: number; y: number } | null = null;

  // 清理函数
  onUnmounted(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    pendingMouseMove = null;
    lastProcessedMousePos = null;
  });

  // 使用各个子hooks
  const zoom = useCanvasZoom({
    initialViewport: options.initialDefinition?.viewport
  });

  const nodeDragDrop = useNodeDragDrop();
  const connection = useNodeConnection();
  const selectionBox = useSelectionBox();
  const history = useHistory({ maxSize: 50 });
  const alignment = useNodeAlignment({
    nodes: nodeDragDrop.nodes,
    selectedNodeIds: nodeDragDrop.selectedNodeIds
  });
  const validation = useWorkflowValidation({
    nodes: nodeDragDrop.nodes,
    connections: connection.connections
  });

  // 初始化数据
  if (options.initialDefinition) {
    nodeDragDrop.setNodes(options.initialDefinition.nodes || []);
    connection.setConnections(options.initialDefinition.connections || []);
    // 保存初始状态到历史记录
    history.pushState({
      nodes: nodeDragDrop.nodes.value,
      connections: connection.connections.value
    });
    history.updateFlags();
  }

  /** 画布鼠标按下 */
  function handleCanvasMouseDown(e: MouseEvent) {
    // 右键或中键开始平移
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      isPanning.value = true;
      panStart.value = { x: e.clientX, y: e.clientY };
      return;
    }

    // 左键点击空白处
    if (e.button === 0 && e.target === canvasRef.value) {
      if (e.shiftKey && canvasRef.value) {
        // Shift + 左键：开始框选
        const rect = canvasRef.value.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        selectionBox.startSelection(x, y);
      } else {
        // 普通左键：准备拖拽画布
        isCanvasDragging.value = true;
        canvasDragStart.value = { x: e.clientX, y: e.clientY };
      }
    }
  }

  /** 画布鼠标移动（性能优化：使用 RAF 节流） */
  function handleCanvasMouseMove(e: MouseEvent) {
    // 保存最新的鼠标事件
    pendingMouseMove = e;

    // 如果已经有待处理的 RAF，直接返回
    if (rafId !== null) {
      return;
    }

    // 使用 requestAnimationFrame 节流
    rafId = requestAnimationFrame(() => {
      rafId = null;

      if (!pendingMouseMove) return;
      const event = pendingMouseMove;
      pendingMouseMove = null;

    // 更新框选区域
    if (selectionBox.isSelecting.value && canvasRef.value) {
      const rect = canvasRef.value.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
      selectionBox.updateSelection(x, y);

      // 实时更新选中的节点
      const NODE_WIDTH = 220;
      const NODE_HEIGHT = 72;
      const selectedIds: string[] = [];

      nodeDragDrop.nodes.value.forEach(node => {
        if (selectionBox.isNodeInSelection(
          node.position.x,
          node.position.y,
          NODE_WIDTH,
          NODE_HEIGHT,
          zoom.viewport.value.zoom,
          zoom.viewport.value.x,
          zoom.viewport.value.y
        )) {
          selectedIds.push(node.id);
        }
      });

      nodeDragDrop.selectedNodeIds.value = selectedIds;
      return;
    }

    // 更新连接线位置（如果正在连接）
    if (connection.isConnecting.value && canvasRef.value) {
      const canvasRect = canvasRef.value.getBoundingClientRect();
        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;
      connection.updateConnection(x, y);
    }

    // 平移画布（右键/中键）
    if (isPanning.value) {
        const deltaX = event.clientX - panStart.value.x;
        const deltaY = event.clientY - panStart.value.y;
      zoom.pan(deltaX, deltaY);
        panStart.value = { x: event.clientX, y: event.clientY };
      return;
    }

    // 拖拽画布（左键空白处）
    if (isCanvasDragging.value) {
        const deltaX = event.clientX - canvasDragStart.value.x;
        const deltaY = event.clientY - canvasDragStart.value.y;

      // 只有移动超过阈值才开始拖拽（避免误触）
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        zoom.pan(deltaX, deltaY);
          canvasDragStart.value = { x: event.clientX, y: event.clientY };
      }
      return;
    }

    // 拖拽节点
    if (nodeDragDrop.draggingNodeId.value && nodeDragState.value) {
      // 检查是否超过移动阈值
        const totalDeltaX = Math.abs(event.clientX - nodeDragState.value.startX);
        const totalDeltaY = Math.abs(event.clientY - nodeDragState.value.startY);

      if (totalDeltaX > 3 || totalDeltaY > 3) {
        nodeDragState.value.hasMoved = true;

          // 使用绝对位置计算增量，避免丢失中间帧
          if (lastProcessedMousePos) {
            const deltaX = (event.clientX - lastProcessedMousePos.x) / zoom.viewport.value.zoom;
            const deltaY = (event.clientY - lastProcessedMousePos.y) / zoom.viewport.value.zoom;

        if (nodeDragDrop.selectedNodeIds.value.length > 1) {
          // 移动所有选中的节点
          nodeDragDrop.moveNodes(nodeDragDrop.selectedNodeIds.value, deltaX, deltaY);
        } else {
          // 移动单个节点
          nodeDragDrop.moveNode(nodeDragDrop.draggingNodeId.value, deltaX, deltaY);
        }
          }

          // 更新上一次处理的位置
          lastProcessedMousePos = { x: event.clientX, y: event.clientY };
      }
      return;
    }

    // 更新连接线位置
    if (connection.isConnecting.value && canvasRef.value) {
      // 转换为相对于画布的坐标
      const canvasRect = canvasRef.value.getBoundingClientRect();
        const x = event.clientX - canvasRect.left;
        const y = event.clientY - canvasRect.top;
      connection.updateConnection(x, y);
    }
    });
  }

  /** 画布鼠标抬起 */
  function handleCanvasMouseUp(e: MouseEvent) {
    // 结束框选
    if (selectionBox.isSelecting.value) {
      selectionBox.endSelection();
      return;
    }

    if (isPanning.value) {
      isPanning.value = false;
      return;
    }

    // 结束画布拖拽
    if (isCanvasDragging.value) {
      const deltaX = Math.abs(e.clientX - canvasDragStart.value.x);
      const deltaY = Math.abs(e.clientY - canvasDragStart.value.y);

      // 如果移动距离很小，视为点击，取消选择
      if (deltaX < 3 && deltaY < 3) {
        nodeDragDrop.deselectAll();
      }

      isCanvasDragging.value = false;
      return;
    }

    // 结束节点拖拽
    if (nodeDragDrop.draggingNodeId.value) {
      nodeDragDrop.endDrag();
      lastProcessedMousePos = null; // 清理位置记录
      return;
    }

    // 处理连接完成
    if (connection.isConnecting.value) {
      // 检查鼠标位置是否在某个输入端口上
      const target = document.elementFromPoint(e.clientX, e.clientY);

      if (target) {
        // 查找最近的端口元素
        const portElement = target.closest('.node-port-input') as HTMLElement;

        if (portElement) {
          const nodeId = portElement.getAttribute('data-node-id');
          const portId = portElement.getAttribute('data-port-id');

          if (nodeId && portId) {
            // 完成连接
            connection.finishConnection(nodeId, portId);
            return;
          }
        }
      }

      // 如果没有找到输入端口，取消连接
      connection.cancelConnection();
    }
  }

  /** 画布滚轮缩放 */
  function handleCanvasWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoom.zoom(delta, e.clientX, e.clientY);
  }

  /** 画布拖放 */
  function handleCanvasDrop(e: DragEvent) {
    e.preventDefault();
    if (!canvasRef.value || !e.dataTransfer) return;

    // 获取拖拽的节点类型
    const nodeType = e.dataTransfer.getData('application/workflow-node') as Api.Workflow.NodeType;
    if (!nodeType) return;

    // 节点尺寸（用于居中放置）
    const NODE_WIDTH = 220;
    const NODE_HEIGHT = 72;

    // 设置拖拽节点信息，偏移量为节点尺寸的一半，使节点中心对齐鼠标
    nodeDragDrop.startDragNewNode(nodeType, NODE_WIDTH / 2, NODE_HEIGHT / 2);

    const rect = canvasRef.value.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 放置节点
    const newNode = nodeDragDrop.dropNewNode(
      x,
      y,
      zoom.viewport.value.zoom,
      zoom.viewport.value.x,
      zoom.viewport.value.y
    );

    // 自动选中新添加的节点
    if (newNode) {
      nodeDragDrop.selectNode(newNode.id, false);
    }
  }

  /** 画布拖放悬停 */
  function handleCanvasDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  // 节点拖拽状态
  const nodeDragState = ref<{
    nodeId: string;
    startX: number;
    startY: number;
    hasMoved: boolean;
  } | null>(null);

  /** 节点鼠标按下 */
  function handleNodeMouseDown(nodeId: string, e: MouseEvent) {
    e.stopPropagation();

    // 如果节点被锁定，不允许拖拽
    if (lockedNodeIds.value.has(nodeId)) {
      return;
    }

    // 记录拖拽起始位置
    nodeDragState.value = {
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false
    };

    // 初始化上一次处理的鼠标位置
    lastProcessedMousePos = { x: e.clientX, y: e.clientY };

    // 开始拖拽节点
    const node = nodeDragDrop.getNode(nodeId);
    if (node) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      nodeDragDrop.startDragExistingNode(
        nodeId,
        e.clientX - rect.left,
        e.clientY - rect.top
      );
    }
  }

  /** 节点点击（在鼠标抬起时判断） */
  function handleNodeClick(nodeId: string, e: MouseEvent) {
    // 只有在没有移动的情况下才触发点击
    if (!nodeDragState.value?.hasMoved) {
      // 多选
      if (e.ctrlKey || e.metaKey) {
        nodeDragDrop.selectNode(nodeId, true);
      } else {
        if (!nodeDragDrop.selectedNodeIds.value.includes(nodeId)) {
          nodeDragDrop.selectNode(nodeId, false);
        }
      }
    }
    nodeDragState.value = null;
  }

  /** 端口鼠标按下（开始连接） */
  function handlePortMouseDown(nodeId: string, portId: string, type: 'input' | 'output', e: MouseEvent) {
    e.stopPropagation();

    if (type === 'output') {
      // 获取端口的屏幕位置
      const target = e.target as HTMLElement;
      const rect = target.getBoundingClientRect();

      // 获取画布的屏幕位置
      if (canvasRef.value) {
        const canvasRect = canvasRef.value.getBoundingClientRect();

        // 转换为相对于画布的坐标
        const centerX = rect.left + rect.width / 2 - canvasRect.left;
        const centerY = rect.top + rect.height / 2 - canvasRect.top;

        // 从输出端口中心开始连接
        connection.startConnection(nodeId, portId, centerX, centerY);
      }
    }
  }

  /** 端口鼠标抬起（完成连接） */
  function handlePortMouseUp(nodeId: string, portId: string, type: 'input' | 'output', e: MouseEvent) {
    e.stopPropagation();

    if (connection.isConnecting.value) {
      // 只允许从输出端口连接到输入端口
      if (type === 'input') {
        // 连接到输入端口
        connection.finishConnection(nodeId, portId);
      } else {
        // 尝试连接到输出端口，取消连接
        connection.cancelConnection();
      }
    }
  }

  /** 删除单个节点 */
  function deleteNode(nodeId: string) {
    connection.removeNodeConnections(nodeId);
    nodeDragDrop.removeNode(nodeId);
  }

  /** 删除选中的节点 */
  function deleteSelectedNodes() {
    const nodeIds = [...nodeDragDrop.selectedNodeIds.value];
    nodeIds.forEach(id => {
      connection.removeNodeConnections(id);
      nodeDragDrop.removeNode(id);
    });
  }

  /** 键盘事件 */
  // 复制的节点缓存
  const clipboard = ref<{
    nodes: Api.Workflow.WorkflowNode[];
    connections: Api.Workflow.Connection[];
  } | null>(null);

  /** 复制选中的节点 */
  function copySelectedNodes() {
    if (nodeDragDrop.selectedNodeIds.value.length === 0) return;

    const selectedNodes = nodeDragDrop.selectedNodes.value;
    const selectedNodeIds = new Set(nodeDragDrop.selectedNodeIds.value);

    // 复制节点
    const copiedNodes = JSON.parse(JSON.stringify(selectedNodes));

    // 复制相关的连接（只复制选中节点之间的连接）
    const copiedConnections = connection.connections.value
      .filter(conn => selectedNodeIds.has(conn.sourceNodeId) && selectedNodeIds.has(conn.targetNodeId))
      .map(conn => JSON.parse(JSON.stringify(conn)));

    clipboard.value = {
      nodes: copiedNodes,
      connections: copiedConnections
    };
  }

  /** 粘贴节点 */
  function pasteNodes() {
    if (!clipboard.value) return;

    // 生成新的 ID 映射
    const idMap = new Map<string, string>();
    const newNodes: Api.Workflow.WorkflowNode[] = [];

    // 创建新节点（偏移位置避免重叠）
    clipboard.value.nodes.forEach(node => {
      const newId = `${node.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      idMap.set(node.id, newId);

      const newNode = {
        ...JSON.parse(JSON.stringify(node)),
        id: newId,
        position: {
          x: node.position.x + 50, // 偏移 50px
          y: node.position.y + 50
        }
      };
      newNodes.push(newNode);
      nodeDragDrop.nodes.value.push(newNode);
    });

    // 创建新连接
    clipboard.value.connections.forEach(conn => {
      const newSourceId = idMap.get(conn.sourceNodeId);
      const newTargetId = idMap.get(conn.targetNodeId);

      if (newSourceId && newTargetId) {
        const newConnection = {
          ...JSON.parse(JSON.stringify(conn)),
          id: `c-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sourceNodeId: newSourceId,
          targetNodeId: newTargetId
        };
        connection.connections.value.push(newConnection);
      }
    });

    // 选中新粘贴的节点
    nodeDragDrop.selectedNodeIds.value = newNodes.map(n => n.id);

    // 保存历史记录
    saveHistory();
  }

  /** 锁定节点 */
  function lockNode(nodeId: string) {
    lockedNodeIds.value.add(nodeId);
  }

  /** 解锁节点 */
  function unlockNode(nodeId: string) {
    lockedNodeIds.value.delete(nodeId);
  }

  /** 切换节点锁定状态 */
  function toggleNodeLock(nodeId: string) {
    if (lockedNodeIds.value.has(nodeId)) {
      unlockNode(nodeId);
    } else {
      lockNode(nodeId);
    }
  }

  /** 锁定选中的节点 */
  function lockSelectedNodes() {
    nodeDragDrop.selectedNodeIds.value.forEach(id => lockNode(id));
  }

  /** 解锁选中的节点 */
  function unlockSelectedNodes() {
    nodeDragDrop.selectedNodeIds.value.forEach(id => unlockNode(id));
  }

  /** 检查节点是否被锁定 */
  function isNodeLocked(nodeId: string): boolean {
    return lockedNodeIds.value.has(nodeId);
  }

  /** 保存历史记录 */
  function saveHistory() {
    history.pushState({
      nodes: nodeDragDrop.nodes.value,
      connections: connection.connections.value
    });
    history.updateFlags();
  }

  /** 撤销 */
  function undo() {
    const state = history.undo();
    if (state) {
      nodeDragDrop.setNodes(state.nodes);
      connection.setConnections(state.connections);
      history.updateFlags();
    }
  }

  /** 重做 */
  function redo() {
    const state = history.redo();
    if (state) {
      nodeDragDrop.setNodes(state.nodes);
      connection.setConnections(state.connections);
      history.updateFlags();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Ctrl/Cmd + Z 撤销
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    // Ctrl/Cmd + Shift + Z 或 Ctrl/Cmd + Y 重做
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    // Ctrl/Cmd + C 复制
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      e.preventDefault();
      copySelectedNodes();
      return;
    }

    // Ctrl/Cmd + V 粘贴
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      pasteNodes();
      return;
    }

    // Delete 或 Backspace 删除选中节点
    if ((e.key === 'Delete' || e.key === 'Backspace') && nodeDragDrop.selectedNodeIds.value.length > 0) {
      e.preventDefault();
      deleteSelectedNodes();
      saveHistory();
    }

    // Ctrl/Cmd + A 全选
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      nodeDragDrop.selectedNodeIds.value = nodeDragDrop.nodes.value.map(n => n.id);
    }

    // Escape 取消选择
    if (e.key === 'Escape') {
      nodeDragDrop.deselectAll();
      connection.cancelConnection();
      selectionBox.endSelection();
    }
  }

  /** 获取工作流定义 */
  function getWorkflowDefinition(): Api.Workflow.WorkflowDefinition {
    return {
      nodes: nodeDragDrop.nodes.value,
      connections: connection.connections.value,
      viewport: {
        x: zoom.viewport.value.x,
        y: zoom.viewport.value.y,
        zoom: zoom.viewport.value.zoom
      }
    };
  }

  /** 加载工作流定义 */
  function loadWorkflowDefinition(definition: Api.Workflow.WorkflowDefinition) {
    nodeDragDrop.setNodes(definition.nodes || []);
    connection.setConnections(definition.connections || []);
    if (definition.viewport) {
      zoom.setViewport(definition.viewport);
    }
  }

  /** 清空画布 */
  function clearCanvas() {
    nodeDragDrop.clearNodes();
    connection.clearConnections();
    zoom.resetViewport();
  }

  // 挂载时添加键盘监听
  onMounted(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  // 卸载时移除监听
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  return {
    // Refs
    canvasRef,

    // State
    nodes: nodeDragDrop.nodes,
    connections: connection.connections,
    selectedNodeIds: nodeDragDrop.selectedNodeIds,
    selectedNodes: nodeDragDrop.selectedNodes,
    viewport: zoom.viewport,
    transformStyle: zoom.transformStyle,
    isConnecting: connection.isConnecting,
    connectionDraft: connection.connectionDraft,
    selectionBox: selectionBox.selectionBox,
    normalizedSelectionBox: selectionBox.normalizedBox,
    isSelecting: selectionBox.isSelecting,

    // History
    canUndo: history.canUndo,
    canRedo: history.canRedo,

    // Canvas handlers
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasWheel,
    handleCanvasDrop,
    handleCanvasDragOver,

    // Node handlers
    handleNodeMouseDown,
    handleNodeClick,
    handlePortMouseDown,
    handlePortMouseUp,
    deleteNode,
    deleteSelectedNodes,

    // Zoom
    zoomIn: zoom.zoomIn,
    zoomOut: zoom.zoomOut,
    resetZoom: zoom.resetZoom,
    fitView: zoom.fitView,

    // Node operations
    selectNode: nodeDragDrop.selectNode,
    deselectAll: nodeDragDrop.deselectAll,
    updateNode: nodeDragDrop.updateNode,
    removeNode: nodeDragDrop.removeNode,
    getNode: nodeDragDrop.getNode,

    // Connection operations
    removeConnection: connection.removeConnection,

    // History operations
    undo,
    redo,
    saveHistory,

    // Clipboard operations
    copySelectedNodes,
    pasteNodes,

    // Alignment operations
    alignLeft: alignment.alignLeft,
    alignRight: alignment.alignRight,
    alignCenterHorizontal: alignment.alignCenterHorizontal,
    alignTop: alignment.alignTop,
    alignBottom: alignment.alignBottom,
    alignCenterVertical: alignment.alignCenterVertical,
    distributeHorizontal: alignment.distributeHorizontal,
    distributeVertical: alignment.distributeVertical,

    // Validation
    validateWorkflow: validation.validate,
    detectCycles: validation.detectCycles,
    isNodeReachable: validation.isNodeReachable,
    getNodeDependencies: validation.getNodeDependencies,
    getDownstreamNodes: validation.getDownstreamNodes,

    // UI Configuration
    showGrid,
    showMinimap,
    toggleGrid: () => { showGrid.value = !showGrid.value; },
    toggleMinimap: () => { showMinimap.value = !showMinimap.value; },

    // Node Lock
    lockedNodeIds,
    lockNode,
    unlockNode,
    toggleNodeLock,
    lockSelectedNodes,
    unlockSelectedNodes,
    isNodeLocked,

    // Workflow
    getWorkflowDefinition,
    loadWorkflowDefinition,
    clearCanvas
  };
}

