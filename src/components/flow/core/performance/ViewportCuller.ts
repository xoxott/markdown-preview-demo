/**
 * Flow 视口裁剪器
 * 
 * 计算可见区域，过滤不可见的节点和连接线，提升渲染性能
 */

import type { FlowNode } from '../../types/flow-node';
import type { FlowEdge } from '../../types/flow-edge';
import type { FlowViewport } from '../../types/flow-config';

/**
 * 视口区域
 */
export interface ViewportBounds {
  /** 最小 X 坐标（画布坐标） */
  minX: number;
  /** 最小 Y 坐标（画布坐标） */
  minY: number;
  /** 最大 X 坐标（画布坐标） */
  maxX: number;
  /** 最大 Y 坐标（画布坐标） */
  maxY: number;
  /** 宽度 */
  width: number;
  /** 高度 */
  height: number;
}

/**
 * 裁剪选项
 */
export interface CullingOptions {
  /** 缓冲区大小（像素，扩展视口区域） */
  buffer?: number;
  /** 是否启用节点裁剪 */
  cullNodes?: boolean;
  /** 是否启用连接线裁剪 */
  cullEdges?: boolean;
}

/**
 * Flow 视口裁剪器
 */
export class ViewportCuller {
  /** 裁剪选项 */
  private options: Required<CullingOptions> = {
    buffer: 200,
    cullNodes: true,
    cullEdges: true
  };

  /**
   * 设置裁剪选项
   */
  setOptions(options: Partial<CullingOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 计算视口边界（画布坐标）
   * 
   * @param viewport 视口状态
   * @param canvasWidth 画布宽度（屏幕像素）
   * @param canvasHeight 画布高度（屏幕像素）
   * @returns 视口边界
   */
  calculateViewportBounds(
    viewport: FlowViewport,
    canvasWidth: number = window.innerWidth || 1000,
    canvasHeight: number = window.innerHeight || 1000
  ): ViewportBounds {
    // 转换为画布坐标
    const viewportX = -viewport.x / viewport.zoom;
    const viewportY = -viewport.y / viewport.zoom;
    const viewportWidth = canvasWidth / viewport.zoom;
    const viewportHeight = canvasHeight / viewport.zoom;

    // 添加缓冲区
    const buffer = this.options.buffer / viewport.zoom;

    return {
      minX: viewportX - buffer,
      minY: viewportY - buffer,
      maxX: viewportX + viewportWidth + buffer,
      maxY: viewportY + viewportHeight + buffer,
      width: viewportWidth + buffer * 2,
      height: viewportHeight + buffer * 2
    };
  }

  /**
   * 裁剪节点（只返回可见节点）
   * 
   * @param nodes 所有节点列表
   * @param bounds 视口边界
   * @returns 可见节点列表
   */
  cullNodes(nodes: FlowNode[], bounds: ViewportBounds): FlowNode[] {
    if (!this.options.cullNodes) {
      return nodes;
    }

    return nodes.filter(node => {
      const nodeX = node.position.x;
      const nodeY = node.position.y;
      const nodeWidth = node.size?.width || 220;
      const nodeHeight = node.size?.height || 72;

      // 检查节点是否与视口相交
      return (
        nodeX + nodeWidth >= bounds.minX &&
        nodeX <= bounds.maxX &&
        nodeY + nodeHeight >= bounds.minY &&
        nodeY <= bounds.maxY
      );
    });
  }

  /**
   * 裁剪连接线（只返回可见连接线）
   * 
   * @param edges 所有连接线列表
   * @param nodes 所有节点列表（用于计算连接线位置）
   * @param bounds 视口边界
   * @returns 可见连接线列表
   */
  cullEdges(
    edges: FlowEdge[],
    nodes: FlowNode[],
    bounds: ViewportBounds
  ): FlowEdge[] {
    if (!this.options.cullEdges) {
      return edges;
    }

    // 创建节点映射（快速查找）
    const nodeMap = new Map<string, FlowNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    return edges.filter(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) {
        return false;
      }

      // 计算源节点和目标节点的中心位置
      const sourceX = sourceNode.position.x + (sourceNode.size?.width || 220) / 2;
      const sourceY = sourceNode.position.y + (sourceNode.size?.height || 72) / 2;
      const targetX = targetNode.position.x + (targetNode.size?.width || 220) / 2;
      const targetY = targetNode.position.y + (targetNode.size?.height || 72) / 2;

      // 检查连接线的起点和终点是否在视口内
      // 或者连接线是否与视口相交
      const sourceInViewport =
        sourceX >= bounds.minX &&
        sourceX <= bounds.maxX &&
        sourceY >= bounds.minY &&
        sourceY <= bounds.maxY;

      const targetInViewport =
        targetX >= bounds.minX &&
        targetX <= bounds.maxX &&
        targetY >= bounds.minY &&
        targetY <= bounds.maxY;

      // 如果起点或终点在视口内，则可见
      if (sourceInViewport || targetInViewport) {
        return true;
      }

      // 检查连接线是否与视口相交（简单检查：连接线是否穿过视口）
      // 这里使用简化的检查：如果连接线的起点和终点分别在视口的两侧，则认为相交
      const crossesViewport =
        (sourceX < bounds.minX && targetX > bounds.maxX) ||
        (sourceX > bounds.maxX && targetX < bounds.minX) ||
        (sourceY < bounds.minY && targetY > bounds.maxY) ||
        (sourceY > bounds.maxY && targetY < bounds.minY);

      return crossesViewport;
    });
  }

  /**
   * 裁剪节点和连接线
   * 
   * @param nodes 所有节点列表
   * @param edges 所有连接线列表
   * @param viewport 视口状态
   * @param canvasWidth 画布宽度
   * @param canvasHeight 画布高度
   * @returns 裁剪后的节点和连接线
   */
  cull(
    nodes: FlowNode[],
    edges: FlowEdge[],
    viewport: FlowViewport,
    canvasWidth?: number,
    canvasHeight?: number
  ): {
    visibleNodes: FlowNode[];
    visibleEdges: FlowEdge[];
    bounds: ViewportBounds;
  } {
    const bounds = this.calculateViewportBounds(viewport, canvasWidth, canvasHeight);
    const visibleNodes = this.cullNodes(nodes, bounds);
    const visibleEdges = this.cullEdges(edges, visibleNodes, bounds);

    return {
      visibleNodes,
      visibleEdges,
      bounds
    };
  }

  /**
   * 检查节点是否在视口内
   * 
   * @param node 节点
   * @param bounds 视口边界
   * @returns 是否在视口内
   */
  isNodeInViewport(node: FlowNode, bounds: ViewportBounds): boolean {
    const nodeX = node.position.x;
    const nodeY = node.position.y;
    const nodeWidth = node.size?.width || 220;
    const nodeHeight = node.size?.height || 72;

    return (
      nodeX + nodeWidth >= bounds.minX &&
      nodeX <= bounds.maxX &&
      nodeY + nodeHeight >= bounds.minY &&
      nodeY <= bounds.maxY
    );
  }

  /**
   * 检查点是否在视口内
   * 
   * @param x X 坐标（画布坐标）
   * @param y Y 坐标（画布坐标）
   * @param bounds 视口边界
   * @returns 是否在视口内
   */
  isPointInViewport(
    x: number,
    y: number,
    bounds: ViewportBounds
  ): boolean {
    return (
      x >= bounds.minX &&
      x <= bounds.maxX &&
      y >= bounds.minY &&
      y <= bounds.maxY
    );
  }
}

