/**
 * Flow 连接处理器
 *
 * 处理连接线的创建、验证、预览等功能
 * 支持 RAF 节流的预览位置更新
 */

import type { FlowEdge } from '../../types/flow-edge';
import type { FlowNode } from '../../types/flow-node';
import type { FlowConfig } from '../../types/flow-config';
import { validateConnection } from '../../utils/validation-utils';
import { RafThrottle } from '../../utils/raf-throttle';

/**
 * 连接草稿状态
 */
export interface ConnectionDraft {
  /** 源节点 ID */
  sourceNodeId: string;
  /** 源端口 ID */
  sourceHandleId: string;
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
 * 预览位置
 */
export interface PreviewPosition {
  /** X 坐标（屏幕坐标） */
  x: number;
  /** Y 坐标（屏幕坐标） */
  y: number;
}

/**
 * 连接选项
 */
export interface ConnectionOptions {
  /** 连接模式 */
  mode?: 'loose' | 'strict';
  /** 是否显示连接预览 */
  showPreview?: boolean;
  /** 预览连接线样式 */
  previewStyle?: Record<string, any>;
  /** 是否使用 RAF 节流更新预览位置 */
  useRAF?: boolean;
  /** 创建连接的回调 */
  onCreateEdge?: (edge: FlowEdge) => void;
  /** 连接创建事件 */
  onConnect?: (edge: FlowEdge) => void;
}

/**
 * Flow 连接处理器
 */
export class FlowConnectionHandler {
  /** 连接草稿 */
  private draft: ConnectionDraft | null = null;
  /** 连接选项 */
  private options: ConnectionOptions = {
    mode: 'loose',
    showPreview: true,
    useRAF: true
  };
  /** 配置（用于验证） */
  private config: FlowConfig | null = null;
  /** 预览位置 */
  private previewPosition: PreviewPosition | null = null;
  /** RAF 节流工具 */
  private rafThrottle = new RafThrottle<MouseEvent>();

  /**
   * 设置连接选项
   */
  setOptions(options: Partial<ConnectionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 设置配置（用于连接验证）
   */
  setConfig(config: FlowConfig): void {
    this.config = config;
  }

  /**
   * 开始连接（从端口拖拽开始）
   *
   * @param sourceNodeId 源节点 ID
   * @param sourceHandleId 源端口 ID
   * @param startX 起始 X 坐标（屏幕坐标）
   * @param startY 起始 Y 坐标（屏幕坐标）
   */
  startConnection(
    sourceNodeId: string,
    sourceHandleId: string,
    startX: number,
    startY: number
  ): void {
    this.draft = {
      sourceNodeId,
      sourceHandleId,
      startX,
      startY,
      currentX: startX,
      currentY: startY
    };

    // 初始化预览位置（立即更新，不使用节流）
    this.previewPosition = {
      x: startX,
      y: startY
    };
  }

  /**
   * 更新连接预览位置（支持 RAF 节流）
   *
   * @param event 鼠标移动事件
   */
  updatePreviewPosition(event: MouseEvent): void {
    if (!this.draft) {
      return;
    }

    // 配置 RAF 节流工具的启用状态
    this.rafThrottle.setEnabled(this.options.useRAF ?? true);

    // 如果使用 RAF 节流，使用节流版本
    if (this.options.useRAF) {
      this.rafThrottle.throttle(event, (e) => {
        this.processPreviewUpdate(e);
      });
    } else {
      // 不使用 RAF，直接处理
      this.processPreviewUpdate(event);
    }
  }

  /**
   * 处理预览位置更新（核心逻辑）
   *
   * @param event 鼠标移动事件
   */
  private processPreviewUpdate(event: MouseEvent): void {
    if (!this.draft) {
      return;
    }

    this.draft.currentX = event.clientX;
    this.draft.currentY = event.clientY;
    this.previewPosition = {
      x: event.clientX,
      y: event.clientY
    };
  }

  /**
   * 更新连接预览位置（兼容旧 API）
   *
   * @param currentX 当前 X 坐标（屏幕坐标）
   * @param currentY 当前 Y 坐标（屏幕坐标）
   * @deprecated 使用 updatePreviewPosition(event) 替代
   */
  updateConnection(currentX: number, currentY: number): void {
    if (this.draft) {
      this.draft.currentX = currentX;
      this.draft.currentY = currentY;
      this.previewPosition = {
        x: currentX,
        y: currentY
      };
    }
  }

  /**
   * 完成连接（连接到目标端口）
   *
   * @param targetNodeId 目标节点 ID
   * @param targetHandleId 目标端口 ID
   * @param nodes 所有节点列表（用于验证）
   * @returns 连接数据，如果验证失败则返回 null
   */
  async finishConnection(
    targetNodeId: string,
    targetHandleId: string,
    nodes: FlowNode[]
  ): Promise<FlowEdge | null> {
    if (!this.draft) {
      return null;
    }

    // 检查源节点和目标节点是否存在
    const sourceNode = nodes.find(n => n.id === this.draft!.sourceNodeId);
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      this.cancelConnection();
      return null;
    }

    // 检查是否连接到自身
    if (sourceNode.id === targetNode.id) {
      this.cancelConnection();
      return null;
    }

    // 创建连接数据
    const connection: Partial<FlowEdge> = {
      source: sourceNode.id,
      target: targetNode.id,
      sourceHandle: this.draft.sourceHandleId,
      targetHandle: targetHandleId
    };

    // 验证连接
    if (this.config) {
      const validation = await validateConnection(connection, this.config);
      if (!validation.valid) {
        this.cancelConnection();
        return null;
      }
    }

    // 生成连接 ID
    const edgeId = `edge-${sourceNode.id}-${targetNode.id}-${Date.now()}`;

    // 创建完整的连接数据
    const edge: FlowEdge = {
      id: edgeId,
      source: sourceNode.id,
      target: targetNode.id,
      sourceHandle: this.draft.sourceHandleId,
      targetHandle: targetHandleId,
      type: this.config?.edges?.defaultType || 'bezier'
    };

    // 触发回调
    if (this.options.onCreateEdge) {
      this.options.onCreateEdge(edge);
    }
    if (this.options.onConnect) {
      this.options.onConnect(edge);
    }

    // 清除草稿和预览位置
    this.cancelConnection();

    return edge;
  }

  /**
   * 完成连接（从 DOM 事件中提取目标信息）
   *
   * 从鼠标抬起事件中提取目标端口信息，然后完成连接
   *
   * @param event 鼠标抬起事件
   * @param nodes 所有节点列表（用于验证）
   * @returns 连接数据，如果验证失败或未找到目标则返回 null
   */
  async finishConnectionFromEvent(
    event: MouseEvent,
    nodes: FlowNode[]
  ): Promise<FlowEdge | null> {
    if (!this.draft) {
      return null;
    }

    const target = event.target as HTMLElement;
    const handleElement = target.closest('.flow-handle');

    if (handleElement) {
      const handleId = handleElement.getAttribute('data-handle-id');
      const handleType = handleElement.getAttribute('data-handle-type');
      const nodeId = handleElement.closest('.flow-node')?.getAttribute('data-node-id');

      if (
        nodeId &&
        handleId &&
        handleType === 'target' &&
        nodeId !== this.draft.sourceNodeId
      ) {
        return await this.finishConnection(nodeId, handleId, nodes);
      }
    }

    // 未找到有效的目标端口，取消连接
    this.cancelConnection();
    return null;
  }

  /**
   * 取消连接
   */
  cancelConnection(): void {
    // 取消待执行的 RAF
    this.cancelRaf();

    // 清除草稿和预览位置
    this.draft = null;
    this.previewPosition = null;
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
    this.cancelConnection();
  }

  /**
   * 获取连接草稿
   *
   * @returns 连接草稿，如果不存在则返回 null
   */
  getDraft(): Readonly<ConnectionDraft> | null {
    return this.draft ? { ...this.draft } : null;
  }

  /**
   * 获取预览位置
   *
   * @returns 预览位置，如果不存在则返回 null
   */
  getPreviewPosition(): Readonly<PreviewPosition> | null {
    return this.previewPosition ? { ...this.previewPosition } : null;
  }

  /**
   * 检查是否正在连接
   *
   * @returns 是否正在连接
   */
  isConnecting(): boolean {
    return this.draft !== null;
  }

  /**
   * 检查是否可以连接到目标节点
   *
   * @param targetNodeId 目标节点 ID
   * @param targetHandleId 目标端口 ID
   * @param nodes 所有节点列表
   * @returns 是否可以连接
   */
  canConnectTo(
    targetNodeId: string,
    targetHandleId: string,
    nodes: FlowNode[]
  ): boolean {
    if (!this.draft) {
      return false;
    }

    // 检查源节点和目标节点是否存在
    const sourceNode = nodes.find(n => n.id === this.draft!.sourceNodeId);
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      return false;
    }

    // 检查是否连接到自身
    if (sourceNode.id === targetNode.id) {
      return false;
    }

    return true;
  }
}

