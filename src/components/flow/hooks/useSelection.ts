/**
 * 选择管理 Hook
 *
 * 处理节点和连接线的选择功能，基于 FlowSelectionHandler 核心逻辑
 * 提供 Vue 响应式封装
 */

import { ref, watch, onUnmounted, type Ref } from 'vue';
import { FlowSelectionHandler } from '../core/interaction/FlowSelectionHandler';
import type { FlowNode, FlowEdge, FlowViewport } from '../types';
import type { SelectionOptions, SelectionBox } from '../core/interaction/FlowSelectionHandler';

export interface UseSelectionOptions {
  /** 初始选中的节点 ID 列表 */
  initialSelectedNodeIds?: string[];
  /** 初始选中的连接线 ID 列表 */
  initialSelectedEdgeIds?: string[];
  /** 选择选项 */
  selectionOptions?: Partial<SelectionOptions>;
  /** 节点列表（用于框选） */
  nodes?: Ref<FlowNode[]>;
  /** 视口状态（用于框选坐标转换） */
  viewport?: Ref<FlowViewport>;
  /** 选择变化回调 */
  onSelectionChange?: (selectedNodeIds: string[], selectedEdgeIds: string[]) => void;
}

export interface UseSelectionReturn {
  /** 选中的节点 ID 列表（响应式） */
  selectedNodeIds: Ref<string[]>;
  /** 选中的连接线 ID 列表（响应式） */
  selectedEdgeIds: Ref<string[]>;
  /** 选择框状态（响应式） */
  selectionBox: Ref<SelectionBox>;
  /** 选择节点 */
  selectNode: (nodeId: string, addToSelection?: boolean) => void;
  /** 选择多个节点 */
  selectNodes: (nodeIds: string[]) => void;
  /** 选择连接线 */
  selectEdge: (edgeId: string, addToSelection?: boolean) => void;
  /** 取消选择节点 */
  deselectNode: (nodeId: string) => void;
  /** 取消选择连接线 */
  deselectEdge: (edgeId: string) => void;
  /** 取消所有选择 */
  deselectAll: () => void;
  /** 切换节点选择状态 */
  toggleNodeSelection: (nodeId: string) => void;
  /** 检查节点是否被选中 */
  isNodeSelected: (nodeId: string) => boolean;
  /** 检查连接线是否被选中 */
  isEdgeSelected: (edgeId: string) => boolean;
  /** 获取选中的节点 */
  getSelectedNodes: (nodes: FlowNode[]) => FlowNode[];
  /** 获取选中的连接线 */
  getSelectedEdges: (edges: FlowEdge[]) => FlowEdge[];
  /** 开始框选 */
  startBoxSelection: (startX: number, startY: number) => void;
  /** 更新框选 */
  updateBoxSelection: (currentX: number, currentY: number) => void;
  /** 完成框选 */
  finishBoxSelection: () => string[];
  /** 取消框选 */
  cancelBoxSelection: () => void;
  /** 检查是否正在框选 */
  isBoxSelecting: () => boolean;
  /** 检查是否应该启用多选（根据按键） */
  shouldMultiSelect: (event: MouseEvent | KeyboardEvent) => boolean;
  /** 检查是否应该启用框选（根据按键） */
  shouldBoxSelect: (event: MouseEvent | KeyboardEvent) => boolean;
}

/**
 * 选择管理 Hook
 */
export function useSelection(options: UseSelectionOptions = {}): UseSelectionReturn {
  const {
    initialSelectedNodeIds = [],
    initialSelectedEdgeIds = [],
    selectionOptions,
    nodes,
    viewport,
    onSelectionChange
  } = options;

  /** 创建选择处理器实例 */
  const selectionHandler = new FlowSelectionHandler();

  /** 配置选择选项 */
  if (selectionOptions) {
    selectionHandler.setOptions(selectionOptions);
  }

  /** 初始化选择状态 */
  if (initialSelectedNodeIds.length > 0) {
    selectionHandler.selectNodes(initialSelectedNodeIds);
  }
  initialSelectedEdgeIds.forEach(id => {
    selectionHandler.selectEdge(id, true);
  });

  /** 选中的节点 ID 列表（响应式） */
  const selectedNodeIds = ref<string[]>(selectionHandler.getSelectedNodeIds());

  /** 选中的连接线 ID 列表（响应式） */
  const selectedEdgeIds = ref<string[]>(selectionHandler.getSelectedEdgeIds());

  /** 选择框状态（响应式） */
  const selectionBox = ref<SelectionBox>(selectionHandler.getSelectionBox());

  /** 同步处理器状态到响应式 ref */
  const syncState = () => {
    selectedNodeIds.value = selectionHandler.getSelectedNodeIds();
    selectedEdgeIds.value = selectionHandler.getSelectedEdgeIds();
    selectionBox.value = selectionHandler.getSelectionBox();
  };

  /** 选择节点 */
  const selectNode = (nodeId: string, addToSelection: boolean = false) => {
    selectionHandler.selectNode(nodeId, addToSelection);
    syncState();
    if (onSelectionChange) {
      onSelectionChange(selectedNodeIds.value, selectedEdgeIds.value);
    }
  };

  /** 选择多个节点 */
  const selectNodes = (nodeIds: string[]) => {
    selectionHandler.selectNodes(nodeIds);
    syncState();
    if (onSelectionChange) {
      onSelectionChange(selectedNodeIds.value, selectedEdgeIds.value);
    }
  };

  /** 选择连接线 */
  const selectEdge = (edgeId: string, addToSelection: boolean = false) => {
    selectionHandler.selectEdge(edgeId, addToSelection);
    syncState();
    if (onSelectionChange) {
      onSelectionChange(selectedNodeIds.value, selectedEdgeIds.value);
    }
  };

  /** 取消选择节点 */
  const deselectNode = (nodeId: string) => {
    selectionHandler.deselectNode(nodeId);
    syncState();
    if (onSelectionChange) {
      onSelectionChange(selectedNodeIds.value, selectedEdgeIds.value);
    }
  };

  /** 取消选择连接线 */
  const deselectEdge = (edgeId: string) => {
    selectionHandler.deselectEdge(edgeId);
    syncState();
    if (onSelectionChange) {
      onSelectionChange(selectedNodeIds.value, selectedEdgeIds.value);
    }
  };

  /** 取消所有选择 */
  const deselectAll = () => {
    selectionHandler.deselectAll();
    syncState();
    if (onSelectionChange) {
      onSelectionChange(selectedNodeIds.value, selectedEdgeIds.value);
    }
  };

  /** 切换节点选择状态 */
  const toggleNodeSelection = (nodeId: string) => {
    selectionHandler.toggleNodeSelection(nodeId);
    syncState();
    if (onSelectionChange) {
      onSelectionChange(selectedNodeIds.value, selectedEdgeIds.value);
    }
  };

  /** 检查节点是否被选中 */
  const isNodeSelected = (nodeId: string): boolean => {
    return selectionHandler.isNodeSelected(nodeId);
  };

  /** 检查连接线是否被选中 */
  const isEdgeSelected = (edgeId: string): boolean => {
    return selectionHandler.isEdgeSelected(edgeId);
  };

  /** 获取选中的节点 */
  const getSelectedNodes = (nodes: FlowNode[]): FlowNode[] => {
    return selectionHandler.getSelectedNodes(nodes);
  };

  /** 获取选中的连接线 */
  const getSelectedEdges = (edges: FlowEdge[]): FlowEdge[] => {
    return selectionHandler.getSelectedEdges(edges);
  };

  /** 开始框选 */
  const startBoxSelection = (startX: number, startY: number) => {
    selectionHandler.startBoxSelection(startX, startY);
    syncState();
  };

  /** 更新框选 */
  const updateBoxSelection = (currentX: number, currentY: number) => {
    selectionHandler.updateBoxSelection(currentX, currentY);
    syncState();
  };

  /** 完成框选 */
  const finishBoxSelection = (): string[] => {
    if (!nodes?.value || !viewport?.value) {
      return [];
    }
    const selectedIds = selectionHandler.finishBoxSelection(nodes.value, viewport.value);
    syncState();
    if (selectedIds.length > 0) {
      selectionHandler.selectNodes(selectedIds);
      syncState();
      if (onSelectionChange) {
        onSelectionChange(selectedNodeIds.value, selectedEdgeIds.value);
      }
    }
    return selectedIds;
  };

  /** 取消框选 */
  const cancelBoxSelection = () => {
    selectionHandler.cancelBoxSelection();
    syncState();
  };

  /** 检查是否正在框选 */
  const isBoxSelecting = (): boolean => {
    return selectionHandler.isBoxSelecting();
  };

  /** 检查是否应该启用多选（根据按键） */
  const shouldMultiSelect = (event: MouseEvent | KeyboardEvent): boolean => {
    return selectionHandler.shouldMultiSelect(event);
  };

  /** 检查是否应该启用框选（根据按键） */
  const shouldBoxSelect = (event: MouseEvent | KeyboardEvent): boolean => {
    return selectionHandler.shouldBoxSelect(event);
  };

  return {
    selectedNodeIds,
    selectedEdgeIds,
    selectionBox,
    selectNode,
    selectNodes,
    selectEdge,
    deselectNode,
    deselectEdge,
    deselectAll,
    toggleNodeSelection,
    isNodeSelected,
    isEdgeSelected,
    getSelectedNodes,
    getSelectedEdges,
    startBoxSelection,
    updateBoxSelection,
    finishBoxSelection,
    cancelBoxSelection,
    isBoxSelecting,
    shouldMultiSelect,
    shouldBoxSelect
  };
}

