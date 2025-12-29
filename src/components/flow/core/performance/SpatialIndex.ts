/**
 * Flow 空间索引
 *
 * 使用 R-Tree 实现高效的空间查询
 * 将节点查询从 O(n) 优化到 O(log n)
 */

import RBush from 'rbush';
import type { FlowNode } from '../../types/flow-node';
import type { ViewportBounds } from './ViewportCuller';

/**
 * R-Tree 数据项
 */
interface RTreeItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  node: FlowNode;
}

/**
 * 空间索引选项
 */
export interface SpatialIndexOptions {
  /** 默认节点宽度 */
  defaultWidth?: number;
  /** 默认节点高度 */
  defaultHeight?: number;
}

/**
 * 空间索引类
 *
 * 使用 R-Tree 数据结构实现高效的空间查询
 */
export class SpatialIndex {
  /** R-Tree 实例 */
  private tree: RBush<RTreeItem>;

  /** 配置选项 */
  private options: Required<SpatialIndexOptions>;

  /** 节点映射（用于快速查找） */
  private nodeMap: Map<string, FlowNode>;

  /** R-Tree 项映射（用于增量更新） */
  private itemMap: Map<string, RTreeItem>;

  constructor(options: SpatialIndexOptions = {}) {
    this.tree = new RBush<RTreeItem>();
    this.options = {
      defaultWidth: options.defaultWidth || 220,
      defaultHeight: options.defaultHeight || 72,
    };
    this.nodeMap = new Map();
    this.itemMap = new Map();
  }

  /**
   * 更新节点索引（全量更新）
   *
   * @param nodes 节点列表
   */
  updateNodes(nodes: FlowNode[]): void {
    // 清空现有索引
    this.tree.clear();
    this.nodeMap.clear();
    this.itemMap.clear();

    // 批量加载节点到 R-Tree
    const items: RTreeItem[] = nodes.map(node => {
      this.nodeMap.set(node.id, node);

      const item: RTreeItem = {
        minX: node.position.x,
        minY: node.position.y,
        maxX: node.position.x + (node.size?.width || this.options.defaultWidth),
        maxY: node.position.y + (node.size?.height || this.options.defaultHeight),
        node,
      };

      this.itemMap.set(node.id, item);
      return item;
    });

    // 批量加载比逐个插入快很多
    this.tree.load(items);
  }

  /**
   * ✅ 性能优化：增量更新单个节点
   *
   * 只更新变化的节点，不重建整个索引
   * 性能: O(log n) vs O(n log n)
   *
   * @param node 要更新的节点
   */
  updateNode(node: FlowNode): void {
    const oldItem = this.itemMap.get(node.id);

    // 如果节点已存在，先从 R-Tree 中删除旧的边界
    if (oldItem) {
      this.tree.remove(oldItem);
    }

    // 创建新的边界
    const newItem: RTreeItem = {
      minX: node.position.x,
      minY: node.position.y,
      maxX: node.position.x + (node.size?.width || this.options.defaultWidth),
      maxY: node.position.y + (node.size?.height || this.options.defaultHeight),
      node,
    };

    // 插入新的边界到 R-Tree
    this.tree.insert(newItem);

    // 更新映射
    this.nodeMap.set(node.id, node);
    this.itemMap.set(node.id, newItem);
  }

  /**
   * ✅ 性能优化：批量增量更新多个节点
   *
   * @param nodes 所有节点列表
   * @param changedNodeIds 变化的节点 ID 集合（如果为空则全量更新）
   */
  batchUpdateNodes(nodes: FlowNode[], changedNodeIds?: Set<string>): void {
    if (!changedNodeIds || changedNodeIds.size === 0) {
      // 没有指定变化的节点，执行全量更新
      this.updateNodes(nodes);
      return;
    }

    // 增量更新：只更新变化的节点
    nodes.forEach(node => {
      if (changedNodeIds.has(node.id)) {
        this.updateNode(node);
      }
    });
  }

  /**
   * 查询视口内的节点
   *
   * @param bounds 视口边界
   * @returns 视口内的节点列表
   */
  query(bounds: ViewportBounds): FlowNode[] {
    const items = this.tree.search(bounds);
    return items.map(item => item.node);
  }

  /**
   * 查询与矩形区域相交的节点
   *
   * @param x 矩形左上角 X 坐标
   * @param y 矩形左上角 Y 坐标
   * @param width 矩形宽度
   * @param height 矩形高度
   * @returns 相交的节点列表
   */
  queryRect(x: number, y: number, width: number, height: number): FlowNode[] {
    const items = this.tree.search({
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height
    });
    return items.map(item => item.node);
  }

  /**
   * 查询包含指定点的节点
   *
   * @param x 点的 X 坐标
   * @param y 点的 Y 坐标
   * @returns 包含该点的节点列表
   */
  queryPoint(x: number, y: number): FlowNode[] {
    const items = this.tree.search({
      minX: x,
      minY: y,
      maxX: x,
      maxY: y
    });
    return items.map(item => item.node);
  }

  /**
   * 查询与指定节点相交的其他节点
   *
   * @param nodeId 节点 ID
   * @returns 相交的节点列表（不包括自身）
   */
  queryIntersecting(nodeId: string): FlowNode[] {
    const node = this.nodeMap.get(nodeId);
    if (!node) return [];

    const bounds = {
      minX: node.position.x,
      minY: node.position.y,
      maxX: node.position.x + (node.size?.width || this.options.defaultWidth),
      maxY: node.position.y + (node.size?.height || this.options.defaultHeight)
    };

    const items = this.tree.search(bounds);
    return items
      .map(item => item.node)
      .filter(n => n.id !== nodeId);
  }

  /**
   * 查询指定节点附近的节点
   *
   * @param nodeId 节点 ID
   * @param distance 距离（像素）
   * @returns 附近的节点列表（不包括自身）
   */
  queryNearby(nodeId: string, distance: number): FlowNode[] {
    const node = this.nodeMap.get(nodeId);
    if (!node) return [];

    const bounds = {
      minX: node.position.x - distance,
      minY: node.position.y - distance,
      maxX: node.position.x + (node.size?.width || this.options.defaultWidth) + distance,
      maxY: node.position.y + (node.size?.height || this.options.defaultHeight) + distance
    };

    const items = this.tree.search(bounds);
    return items
      .map(item => item.node)
      .filter(n => n.id !== nodeId);
  }

  /**
   * 获取节点总数
   *
   * @returns 节点数量
   */
  size(): number {
    return this.nodeMap.size;
  }

  /**
   * 检查节点是否存在
   *
   * @param nodeId 节点 ID
   * @returns 是否存在
   */
  has(nodeId: string): boolean {
    return this.nodeMap.has(nodeId);
  }

  /**
   * 获取节点
   *
   * @param nodeId 节点 ID
   * @returns 节点数据
   */
  get(nodeId: string): FlowNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.tree.clear();
    this.nodeMap.clear();
    this.itemMap.clear();
  }

  /**
   * 获取所有节点
   *
   * @returns 所有节点列表
   */
  all(): FlowNode[] {
    return Array.from(this.nodeMap.values());
  }

  /**
   * 获取索引边界
   *
   * @returns 索引的最小外接矩形
   */
  getBounds(): ViewportBounds | null {
    const data = this.tree.toJSON();
    if (!data || !data.children || data.children.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const traverse = (node: any) => {
      if (node.minX !== undefined) {
        minX = Math.min(minX, node.minX);
        minY = Math.min(minY, node.minY);
        maxX = Math.max(maxX, node.maxX);
        maxY = Math.max(maxY, node.maxY);
      }
      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(data);

    if (minX === Infinity) return null;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    } as ViewportBounds;
  }
}

