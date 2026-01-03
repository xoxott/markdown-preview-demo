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
  CANVAS_RENDERING_THRESHOLD: 200
} as const;

