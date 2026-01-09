/**
 * 节点样式管理 Hook
 *
 * 提供节点样式计算和缓存功能，避免不必要的 DOM 更新
 */

import type { CSSProperties } from 'vue';
import { type Ref, computed, watch } from 'vue';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';
import type { FlowNode, FlowConfig } from '../types';
import { createCache } from '../utils/cache-utils';
import { useCachedSet } from '../utils/set-utils';

/**
 * 节点样式 Hook 选项
 */
export interface UseNodeStyleOptions {
  /** 节点列表 */
  nodes: Ref<FlowNode[]>;
  /** 选中的节点 ID 列表 */
  selectedNodeIds: Ref<string[]>;
  /** 正在拖拽的节点 ID */
  draggingNodeId?: Ref<string | null>;
  /** 已提升层级的节点 ID 映射（节点 ID -> z-index 值，包括拖拽释放和选中的节点） */
  elevatedNodeIds?: Ref<Map<string, number>>;
  /** 分配递增的 z-index（用于拖拽释放和选中节点） */
  allocateZIndex?: (nodeId: string) => number;
  /** 移除节点的 z-index */
  removeZIndex?: (nodeId: string) => void;
  /** 配置（用于判断是否启用拖拽后提升层级） */
  config?: Ref<Readonly<FlowConfig> | undefined>;
}

/**
 * 节点样式 Hook 返回值
 */
export interface UseNodeStyleReturn {
  /** 获取节点样式（带缓存） */
  getNodeStyle: (node: FlowNode) => CSSProperties;
  /** 清除缓存 */
  clearCache: () => void;
}

/**
 * 节点样式管理 Hook
 *
 * 自动计算节点样式并缓存，避免不必要的 DOM 更新
 *
 * @param options Hook 选项
 * @returns 节点样式相关功能
 *
 * @example
 * ```typescript
 * const { getNodeStyle } = useNodeStyle({
 *   nodes: nodesRef,
 *   selectedNodeIds: selectedNodeIdsRef,
 *   draggingNodeId: draggingNodeIdRef
 * });
 *
 * const style = getNodeStyle(node);
 * ```
 */
export function useNodeStyle(
  options: UseNodeStyleOptions
): UseNodeStyleReturn {
  const {
    nodes,
    selectedNodeIds,
    draggingNodeId,
    elevatedNodeIds,
    allocateZIndex,
    removeZIndex,
    config
  } = options;

  // 性能优化：使用缓存的 Set，避免每次计算都创建新 Set
  const selectedNodeIdsSet = useCachedSet(selectedNodeIds);

  // 是否启用拖拽后提升层级（默认启用，节点过多时可禁用）
  const elevateOnDragEnd = computed(() =>
    config?.value?.nodes?.elevateOnDragEnd !== false
  );

  // 监听选中节点变化，自动分配递增的 z-index（使用共享的计数器）
  watch(
    selectedNodeIds,
    (newSelectedIds, oldSelectedIds) => {
      if (!allocateZIndex || !removeZIndex) return;

      const oldSet = new Set(oldSelectedIds || []);
      const newSet = new Set(newSelectedIds || []);

      // 处理新增的选中节点
      for (const nodeId of newSet) {
        if (!oldSet.has(nodeId)) {
          // 新选中的节点，使用共享的分配函数
          allocateZIndex(nodeId);
        }
      }

      // 处理取消选中的节点
      for (const nodeId of oldSet) {
        if (!newSet.has(nodeId)) {
          // 取消选中的节点，移除 z-index
          removeZIndex(nodeId);
        }
      }
    },
    { immediate: true }
  );

  // 样式缓存（使用通用缓存工具）
  const styleCache = createCache<string, CSSProperties>({
    maxSize: PERFORMANCE_CONSTANTS.CACHE_MAX_SIZE,
    cleanupSize: PERFORMANCE_CONSTANTS.CACHE_CLEANUP_SIZE
  });

  /**
   * 获取节点样式（带缓存）
   *
   * @param node 节点
   * @returns 节点样式
   */
  // 性能优化：使用 WeakMap 缓存节点样式，避免字符串拼接开销
  const nodeStyleCache = new WeakMap<FlowNode, Map<string, CSSProperties>>();

  const getNodeStyle = (node: FlowNode): CSSProperties => {
    // 节点使用原始画布坐标，缩放由父容器的 CSS transform 处理
    const x = node.position.x;
    const y = node.position.y;

    // 计算当前应该有的 zIndex
    const isSelected = selectedNodeIdsSet.value.has(node.id);
    const isDragging = draggingNodeId?.value === node.id;

    // 获取节点的提升层级值（如果存在，包括拖拽释放和选中的节点）
    const elevatedZIndex = elevatedNodeIds?.value.get(node.id);

    // 计算节点的 z-index（按优先级：拖拽 > 已提升（包括选中和拖拽释放）> 普通）
    let zIndex: number | undefined;
    if (isDragging) {
      // 拖拽节点使用最高层级
      zIndex = PERFORMANCE_CONSTANTS.Z_INDEX_DRAGGING;
    } else if (elevatedZIndex !== undefined) {
      // 已提升层级的节点（包括拖拽结束后提升的节点和选中的节点）使用分配的递增 z-index
      zIndex = elevatedZIndex;
    } else {
      // 普通节点使用基础层级
      const renderBehindNodes = config?.value?.edges?.renderBehindNodes !== false;
      if (renderBehindNodes) {
        zIndex = PERFORMANCE_CONSTANTS.Z_INDEX_NODE_BASE;
      }
    }

    const width = node.size?.width ?? PERFORMANCE_CONSTANTS.DEFAULT_NODE_WIDTH;
    const height = node.size?.height ?? PERFORMANCE_CONSTANTS.DEFAULT_NODE_HEIGHT;

    // 性能优化：使用更高效的缓存键生成方式
    // 如果位置和尺寸没变化，使用简化的缓存键
    // 使用数字拼接，减少字符串模板开销
    const cacheKey = `${node.id}|${x}|${y}|${width}|${height}|${zIndex ?? 0}`;

    // 先检查通用缓存
    const cached = styleCache.get(cacheKey);
    if (cached) return cached;

    // 检查节点级别的缓存
    let nodeCache = nodeStyleCache.get(node);
    if (!nodeCache) {
      nodeCache = new Map();
      nodeStyleCache.set(node, nodeCache);
    }

    const nodeCached = nodeCache.get(cacheKey);
    if (nodeCached) {
      // 同时更新通用缓存
      styleCache.set(cacheKey, nodeCached);
      return nodeCached;
    }

    // 创建新样式对象
    const style: CSSProperties = {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: 'auto',
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      perspective: '1000px'
    };

    // 只在需要时添加 zIndex 属性
    if (zIndex !== undefined) {
      style.zIndex = zIndex;
    }

    // 缓存新样式对象
    styleCache.set(cacheKey, style);

    return style;
  };

  /**
   * 清除缓存
   */
  const clearCache = () => {
    styleCache.clear();
  };

  return {
    getNodeStyle,
    clearCache
  };
}

