/**
 * Flow Canvas 渲染器
 * 
 * 使用 Canvas 渲染大量连接线，提升性能
 */

import type { FlowEdge } from '../../types/flow-edge';
import type { FlowNode } from '../../types/flow-node';
import type { FlowViewport } from '../../types/flow-config';

/**
 * Canvas 渲染选项
 */
export interface CanvasRenderOptions {
  /** 是否启用 Canvas 渲染 */
  enabled?: boolean;
  /** Canvas 渲染阈值（连接线数量超过此值使用 Canvas） */
  threshold?: number;
  /** 是否启用点击检测 */
  enableClickDetection?: boolean;
  /** 点击区域宽度 */
  clickAreaWidth?: number;
}

/**
 * Canvas 渲染器
 */
export class CanvasRenderer {
  /** Canvas 元素 */
  private canvas: HTMLCanvasElement | null = null;
  /** Canvas 上下文 */
  private ctx: CanvasRenderingContext2D | null = null;
  /** 渲染选项 */
  private options: Required<CanvasRenderOptions> = {
    enabled: true,
    threshold: 200,
    enableClickDetection: true,
    clickAreaWidth: 24
  };
  /** 点击检测数据（用于检测点击的连接线） */
  private clickMap: Map<number, string> = new Map(); // color -> edgeId

  /**
   * 设置 Canvas 元素
   * 
   * @param canvas Canvas 元素
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {
      alpha: false, // 禁用透明度以提升性能
      desynchronized: true // 启用异步渲染
    });
  }

  /**
   * 设置渲染选项
   */
  setOptions(options: Partial<CanvasRenderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 检查是否应该使用 Canvas 渲染
   * 
   * @param edgeCount 连接线数量
   * @returns 是否应该使用 Canvas
   */
  shouldUseCanvas(edgeCount: number): boolean {
    return this.options.enabled && edgeCount >= this.options.threshold;
  }

  /**
   * 渲染连接线
   * 
   * @param edges 连接线列表
   * @param nodes 节点列表（用于计算位置）
   * @param viewport 视口状态
   * @param selectedEdgeIds 选中的连接线 ID 列表
   */
  render(
    edges: FlowEdge[],
    nodes: FlowNode[],
    viewport: FlowViewport,
    selectedEdgeIds: string[] = []
  ): void {
    if (!this.canvas || !this.ctx) {
      return;
    }

    // 设置画布尺寸
    const width = this.canvas.width = this.canvas.offsetWidth;
    const height = this.canvas.height = this.canvas.offsetHeight;

    // 清空画布
    this.ctx.clearRect(0, 0, width, height);

    // 创建节点映射
    const nodeMap = new Map<string, FlowNode>();
    nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    // 清空点击检测数据
    this.clickMap.clear();

    // 渲染连接线
    edges.forEach((edge, index) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) {
        return;
      }

      // 计算节点中心位置（画布坐标）
      const sourceX = sourceNode.position.x + (sourceNode.size?.width || 220) / 2;
      const sourceY = sourceNode.position.y + (sourceNode.size?.height || 72) / 2;
      const targetX = targetNode.position.x + (targetNode.size?.width || 220) / 2;
      const targetY = targetNode.position.y + (targetNode.size?.height || 72) / 2;

      // 转换为屏幕坐标
      const screenSourceX = sourceX * viewport.zoom + viewport.x;
      const screenSourceY = sourceY * viewport.zoom + viewport.y;
      const screenTargetX = targetX * viewport.zoom + viewport.x;
      const screenTargetY = targetY * viewport.zoom + viewport.y;

      // 检查是否在视口内
      if (
        (screenSourceX < 0 && screenTargetX < 0) ||
        (screenSourceX > width && screenTargetX > width) ||
        (screenSourceY < 0 && screenTargetY < 0) ||
        (screenSourceY > height && screenTargetY > height)
      ) {
        return; // 完全在视口外，跳过
      }

      // 设置样式
      const isSelected = selectedEdgeIds.includes(edge.id);
      this.ctx!.strokeStyle = isSelected ? '#f5576c' : '#cbd5e1';
      this.ctx!.lineWidth = isSelected ? 3.5 : 2.5;
      this.ctx!.lineCap = 'round';
      this.ctx!.lineJoin = 'round';

      // 绘制连接线
      this.ctx!.beginPath();
      this.ctx!.moveTo(screenSourceX, screenSourceY);
      this.ctx!.lineTo(screenTargetX, screenTargetY);
      this.ctx!.stroke();

      // 点击检测（使用唯一颜色）
      if (this.options.enableClickDetection) {
        const color = this.generateColorForEdge(index);
        this.ctx!.strokeStyle = color;
        this.ctx!.lineWidth = this.options.clickAreaWidth;
        this.ctx!.beginPath();
        this.ctx!.moveTo(screenSourceX, screenSourceY);
        this.ctx!.lineTo(screenTargetX, screenTargetY);
        this.ctx!.stroke();
        this.clickMap.set(this.colorToNumber(color), edge.id);
      }
    });
  }

  /**
   * 检测点击的连接线
   * 
   * @param x 点击 X 坐标（屏幕坐标）
   * @param y 点击 Y 坐标（屏幕坐标）
   * @returns 被点击的连接线 ID，如果没有则返回 null
   */
  detectClick(x: number, y: number): string | null {
    if (!this.canvas || !this.ctx || !this.options.enableClickDetection) {
      return null;
    }

    // 获取点击位置的颜色
    const imageData = this.ctx.getImageData(x, y, 1, 1);
    const r = imageData.data[0];
    const g = imageData.data[1];
    const b = imageData.data[2];
    const colorNumber = (r << 16) | (g << 8) | b;

    return this.clickMap.get(colorNumber) || null;
  }

  /**
   * 为连接线生成唯一颜色
   * 
   * @param index 连接线索引
   * @returns 颜色字符串（RGB）
   */
  private generateColorForEdge(index: number): string {
    // 生成唯一的 RGB 颜色（避免使用 0,0,0 和 255,255,255）
    const r = ((index * 7) % 254) + 1;
    const g = ((index * 11) % 254) + 1;
    const b = ((index * 13) % 254) + 1;
    return `rgb(${r},${g},${b})`;
  }

  /**
   * 将颜色转换为数字（用于快速查找）
   * 
   * @param color 颜色字符串
   * @returns 颜色数字
   */
  private colorToNumber(color: string): number {
    const match = color.match(/rgb\((\d+),(\d+),(\d+)\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return (r << 16) | (g << 8) | b;
    }
    return 0;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.clickMap.clear();
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas?.width || 0, this.canvas?.height || 0);
    }
  }
}

