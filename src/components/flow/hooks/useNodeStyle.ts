/**
 * 节点样式管理 Hook
 *
 * 提供节点样式计算和缓存功能，避免不必要的 DOM 更新
 */

import type { CSSProperties } from 'vue';
import { type Ref } from 'vue';
import { PERFORMANCE_CONSTANTS } from '../constants/performance-constants';
import type { FlowNode } from '../types';
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
    draggingNodeId
  } = options;

  // 性能优化：使用缓存的 Set，避免每次计算都创建新 Set
  const selectedNodeIdsSet = useCachedSet(selectedNodeIds);

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
  const getNodeStyle = (node: FlowNode): CSSProperties => {
    // 节点使用原始画布坐标，缩放由父容器的 CSS transform 处理
    const x = node.position.x;
    const y = node.position.y;

    // 计算当前应该有的 zIndex
    const isSelected = selectedNodeIdsSet.value.has(node.id);
    const isDragging = draggingNodeId?.value === node.id;

    let zIndex: number | undefined;
    if (isDragging) {
      zIndex = 1000; // 拖拽节点最高层级
    } else if (isSelected) {
      zIndex = 2; // 选中节点次之
    }
    // 普通节点不设置 z-index，使用默认的 DOM 顺序（性能最优）

    const width = node.size?.width ?? PERFORMANCE_CONSTANTS.DEFAULT_NODE_WIDTH;
    const height = node.size?.height ?? PERFORMANCE_CONSTANTS.DEFAULT_NODE_HEIGHT;
    const cacheKey = `${node.id}-${x}-${y}-${width}-${height}-${zIndex ?? 'none'}`;

    const cached = styleCache.get(cacheKey);
    if (cached) return cached;

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

