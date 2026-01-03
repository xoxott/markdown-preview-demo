/**
 * Flow 选择处理器
 *
 * 处理节点和连接线的选择功能，支持点击选择、框选、多选等
 */

import type { FlowNode } from '../../types/flow-node';
import type { FlowEdge } from '../../types/flow-edge';

/**
 * 选择框状态
 */
export interface SelectionBox {
  /** 是否显示选择框 */
  visible: boolean;
  /** 起始 X 坐标（屏幕坐标） */
  startX: number;
  /** 起始 Y 坐标（屏幕坐标） */
  startY: number;
  /** 当前 X 坐标（屏幕坐标） */
  currentX: number;
  /** 当前 Y 坐标（屏幕坐标） */
  currentY: number;
}

/**
 * 选择选项
 */
export interface SelectionOptions {
  /** 是否启用多选 */
  enableMultiSelection?: boolean;
  /** 多选快捷键 */
  multiSelectKey?: 'ctrl' | 'shift' | 'meta' | 'alt';
  /** 是否启用框选 */
  enableBoxSelection?: boolean;
  /** 框选快捷键 */
  boxSelectionKey?: 'shift' | 'alt' | 'ctrl';
}

/**
 * 选择处理器选项
 */
export interface FlowSelectionHandlerOptions {
  /** 选择选项 */
  options?: Partial<SelectionOptions>;
  /** 选择变化回调 */
  onSelectionChange?: (nodeIds: string[], edgeIds: string[]) => void;
}

/**
 * Flow 选择处理器
 *
 * 完全独立的选择逻辑处理器，不依赖任何状态管理器
 * 通过回调函数通知选择变化
 */
export class FlowSelectionHandler {
  /** 选中的节点 ID 列表 */
  private selectedNodeIds: Set<string> = new Set();
  /** 选中的连接线 ID 列表 */
  private selectedEdgeIds: Set<string> = new Set();
  /** 选择框状态 */
  private selectionBox: SelectionBox = {
    visible: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  };
  /** 选择选项 */
  private options: SelectionOptions = {
    enableMultiSelection: true,
    multiSelectKey: 'ctrl',
    enableBoxSelection: true,
    boxSelectionKey: 'shift'
  };
  /** 选择变化回调 */
  private onSelectionChange?: (nodeIds: string[], edgeIds: string[]) => void;

  constructor(handlerOptions?: FlowSelectionHandlerOptions) {
    if (handlerOptions?.options) {
      this.options = { ...this.options, ...handlerOptions.options };
    }
    this.onSelectionChange = handlerOptions?.onSelectionChange;
  }

  /**
   * 设置选择选项
   */
  setOptions(options: Partial<SelectionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 设置选择变化回调
   *
   * @param callback 回调函数
   */
  setOnSelectionChange(callback: (nodeIds: string[], edgeIds: string[]) => void): void {
    this.onSelectionChange = callback;
  }

  /**
   * 通知选择变化
   */
  private notifySelectionChange(): void {
    if (this.onSelectionChange) {
      this.onSelectionChange(
        Array.from(this.selectedNodeIds),
        Array.from(this.selectedEdgeIds)
      );
    }
  }

  /**
   * 选择节点
   *
   * @param nodeId 节点 ID
   * @param addToSelection 是否添加到当前选择（多选）
   */
  selectNode(nodeId: string, addToSelection: boolean = false): void {
    if (addToSelection) {
      this.selectedNodeIds.add(nodeId);
    } else {
      this.selectedNodeIds.clear();
      this.selectedEdgeIds.clear();
      this.selectedNodeIds.add(nodeId);
    }
    this.notifySelectionChange();
  }

  /**
   * 选择多个节点
   *
   * @param nodeIds 节点 ID 数组
   */
  selectNodes(nodeIds: string[]): void {
    this.selectedNodeIds.clear();
    this.selectedEdgeIds.clear();
    nodeIds.forEach(id => this.selectedNodeIds.add(id));
    this.notifySelectionChange();
  }

  /**
   * 选择连接线
   *
   * @param edgeId 连接线 ID
   * @param addToSelection 是否添加到当前选择（多选）
   */
  selectEdge(edgeId: string, addToSelection: boolean = false): void {
    if (addToSelection) {
      this.selectedEdgeIds.add(edgeId);
    } else {
      this.selectedNodeIds.clear();
      this.selectedEdgeIds.clear();
      this.selectedEdgeIds.add(edgeId);
    }
    this.notifySelectionChange();
  }

  /**
   * 取消选择节点
   *
   * @param nodeId 节点 ID
   */
  deselectNode(nodeId: string): void {
    this.selectedNodeIds.delete(nodeId);
    this.notifySelectionChange();
  }

  /**
   * 取消选择连接线
   *
   * @param edgeId 连接线 ID
   */
  deselectEdge(edgeId: string): void {
    this.selectedEdgeIds.delete(edgeId);
    this.notifySelectionChange();
  }

  /**
   * 取消所有选择
   */
  deselectAll(): void {
    this.selectedNodeIds.clear();
    this.selectedEdgeIds.clear();
    this.notifySelectionChange();
  }

  /**
   * 切换节点选择状态
   *
   * @param nodeId 节点 ID
   */
  toggleNodeSelection(nodeId: string): void {
    if (this.selectedNodeIds.has(nodeId)) {
      this.deselectNode(nodeId);
    } else {
      this.selectNode(nodeId, this.options.enableMultiSelection);
    }
  }

  /**
   * 检查节点是否被选中
   *
   * @param nodeId 节点 ID
   * @returns 是否选中
   */
  isNodeSelected(nodeId: string): boolean {
    return this.selectedNodeIds.has(nodeId);
  }

  /**
   * 检查连接线是否被选中
   *
   * @param edgeId 连接线 ID
   * @returns 是否选中
   */
  isEdgeSelected(edgeId: string): boolean {
    return this.selectedEdgeIds.has(edgeId);
  }

  /**
   * 获取选中的节点 ID 列表
   *
   * @returns 节点 ID 数组
   */
  getSelectedNodeIds(): string[] {
    return Array.from(this.selectedNodeIds);
  }

  /**
   * 获取选中的连接线 ID 列表
   *
   * @returns 连接线 ID 数组
   */
  getSelectedEdgeIds(): string[] {
    return Array.from(this.selectedEdgeIds);
  }

  /**
   * 获取选中的节点
   *
   * @param nodes 所有节点列表
   * @returns 选中的节点数组
   */
  getSelectedNodes(nodes: FlowNode[]): FlowNode[] {
    return nodes.filter(node => this.selectedNodeIds.has(node.id));
  }

  /**
   * 获取选中的连接线
   *
   * @param edges 所有连接线列表
   * @returns 选中的连接线数组
   */
  getSelectedEdges(edges: FlowEdge[]): FlowEdge[] {
    return edges.filter(edge => this.selectedEdgeIds.has(edge.id));
  }

  /**
   * 开始框选
   *
   * @param startX 起始 X 坐标（屏幕坐标）
   * @param startY 起始 Y 坐标（屏幕坐标）
   */
  startBoxSelection(startX: number, startY: number): void {
    this.selectionBox = {
      visible: true,
      startX,
      startY,
      currentX: startX,
      currentY: startY
    };
  }

  /**
   * 更新框选
   *
   * @param currentX 当前 X 坐标（屏幕坐标）
   * @param currentY 当前 Y 坐标（屏幕坐标）
   */
  updateBoxSelection(currentX: number, currentY: number): void {
    if (this.selectionBox.visible) {
      this.selectionBox.currentX = currentX;
      this.selectionBox.currentY = currentY;
    }
  }

  /**
   * 完成框选
   *
   * @param nodes 所有节点列表
   * @param viewport 当前视口（用于坐标转换）
   * @returns 选中的节点 ID 数组
   */
  finishBoxSelection(
    nodes: FlowNode[],
    viewport: { x: number; y: number; zoom: number }
  ): string[] {
    if (!this.selectionBox.visible) {
      return [];
    }

    const box = this.selectionBox;
    const minX = Math.min(box.startX, box.currentX);
    const maxX = Math.max(box.startX, box.currentX);
    const minY = Math.min(box.startY, box.currentY);
    const maxY = Math.max(box.startY, box.currentY);

    // 转换为画布坐标
    const canvasMinX = (minX - viewport.x) / viewport.zoom;
    const canvasMaxX = (maxX - viewport.x) / viewport.zoom;
    const canvasMinY = (minY - viewport.y) / viewport.zoom;
    const canvasMaxY = (maxY - viewport.y) / viewport.zoom;

    // 查找在选择框内的节点
    const selectedNodeIds: string[] = [];

    nodes.forEach(node => {
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const nodeWidth = node.size?.width || 220;
      const nodeHeight = node.size?.height || 72;

      // 检查节点是否在选择框内
      if (
        nodeX + nodeWidth >= canvasMinX &&
        nodeX <= canvasMaxX &&
        nodeY + nodeHeight >= canvasMinY &&
        nodeY <= canvasMaxY
      ) {
        selectedNodeIds.push(node.id);
      }
    });

    // 隐藏选择框
    this.selectionBox.visible = false;

    return selectedNodeIds;
  }

  /**
   * 取消框选
   */
  cancelBoxSelection(): void {
    this.selectionBox.visible = false;
  }

  /**
   * 获取选择框状态
   *
   * @returns 选择框状态
   */
  getSelectionBox(): Readonly<SelectionBox> {
    return { ...this.selectionBox };
  }

  /**
   * 检查是否正在框选
   *
   * @returns 是否正在框选
   */
  isBoxSelecting(): boolean {
    return this.selectionBox.visible;
  }

  /**
   * 检查是否应该启用多选（根据按键）
   *
   * @param event 鼠标或键盘事件
   * @returns 是否启用多选
   */
  shouldMultiSelect(event: MouseEvent | KeyboardEvent): boolean {
    if (!this.options.enableMultiSelection) {
      return false;
    }

    const key = this.options.multiSelectKey;
    switch (key) {
      case 'ctrl':
        return event.ctrlKey;
      case 'shift':
        return event.shiftKey;
      case 'meta':
        return event.metaKey;
      case 'alt':
        return event.altKey;
      default:
        return false;
    }
  }

  /**
   * 检查是否应该启用框选（根据按键）
   *
   * @param event 鼠标或键盘事件
   * @returns 是否启用框选
   */
  shouldBoxSelect(event: MouseEvent | KeyboardEvent): boolean {
    if (!this.options.enableBoxSelection) {
      return false;
    }

    const key = this.options.boxSelectionKey;
    switch (key) {
      case 'shift':
        return event.shiftKey;
      case 'alt':
        return event.altKey;
      case 'ctrl':
        return event.ctrlKey;
      default:
        return false;
    }
  }
}

