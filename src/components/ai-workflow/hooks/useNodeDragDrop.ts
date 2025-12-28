import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { createDefaultNodeData } from '../nodes/NodeRegistry';

export interface DraggedNode {
  type: Api.Workflow.NodeType;
  offsetX: number;
  offsetY: number;
}

export function useNodeDragDrop() {
  const nodes = ref<Api.Workflow.WorkflowNode[]>([]);
  const selectedNodeIds = ref<string[]>([]);
  const draggedNode = ref<DraggedNode | null>(null);
  const draggingNodeId = ref<string | null>(null);
  const dragOffset = ref({ x: 0, y: 0 });

  const selectedNodes = computed(() => {
    return nodes.value.filter(node => selectedNodeIds.value.includes(node.id));
  });

  /** 开始从节点库拖拽新节点 */
  function startDragNewNode(type: Api.Workflow.NodeType, offsetX: number, offsetY: number) {
    draggedNode.value = { type, offsetX, offsetY };
  }

  /** 开始拖拽已有节点 */
  function startDragExistingNode(nodeId: string, offsetX: number, offsetY: number) {
    draggingNodeId.value = nodeId;
    dragOffset.value = { x: offsetX, y: offsetY };
  }

  /** 放置新节点到画布 */
  function dropNewNode(x: number, y: number, zoom: number, viewportX: number, viewportY: number): Api.Workflow.WorkflowNode | null {
    if (!draggedNode.value) return null;

    // 转换屏幕坐标到画布坐标
    const canvasX = (x - viewportX) / zoom - draggedNode.value.offsetX;
    const canvasY = (y - viewportY) / zoom - draggedNode.value.offsetY;

    const defaultData = createDefaultNodeData(draggedNode.value.type);
    const newNode: Api.Workflow.WorkflowNode = {
      id: uuidv4(),
      ...defaultData,
      position: { x: canvasX, y: canvasY }
    } as Api.Workflow.WorkflowNode;

    nodes.value.push(newNode);
    draggedNode.value = null;

    return newNode;
  }

  /** 移动已有节点（性能优化版本） */
  function moveNode(nodeId: string, deltaX: number, deltaY: number) {
    const nodeIndex = nodes.value.findIndex(n => n.id === nodeId);
    if (nodeIndex !== -1) {
      const node = nodes.value[nodeIndex];
      // 直接修改位置，Vue 3 的响应式系统会自动追踪
      node.position.x += deltaX;
      node.position.y += deltaY;
    }
  }

  /** 移动多个节点（性能优化：批量更新） */
  function moveNodes(nodeIds: string[], deltaX: number, deltaY: number) {
    // 优化：创建 Set 以加快查找速度
    const nodeIdSet = new Set(nodeIds);

    // 批量更新所有选中的节点
    // 使用 for 循环代替 forEach，性能更好
    const nodesArray = nodes.value;
    for (let i = 0; i < nodesArray.length; i++) {
      const node = nodesArray[i];
      if (nodeIdSet.has(node.id)) {
        node.position.x += deltaX;
        node.position.y += deltaY;
      }
    }
  }

  /** 结束拖拽 */
  function endDrag() {
    draggedNode.value = null;
    draggingNodeId.value = null;
    dragOffset.value = { x: 0, y: 0 };
  }

  /** 选择节点 */
  function selectNode(nodeId: string, multi = false) {
    if (multi) {
      const index = selectedNodeIds.value.indexOf(nodeId);
      if (index === -1) {
        selectedNodeIds.value.push(nodeId);
      } else {
        selectedNodeIds.value.splice(index, 1);
      }
    } else {
      selectedNodeIds.value = [nodeId];
    }
  }

  /** 取消选择 */
  function deselectAll() {
    selectedNodeIds.value = [];
  }

  /** 删除节点 */
  function removeNode(nodeId: string) {
    const index = nodes.value.findIndex(n => n.id === nodeId);
    if (index !== -1) {
      nodes.value.splice(index, 1);
    }
    // 同时从选中列表中移除
    const selectedIndex = selectedNodeIds.value.indexOf(nodeId);
    if (selectedIndex !== -1) {
      selectedNodeIds.value.splice(selectedIndex, 1);
    }
  }

  /** 删除多个节点 */
  function removeNodes(nodeIds: string[]) {
    nodeIds.forEach(id => removeNode(id));
  }

  /** 更新节点数据 */
  function updateNode(nodeId: string, updates: Partial<Api.Workflow.WorkflowNode>) {
    const node = nodes.value.find(n => n.id === nodeId);
    if (node) {
      Object.assign(node, updates);
    }
  }

  /** 设置节点列表 */
  function setNodes(newNodes: Api.Workflow.WorkflowNode[]) {
    nodes.value = newNodes;
  }

  /** 清空所有节点 */
  function clearNodes() {
    nodes.value = [];
    selectedNodeIds.value = [];
  }

  /** 获取节点 */
  function getNode(nodeId: string) {
    return nodes.value.find(n => n.id === nodeId);
  }

  return {
    nodes,
    selectedNodeIds,
    selectedNodes,
    draggedNode,
    draggingNodeId,
    dragOffset,
    startDragNewNode,
    startDragExistingNode,
    dropNewNode,
    moveNode,
    moveNodes,
    endDrag,
    selectNode,
    deselectAll,
    removeNode,
    removeNodes,
    updateNode,
    setNodes,
    clearNodes,
    getNode
  };
}

