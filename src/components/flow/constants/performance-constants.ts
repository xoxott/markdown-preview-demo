/**
 * 性能相关常量
 *
 * 统一管理性能优化相关的配置常量
 */

/**
 * 性能优化常量
 */
export const PERFORMANCE_CONSTANTS = {
  /** 空间索引启用阈值（节点数量超过此值使用空间索引） */
  SPATIAL_INDEX_THRESHOLD: 50,
  /** 默认节点宽度 */
  DEFAULT_NODE_WIDTH: 220,
  /** 默认节点高度 */
  DEFAULT_NODE_HEIGHT: 72,
  /** 缓存最大大小 */
  CACHE_MAX_SIZE: 500,
  /** 缓存清理大小 */
  CACHE_CLEANUP_SIZE: 100,
  /** 视口裁剪默认缓冲区（像素） */
  VIEWPORT_CULLING_BUFFER: 200,
  /** Canvas 渲染阈值（连接线数量超过此值使用 Canvas） */
  CANVAS_RENDERING_THRESHOLD: 200,

  // ==================== 连接线位置缓存相关 ====================
  /** 连接线位置缓存默认最大大小 */
  EDGE_POSITION_CACHE_MAX_SIZE: 500,
  /** 连接线位置缓存默认清理大小 */
  EDGE_POSITION_CACHE_CLEANUP_SIZE: 250,
  /** 连接线位置缓存 TTL - 小规模场景（节点数 < 50） */
  EDGE_POSITION_CACHE_TTL_SMALL: 32, // 2 帧（16ms * 2）
  /** 连接线位置缓存 TTL - 中规模场景（节点数 50-500） */
  EDGE_POSITION_CACHE_TTL_MEDIUM: 16, // 1 帧（16ms）
  /** 连接线位置缓存 TTL - 大规模场景（节点数 >= 500） */
  EDGE_POSITION_CACHE_TTL_LARGE: 8, // 0.5 帧（16ms / 2）
  /** 连接线位置缓存节点数量阈值 - 小规模 */
  EDGE_POSITION_CACHE_NODE_THRESHOLD_SMALL: 50,
  /** 连接线位置缓存节点数量阈值 - 中规模 */
  EDGE_POSITION_CACHE_NODE_THRESHOLD_MEDIUM: 500,
  /** 拖拽时缓存 TTL 降低倍数 */
  EDGE_POSITION_CACHE_DRAGGING_TTL_DIVISOR: 2,

  // ==================== 缓存键生成相关 ====================
  /** 缩放值精度倍数（用于缓存键生成，1000 = 精确到小数点后 3 位） */
  ZOOM_PRECISION_MULTIPLIER: 1000,

  // ==================== 空间索引相关 ====================
  /** 空间索引哈希计算最大节点数（只计算前 N 个节点以提升性能） */
  SPATIAL_INDEX_HASH_MAX_NODES: 100,
  /** 空间索引增量更新阈值 - 小规模场景（节点数 < 100） */
  SPATIAL_INDEX_INCREMENTAL_THRESHOLD_SMALL: 0.2, // 20%
  /** 空间索引增量更新阈值 - 中规模场景（节点数 100-1000） */
  SPATIAL_INDEX_INCREMENTAL_THRESHOLD_MEDIUM: 0.1, // 10%
  /** 空间索引增量更新阈值 - 大规模场景（节点数 >= 1000） */
  SPATIAL_INDEX_INCREMENTAL_THRESHOLD_LARGE: 0.05, // 5%
  /** 空间索引节点数量阈值 - 小规模 */
  SPATIAL_INDEX_NODE_THRESHOLD_SMALL: 100,
  /** 空间索引节点数量阈值 - 中规模 */
  SPATIAL_INDEX_NODE_THRESHOLD_MEDIUM: 1000,
  /** 哈希计算位运算位移量（标准哈希算法使用 5） */
  HASH_SHIFT_BITS: 5,

  // ==================== Z-index 层级相关 ====================
  /** 拖拽节点的 z-index（最高层级，使用 CSS z-index 的最大值） */
  Z_INDEX_DRAGGING: 2147483647, // CSS z-index 的最大值（32位整数）
  /** 选中节点的 z-index（高于普通节点，但低于拖拽和已提升的节点） */
  Z_INDEX_SELECTED: 100,
  /** 普通节点的 z-index（基础层级，确保在连接线之上） */
  Z_INDEX_NODE_BASE: 1,
  /** 连接线的 z-index（在节点下方） */
  Z_INDEX_EDGE: 0,
  /** z-index 基础值（用于递增分配，拖拽结束后提升的节点从此值开始，需高于选中节点） */
  Z_INDEX_BASE: 1000
} as const;

