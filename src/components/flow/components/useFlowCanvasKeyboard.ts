/**
 * FlowCanvas 键盘快捷键配置
 *
 * 集中管理 FlowCanvas 的键盘快捷键注册
 */

import type { Ref } from 'vue';
import type { FlowEdge, FlowNode } from '../types';

export interface FlowCanvasKeyboardDeps {
  /** 选择处理器 */
  selection: {
    getSelectedNodes: (nodes: FlowNode[]) => FlowNode[];
    getSelectedEdges: (edges: FlowEdge[]) => FlowEdge[];
    selectNodes: (nodeIds: string[]) => void;
    selectEdge: (edgeId: string, addToSelection?: boolean) => void;
    deselectAll: () => void;
    isEdgeSelected: (edgeId: string) => boolean;
  };
  /** 历史记录操作（使用接口而不是直接依赖实现） */
  historyOperations: {
    undo: () => boolean;
    redo: () => boolean;
    canUndo: () => boolean;
    canRedo: () => boolean;
  };
  /** 选中的节点 ID 列表（响应式） */
  selectedNodeIds: Ref<string[]>;
  /** 选中的连接线 ID 列表（响应式） */
  selectedEdgeIds: Ref<string[]>;
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 连接线列表 */
  edges: Ref<FlowEdge[]>;
  /** 删除节点 */
  removeNode: (nodeId: string) => void;
  /** 删除连接线 */
  removeEdge: (edgeId: string) => void;
}

/**
 * 注册 FlowCanvas 的默认键盘快捷键
 *
 * @param keyboard 键盘处理器（useKeyboard 返回的 register 方法）
 * @param deps 依赖项
 * @returns 取消注册所有快捷键的函数
 */
export function registerFlowCanvasShortcuts(
  keyboard: {
    register: (
      binding: { key: string; ctrl?: boolean; shift?: boolean; meta?: boolean },
      handler: () => void,
      options?: { description?: string; priority?: number }
    ) => () => void;
  },
  deps: FlowCanvasKeyboardDeps
): () => void {
  const {
    selection,
    historyOperations,
    selectedNodeIds,
    selectedEdgeIds,
    nodes,
    edges,
    removeNode,
    removeEdge
  } = deps;

  const unregisters: (() => void)[] = [];

  /**
   * 删除选中的节点和连接线
   */
  const handleDelete = () => {
    const selectedNodes = selection.getSelectedNodes(nodes.value);
    const selectedEdges = selection.getSelectedEdges(edges.value);

    selectedNodes.forEach(node => removeNode(node.id));
    selectedEdges.forEach(edge => removeEdge(edge.id));

    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      selection.deselectAll();
    }
  };

  /**
   * 同步选择状态到 selection
   */
  const syncSelectionAfterUndoRedo = () => {
    selection.selectNodes(selectedNodeIds.value);
    selectedEdgeIds.value.forEach((id: string) => {
      if (!selection.isEdgeSelected(id)) {
        selection.selectEdge(id, true);
      }
    });
  };

  /**
   * 撤销操作
   */
  const handleUndo = () => {
    if (historyOperations.undo()) {
      syncSelectionAfterUndoRedo();
    }
  };

  /**
   * 重做操作
   */
  const handleRedo = () => {
    if (historyOperations.redo()) {
      syncSelectionAfterUndoRedo();
    }
  };

  /**
   * 全选节点
   */
  const handleSelectAll = () => {
    selection.selectNodes(nodes.value.map(node => node.id));
  };

  // Delete/Backspace: 删除选中的节点和连接线
  unregisters.push(
    keyboard.register(
      { key: 'Delete' },
      handleDelete,
      { description: '删除选中的节点和连接线', priority: 10 }
    )
  );

  unregisters.push(
    keyboard.register(
      { key: 'Backspace' },
      handleDelete,
      { description: '删除选中的节点和连接线', priority: 10 }
    )
  );

  // Ctrl+Z / Cmd+Z: 撤销
  unregisters.push(
    keyboard.register(
      { key: 'z', ctrl: true },
      handleUndo,
      { description: '撤销', priority: 10 }
    )
  );

  unregisters.push(
    keyboard.register(
      { key: 'z', meta: true },
      handleUndo,
      { description: '撤销', priority: 10 }
    )
  );

  // Ctrl+Y / Cmd+Shift+Z: 重做
  unregisters.push(
    keyboard.register(
      { key: 'y', ctrl: true },
      handleRedo,
      { description: '重做', priority: 10 }
    )
  );

  unregisters.push(
    keyboard.register(
      { key: 'z', meta: true, shift: true },
      handleRedo,
      { description: '重做', priority: 10 }
    )
  );

  // Ctrl+A / Cmd+A: 全选
  unregisters.push(
    keyboard.register(
      { key: 'a', ctrl: true },
      handleSelectAll,
      { description: '全选节点', priority: 10 }
    )
  );

  unregisters.push(
    keyboard.register(
      { key: 'a', meta: true },
      handleSelectAll,
      { description: '全选节点', priority: 10 }
    )
  );

  // Escape: 取消选择
  unregisters.push(
    keyboard.register(
      { key: 'Escape' },
      () => selection.deselectAll(),
      { description: '取消选择', priority: 10 }
    )
  );

  // 返回取消注册所有快捷键的函数
  return () => {
    unregisters.forEach(unregister => unregister());
  };
}

