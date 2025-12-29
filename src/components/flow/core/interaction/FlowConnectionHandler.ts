/**
 * Flow 连接处理器
 *
 * 处理连接线的创建、验证、预览等功能
 */

import type { FlowEdge } from '../../types/flow-edge';
import type { FlowNode } from '../../types/flow-node';
import type { FlowConfig } from '../../types/flow-config';
import { validateConnection } from '../../utils/validation-utils';

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
 * 连接选项
 */
export interface ConnectionOptions {
  /** 连接模式 */
  mode?: 'loose' | 'strict';
  /** 是否显示连接预览 */
  showPreview?: boolean;
  /** 预览连接线样式 */
  previewStyle?: Record<string, any>;
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
    showPreview: true
  };
  /** 配置（用于验证） */
  private config: FlowConfig | null = null;

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
  }

  /**
   * 更新连接预览位置
   *
   * @param currentX 当前 X 坐标（屏幕坐标）
   * @param currentY 当前 Y 坐标（屏幕坐标）
   */
  updateConnection(currentX: number, currentY: number): void {
    if (this.draft) {
      this.draft.currentX = currentX;
      this.draft.currentY = currentY;
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

    // 清除草稿
    this.draft = null;

    return edge;
  }

  /**
   * 取消连接
   */
  cancelConnection(): void {
    this.draft = null;
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

