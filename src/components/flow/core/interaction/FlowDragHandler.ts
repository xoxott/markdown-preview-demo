/**
 * Flow 拖拽处理器
 *
 * 处理节点拖拽和画布拖拽功能
 * 支持 RAF 节流、增量模式、灵活的坐标转换等高级特性
 */

import type { FlowNode } from '../../types/flow-node';
import type { FlowViewport } from '../../types/flow-config';
import type { DragTransformResult, CoordinateTransform } from '../../types/flow-interaction';
import { RafThrottle } from '../../utils/raf-throttle';

/**
 * 拖拽状态
 */
export interface DragState {
  /** 是否正在拖拽 */
  isDragging: boolean;
  /** 拖拽类型 */
  type: 'node' | 'canvas' | 'generic' | null;
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
  /** 拖拽起始目标坐标（用于通用拖拽） */
  startTargetX: number;
  startTargetY: number;
  /** 当前拖拽位置 */
  currentX: number;
  currentY: number;
  /** 是否已移动（超过阈值） */
  hasMoved: boolean;
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
  /** 是否使用 RAF 节流 */
  useRAF?: boolean;
  /** 是否使用增量模式 */
  incremental?: boolean;
  /** 坐标转换函数 */
  transformCoordinates?: CoordinateTransform;
  /** 拖拽更新回调 */
  onDrag?: (result: DragTransformResult, event: MouseEvent) => void;
  /** 拖拽开始回调 */
  onDragStart?: (event: MouseEvent, startTargetX?: number, startTargetY?: number) => void;
  /** 拖拽结束回调 */
  onDragEnd?: (hasMoved: boolean) => void;
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
    startTargetX: 0,
    startTargetY: 0,
    currentX: 0,
    currentY: 0,
    hasMoved: false
  };

  /** 拖拽选项 */
  private options: DragOptions = {
    snapToGrid: false,
    gridSize: 20,
    constrainToBounds: false,
    threshold: 3,
    useRAF: true,
    incremental: false
  };

  /** RAF 节流工具 */
  private rafThrottle = new RafThrottle<MouseEvent>();

  /**
   * 设置拖拽选项
   */
  setOptions(options: Partial<DragOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 开始通用拖拽
   *
   * 支持灵活的坐标转换和回调配置
   *
   * @param event 鼠标按下事件
   * @param startTargetX 拖拽开始时的目标坐标 X（可选，用于绝对定位）
   * @param startTargetY 拖拽开始时的目标坐标 Y（可选，用于绝对定位）
   * @param canStart 拖拽开始前的检查函数（可选）
   * @returns 是否成功开始拖拽
   */
  startDrag(
    event: MouseEvent,
    startTargetX: number = 0,
    startTargetY: number = 0,
    canStart?: (event: MouseEvent) => boolean
  ): boolean {
    // 检查是否可以开始拖拽
    if (canStart && !canStart(event)) {
      return false;
    }

    // 初始化拖拽状态
    this.dragState = {
      isDragging: true,
      type: 'generic',
      nodeId: null,
      startX: event.clientX,
      startY: event.clientY,
      startViewportX: 0,
      startViewportY: 0,
      startNodeX: 0,
      startNodeY: 0,
      startTargetX,
      startTargetY,
      currentX: event.clientX,
      currentY: event.clientY,
      hasMoved: false
    };

    // 触发开始回调
    if (this.options.onDragStart) {
      this.options.onDragStart(event, startTargetX, startTargetY);
    }

    return true;
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
      startTargetX: node.position.x,
      startTargetY: node.position.y,
      currentX: startX,
      currentY: startY,
      hasMoved: false
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
      startTargetX: viewport.x,
      startTargetY: viewport.y,
      currentX: startX,
      currentY: startY,
      hasMoved: false
    };
  }

  /**
   * 更新拖拽位置（通用方法）
   *
   * 支持 RAF 节流、增量模式、坐标转换等
   *
   * @param event 鼠标移动事件
   */
  updateDrag(event: MouseEvent): void {
    if (!this.dragState.isDragging) {
      return;
    }

    // 配置 RAF 节流工具的启用状态
    this.rafThrottle.setEnabled(this.options.useRAF ?? true);

    // 如果使用 RAF 节流，使用节流版本
    if (this.options.useRAF) {
      this.rafThrottle.throttle(event, (e) => {
        this.processDrag(e);
      });
    } else {
      // 不使用 RAF，直接处理
      this.processDrag(event);
    }
  }

  /**
   * 处理拖拽更新（核心逻辑）
   *
   * 计算坐标偏移，执行坐标转换，调用更新回调
   *
   * @param event 鼠标移动事件
   */
  private processDrag(event: MouseEvent): void {
    if (!this.dragState.isDragging) {
      return;
    }

    this.dragState.currentX = event.clientX;
    this.dragState.currentY = event.clientY;

    // 计算屏幕坐标偏移
    const screenDeltaX = event.clientX - this.dragState.startX;
    const screenDeltaY = event.clientY - this.dragState.startY;

    // 计算移动距离（用于判断是否超过阈值）
    const distance = Math.sqrt(screenDeltaX * screenDeltaX + screenDeltaY * screenDeltaY);

    // 检查是否超过阈值
    if (distance >= (this.options.threshold ?? 3)) {
      this.dragState.hasMoved = true;
    }

    // 执行坐标转换
    let result: DragTransformResult;
    if (this.options.transformCoordinates) {
      // 使用自定义转换函数
      result = this.options.transformCoordinates(
        event.clientX,
        event.clientY,
        this.dragState.startX,
        this.dragState.startY,
        this.dragState.startTargetX,
        this.dragState.startTargetY
      );
    } else {
      // 默认：直接使用屏幕坐标偏移
      result = {
        x: this.dragState.startTargetX + screenDeltaX,
        y: this.dragState.startTargetY + screenDeltaY,
        deltaX: screenDeltaX,
        deltaY: screenDeltaY
      };
    }

    // 调用更新回调
    if (this.options.onDrag) {
      this.options.onDrag(result, event);
    }

    // 如果使用增量模式，重置起始位置（使得下次计算的是增量）
    if (this.options.incremental) {
      // 更新屏幕坐标起始位置（用于计算增量）
      this.dragState.startX = event.clientX;
      this.dragState.startY = event.clientY;

      // 如果有坐标转换函数，更新目标坐标起始位置
      if (this.options.transformCoordinates) {
        this.dragState.startTargetX = result.x;
        this.dragState.startTargetY = result.y;
      }
    }
  }

  /**
   * 更新拖拽位置（兼容旧 API）
   *
   * @param currentX 当前 X 坐标（屏幕坐标）
   * @param currentY 当前 Y 坐标（屏幕坐标）
   * @param viewport 当前视口（用于计算节点位置）
   * @returns 更新后的位置信息
   * @deprecated 使用 updateDrag(event) 替代
   */
  updateDragLegacy(
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
    if (distance < (this.options.threshold ?? 3)) {
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
        newX = Math.round(newX / (this.options.gridSize ?? 20)) * (this.options.gridSize ?? 20);
        newY = Math.round(newY / (this.options.gridSize ?? 20)) * (this.options.gridSize ?? 20);
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
    const wasMoved = this.dragState.hasMoved;

    // 取消待执行的 RAF
    this.cancelRaf();

    // 重置状态
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
      startTargetX: 0,
      startTargetY: 0,
      currentX: 0,
      currentY: 0,
      hasMoved: false
    };

    // 触发结束回调
    if (this.options.onDragEnd) {
      this.options.onDragEnd(wasMoved);
    }
  }

  /**
   * 取消 RAF（清理资源）
   */
  private cancelRaf(): void {
    this.rafThrottle.cancel();
  }

  /**
   * 清理资源
   *
   * 取消 RAF、重置状态，用于组件卸载时调用
   */
  cleanup(): void {
    this.cancelRaf();
    this.endDrag();
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

  /**
   * 检查是否已移动（超过阈值）
   */
  hasMoved(): boolean {
    return this.dragState.hasMoved;
  }
}

