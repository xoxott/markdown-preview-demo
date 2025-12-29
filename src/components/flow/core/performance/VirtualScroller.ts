/**
 * Flow 虚拟滚动器
 * 
 * 只渲染可见区域的节点，提升大量节点时的渲染性能
 */

import type { FlowNode } from '../../types/flow-node';
import type { FlowViewport } from '../../types/flow-config';
import { ViewportCuller, type ViewportBounds } from './ViewportCuller';

/**
 * 虚拟滚动选项
 */
export interface VirtualScrollOptions {
  /** 缓冲区大小（像素） */
  buffer?: number;
  /** 是否启用虚拟滚动 */
  enabled?: boolean;
  /** 虚拟滚动阈值（节点数量超过此值才启用） */
  threshold?: number;
}

/**
 * Flow 虚拟滚动器
 */
export class VirtualScroller {
  /** 视口裁剪器 */
  private culler: ViewportCuller;
  /** 虚拟滚动选项 */
  private options: Required<VirtualScrollOptions> = {
    buffer: 200,
    enabled: true,
    threshold: 100
  };

  constructor(culler?: ViewportCuller) {
    this.culler = culler || new ViewportCuller();
  }

  /**
   * 设置虚拟滚动选项
   */
  setOptions(options: Partial<VirtualScrollOptions>): void {
    this.options = { ...this.options, ...options };
    this.culler.setOptions({ buffer: this.options.buffer });
  }

  /**
   * 获取可见节点
   * 
   * @param nodes 所有节点列表
   * @param viewport 视口状态
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   * @returns 可见节点列表和相关信息
   */
  getVisibleNodes(
    nodes: FlowNode[],
    viewport: FlowViewport,
    canvasWidth: number = window.innerWidth || 1000,
    canvasHeight: number = window.innerHeight || 1000
  ): {
    visibleNodes: FlowNode[];
    totalCount: number;
    visibleCount: number;
    bounds: ViewportBounds;
  } {
    // 如果未启用或节点数量未超过阈值，返回所有节点
    if (
      !this.options.enabled ||
      nodes.length < this.options.threshold
    ) {
      const bounds = this.culler.calculateViewportBounds(
        viewport,
        canvasWidth,
        canvasHeight
      );
      return {
        visibleNodes: nodes,
        totalCount: nodes.length,
        visibleCount: nodes.length,
        bounds
      };
    }

    // 使用视口裁剪器获取可见节点
    const bounds = this.culler.calculateViewportBounds(
      viewport,
      canvasWidth,
      canvasHeight
    );
    const visibleNodes = this.culler.cullNodes(nodes, bounds);

    return {
      visibleNodes,
      totalCount: nodes.length,
      visibleCount: visibleNodes.length,
      bounds
    };
  }

  /**
   * 计算节点索引范围（用于虚拟滚动优化）
   * 
   * @param nodes 所有节点列表（假设已排序）
   * @param bounds 视口边界
   * @returns 可见节点的索引范围
   */
  calculateVisibleRange(
    nodes: FlowNode[],
    bounds: ViewportBounds
  ): { startIndex: number; endIndex: number } {
    let startIndex = 0;
    let endIndex = nodes.length - 1;

    // 找到第一个可见节点的索引
    for (let i = 0; i < nodes.length; i++) {
      if (this.culler.isNodeInViewport(nodes[i], bounds)) {
        startIndex = Math.max(0, i - 10); // 添加一些缓冲区
        break;
      }
    }

    // 找到最后一个可见节点的索引
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (this.culler.isNodeInViewport(nodes[i], bounds)) {
        endIndex = Math.min(nodes.length - 1, i + 10); // 添加一些缓冲区
        break;
      }
    }

    return { startIndex, endIndex };
  }

  /**
   * 检查是否应该启用虚拟滚动
   * 
   * @param nodeCount 节点数量
   * @returns 是否应该启用
   */
  shouldEnable(nodeCount: number): boolean {
    return this.options.enabled && nodeCount >= this.options.threshold;
  }

  /**
   * 获取性能统计信息
   * 
   * @param nodes 所有节点列表
   * @param viewport 视口状态
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   * @returns 性能统计信息
   */
  getPerformanceStats(
    nodes: FlowNode[],
    viewport: FlowViewport,
    canvasWidth?: number,
    canvasHeight?: number
  ): {
    totalNodes: number;
    visibleNodes: number;
    cullingRatio: number;
    enabled: boolean;
  } {
    const result = this.getVisibleNodes(nodes, viewport, canvasWidth, canvasHeight);
    const cullingRatio =
      result.totalCount > 0
        ? (result.totalCount - result.visibleCount) / result.totalCount
        : 0;

    return {
      totalNodes: result.totalCount,
      visibleNodes: result.visibleCount,
      cullingRatio,
      enabled: this.shouldEnable(result.totalCount)
    };
  }
}

