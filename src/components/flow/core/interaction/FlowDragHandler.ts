/**
 * Flow 拖拽处理器
 *
 * 处理节点拖拽和画布拖拽功能
 */

import type { FlowNode } from '../../types/flow-node';
import type { FlowViewport } from '../../types/flow-config';

/**
 * 拖拽状态
 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 拖拽类型 */
  type: 'node' | 'canvas' | null;
  /** 拖拽的节点 ID（如果是节点拖拽） */
  nodeId: string | null;
  /** 拖拽起始位置（屏幕坐标） */
  startX: number;
  startY: number;
  /** 拖拽起始视口位置（如果是画布拖拽） */
  startViewportX: number;
  startViewportY: number;
  /** 拖拽起始节点位置（如果是节点拖拽） */
  startNodeX: number;
  startNodeY: number;
  /** 当前拖拽位置 */
  currentX: number;
  currentY: number;
}

/**
 * 拖拽选项
 */
export interface DragOptions {
  /** 是否启用网格吸附 */
  snapToGrid?: boolean;
  /** 网格大小 */
  gridSize?: number;
  /** 是否限制在边界内 */
  constrainToBounds?: boolean;
  /** 边界矩形 */
  bounds?: { x: number; y: number; width: number; height: number };
  /** 拖拽阈值（像素，超过此值才开始拖拽） */
  threshold?: number;
}

/**
 * Flow 拖拽处理器
 */
export class FlowDragHandler {
  /** 拖拽状态 */
  private dragState: DragState = {
    isDragging: false,
    type: null,
    nodeId: null,
    startX: 0,
    startY: 0,
    startViewportX: 0,
    startViewportY: 0,
    startNodeX: 0,
    startNodeY: 0,
    currentX: 0,
    currentY: 0
  };

  /** 拖拽选项 */
  private options: DragOptions = {
    snapToGrid: false,
    gridSize: 20,
    constrainToBounds: false,
    threshold: 3
  };

  /**
   * 设置拖拽选项
   */
  setOptions(options: Partial<DragOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 开始节点拖拽
   *
   * @param nodeId 节点 ID
   * @param node 节点数据
   * @param startX 起始 X 坐标（屏幕坐标）
   * @param startY 起始 Y 坐标（屏幕坐标）
   */
  startNodeDrag(
    nodeId: string,
    node: FlowNode,
    startX: number,
    startY: number
  ): void {
    this.dragState = {
      isDragging: true,
      type: 'node',
      nodeId,
      startX,
      startY,
      startViewportX: 0,
      startViewportY: 0,
      startNodeX: node.position.x,
      startNodeY: node.position.y,
      currentX: startX,
      currentY: startY
    };
  }

  /**
   * 开始画布拖拽
   *
   * @param viewport 当前视口
   * @param startX 起始 X 坐标（屏幕坐标）
   * @param startY 起始 Y 坐标（屏幕坐标）
   */
  startCanvasDrag(
    viewport: FlowViewport,
    startX: number,
    startY: number
  ): void {
    this.dragState = {
      isDragging: true,
      type: 'canvas',
      nodeId: null,
      startX,
      startY,
      startViewportX: viewport.x,
      startViewportY: viewport.y,
      startNodeX: 0,
      startNodeY: 0,
      currentX: startX,
      currentY: startY
    };
  }

  /**
   * 更新拖拽位置
   *
   * @param currentX 当前 X 坐标（屏幕坐标）
   * @param currentY 当前 Y 坐标（屏幕坐标）
   * @param viewport 当前视口（用于计算节点位置）
   * @returns 更新后的位置信息
   */
  updateDrag(
    currentX: number,
    currentY: number,
    viewport: FlowViewport
  ): {
    nodePosition?: { x: number; y: number };
    viewport?: { x: number; y: number };
    deltaX: number;
    deltaY: number;
  } | null {
    if (!this.dragState.isDragging) {
      return null;
    }

    this.dragState.currentX = currentX;
    this.dragState.currentY = currentY;

    const deltaX = currentX - this.dragState.startX;
    const deltaY = currentY - this.dragState.startY;

    // 检查是否超过阈值
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if (distance < this.options.threshold!) {
      return null;
    }

    if (this.dragState.type === 'node') {
      // 节点拖拽
      const deltaNodeX = deltaX / viewport.zoom;
      const deltaNodeY = deltaY / viewport.zoom;

      let newX = this.dragState.startNodeX + deltaNodeX;
      let newY = this.dragState.startNodeY + deltaNodeY;

      // 网格吸附
      if (this.options.snapToGrid) {
        newX = Math.round(newX / this.options.gridSize!) * this.options.gridSize!;
        newY = Math.round(newY / this.options.gridSize!) * this.options.gridSize!;
      }

      // 边界限制
      if (this.options.constrainToBounds && this.options.bounds) {
        const bounds = this.options.bounds;
        newX = Math.max(bounds.x, Math.min(bounds.x + bounds.width, newX));
        newY = Math.max(bounds.y, Math.min(bounds.y + bounds.height, newY));
      }

      return {
        nodePosition: { x: newX, y: newY },
        deltaX: deltaNodeX,
        deltaY: deltaNodeY
      };
    } else if (this.dragState.type === 'canvas') {
      // 画布拖拽
      const newViewportX = this.dragState.startViewportX + deltaX;
      const newViewportY = this.dragState.startViewportY + deltaY;

      return {
        viewport: { x: newViewportX, y: newViewportY },
        deltaX,
        deltaY
      };
    }

    return null;
  }

  /**
   * 结束拖拽
   */
  endDrag(): void {
    this.dragState = {
      isDragging: false,
      type: null,
      nodeId: null,
      startX: 0,
      startY: 0,
      startViewportX: 0,
      startViewportY: 0,
      startNodeX: 0,
      startNodeY: 0,
      currentX: 0,
      currentY: 0
    };
  }

  /**
   * 获取当前拖拽状态
   */
  getDragState(): Readonly<DragState> {
    return { ...this.dragState };
  }

  /**
   * 检查是否正在拖拽
   */
  isDragging(): boolean {
    return this.dragState.isDragging;
  }

  /**
   * 检查是否是节点拖拽
   */
  isNodeDragging(): boolean {
    return this.dragState.isDragging && this.dragState.type === 'node';
  }

  /**
   * 检查是否是画布拖拽
   */
  isCanvasDragging(): boolean {
    return this.dragState.isDragging && this.dragState.type === 'canvas';
  }

  /**
   * 获取拖拽的节点 ID
   */
  getDraggingNodeId(): string | null {
    return this.dragState.nodeId;
  }
}

