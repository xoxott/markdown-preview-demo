/**
 * 视口裁剪 Hook
 *
 * 提供视口裁剪功能，支持空间索引优化和线性查找回退
 */

import { shallowRef, watch, computed, type Ref } from 'vue';
import type { FlowNode, FlowViewport } from '../types';
import type { SpatialIndex } from '../core/performance/SpatialIndex';

/**
 * 视口裁剪 Hook 选项
 */
export interface UseViewportCullingOptions {
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 视口状态 */
  viewport: Ref<FlowViewport>;
  /** 是否启用视口裁剪 */
  enabled: Ref<boolean> | (() => boolean) | boolean;
  /** 视口裁剪缓冲区（像素） */
  buffer?: number;
  /** 空间索引实例（可选，用于优化大量节点） */
  spatialIndex?: Ref<SpatialIndex>;
  /** 使用空间索引的节点数量阈值（默认 50） */
  spatialIndexThreshold?: number;
  /** 默认节点宽度 */
  defaultNodeWidth?: number;
  /** 默认节点高度 */
  defaultNodeHeight?: number;
}

/**
 * 视口裁剪 Hook 返回值
 */
export interface UseViewportCullingReturn {
  /** 可见节点列表（稳定引用，避免不必要的重新渲染） */
  visibleNodes: Ref<FlowNode[]>;
}

/**
 * 计算视口边界（画布坐标）
 *
 * @param viewport 视口状态
 * @param buffer 缓冲区（画布坐标）
 * @returns 视口边界
 */
function calculateViewportBounds(
  viewport: FlowViewport,
  buffer: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  // 获取视口区域（考虑缩放）
  const viewportX = -viewport.x / viewport.zoom;
  const viewportY = -viewport.y / viewport.zoom;
  const viewportWidth = (window.innerWidth || 1000) / viewport.zoom;
  const viewportHeight = (window.innerHeight || 1000) / viewport.zoom;

  // 扩展视口区域（添加缓冲区）
  return {
    minX: viewportX - buffer,
    minY: viewportY - buffer,
    maxX: viewportX + viewportWidth + buffer,
    maxY: viewportY + viewportHeight + buffer
  };
}

/**
 * 检查节点是否与视口相交（线性查找）
 *
 * @param node 节点
 * @param bounds 视口边界
 * @param defaultWidth 默认节点宽度
 * @param defaultHeight 默认节点高度
 * @returns 是否可见
 */
function isNodeVisible(
  node: FlowNode,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  defaultWidth: number,
  defaultHeight: number
): boolean {
  const nodeX = node.position.x;
  const nodeY = node.position.y;
  const nodeWidth = node.size?.width || defaultWidth;
  const nodeHeight = node.size?.height || defaultHeight;

  // 检查节点是否与视口相交
  return (
    nodeX + nodeWidth >= bounds.minX &&
    nodeX <= bounds.maxX &&
    nodeY + nodeHeight >= bounds.minY &&
    nodeY <= bounds.maxY
  );
}

/**
 * 视口裁剪 Hook
 *
 * 自动计算可见节点，支持空间索引优化
 *
 * @param options Hook 选项
 * @returns 可见节点列表
 *
 * @example
 * ```typescript
 * const { visibleNodes } = useViewportCulling({
 *   nodes: nodesRef,
 *   viewport: viewportRef,
 *   enabled: computed(() => enableCulling.value),
 *   spatialIndex: spatialIndexRef
 * });
 * ```
 */
export function useViewportCulling(
  options: UseViewportCullingOptions
): UseViewportCullingReturn {
  const {
    nodes,
    viewport,
    enabled,
    buffer = 200,
    spatialIndex,
    spatialIndexThreshold = 50,
    defaultNodeWidth = 220,
    defaultNodeHeight = 72
  } = options;

  // 稳定引用，避免不必要的重新渲染
  const visibleNodesRef = shallowRef<FlowNode[]>([]);
  const lastVisibleNodeIds = new Set<string>();

  /**
   * 检查是否启用
   */
  const isEnabled = (): boolean => {
    if (typeof enabled === 'boolean') return enabled;
    if (typeof enabled === 'function') return enabled();
    return enabled.value;
  };

  /**
   * 计算可见节点
   */
  const calculateVisibleNodes = (): FlowNode[] => {
    // 如果禁用视口裁剪，直接返回所有节点
    if (!isEnabled()) {
      return nodes.value;
    }

    // 计算视口边界（画布坐标）
    const bufferInCanvas = buffer / viewport.value.zoom;
    const bounds = calculateViewportBounds(viewport.value, bufferInCanvas);

    // 选择查询策略
    const useSpatialIndex =
      spatialIndex &&
      spatialIndex.value &&
      nodes.value.length > spatialIndexThreshold;

    let newVisibleNodes: FlowNode[];

    if (useSpatialIndex) {
      // 使用空间索引查询（性能提升 10-20 倍）
      newVisibleNodes = spatialIndex.value!.query({
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY
      });
    } else {
      // 节点数量少时使用线性查找（避免索引开销）
      newVisibleNodes = nodes.value.filter(node =>
        isNodeVisible(node, bounds, defaultNodeWidth, defaultNodeHeight)
      );
    }

    return newVisibleNodes;
  };

  /**
   * 更新可见节点（只有真正变化时才更新引用）
   */
  const updateVisibleNodes = () => {
    const newVisibleNodes = calculateVisibleNodes();
    const newIds = new Set(newVisibleNodes.map(n => n.id));

    // 如果数量不同，肯定变了
    if (newIds.size !== lastVisibleNodeIds.size) {
      visibleNodesRef.value = newVisibleNodes;
      lastVisibleNodeIds.clear();
      newIds.forEach(id => lastVisibleNodeIds.add(id));
      return;
    }

    // 检查是否有不同的节点 ID
    let hasChange = false;
    for (const id of newIds) {
      if (!lastVisibleNodeIds.has(id)) {
        hasChange = true;
        break;
      }
    }

    // 只有节点集合真正变化时才更新数组引用
    if (hasChange) {
      visibleNodesRef.value = newVisibleNodes;
      lastVisibleNodeIds.clear();
      newIds.forEach(id => lastVisibleNodeIds.add(id));
    }
    // 否则保持 visibleNodesRef.value 不变，Vue 不会触发 v-for 重新渲染
  };

  // 监听相关变化，更新可见节点
  watch(
    () => [
      nodes.value,
      isEnabled(),
      viewport.value.x,
      viewport.value.y,
      viewport.value.zoom,
      spatialIndex?.value
    ] as const,
    () => {
      updateVisibleNodes();
    },
    { immediate: true, deep: false }
  );

  return {
    visibleNodes: visibleNodesRef
  };
}

