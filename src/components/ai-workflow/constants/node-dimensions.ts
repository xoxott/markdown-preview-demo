/**
 * 节点尺寸常量配置
 * 与 BaseNode 组件保持一致
 */

export const NODE_DIMENSIONS = {
  WIDTH: 220,
  HEIGHT: 72,
  PORT_SIZE: 20,  // 端口尺寸：14px内容 + 3px边框×2
  PORT_OFFSET: 10,
  PORT_GAP: 10,
  // 实际测量发现节点被缩放到了80%（176/220=0.8）
  // 端口实际位置：距离节点左边缘178.4px ≈ 220 * 0.8 + 2.4
  ACTUAL_SCALE: 0.8  // 节点的实际渲染缩放比例
} as const;

/**
 * 预计算的常量（性能优化）
 */
export const PORT_RADIUS = NODE_DIMENSIONS.PORT_SIZE / 2;
export const PORT_OFFSET_SCALED = NODE_DIMENSIONS.PORT_OFFSET;
export const NODE_WIDTH = NODE_DIMENSIONS.WIDTH;
export const NODE_HEIGHT = NODE_DIMENSIONS.HEIGHT;
export const PORT_SIZE = NODE_DIMENSIONS.PORT_SIZE;
export const PORT_GAP = NODE_DIMENSIONS.PORT_GAP;

