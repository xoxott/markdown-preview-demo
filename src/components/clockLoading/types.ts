import { CSSProperties } from 'vue';

/**
 * ClockLoading 组件的属性接口
 */
export interface ClockLoadingProps {
  /**
   * 整体尺寸(px)
   * @default 50
   */
  size?: number;

  /**
   * 上方显示的文字
   * @default '请稍等'
   */
  text?: string;

  /**
   * 主题颜色(支持任何CSS颜色值)
   * @default '#4da6ff'
   */
  color?: string;

  /**
   * 是否显示文字
   * @default true
   */
  showText?: boolean;

  /**
   * 旋转速度(秒/圈)
   * 数值越小旋转越快
   * @default 2
   * @range 1-10
   */
  speed?: number;

  /**
   * 背景颜色
   * @default 'transparent'
   */
  background?: string;

  /**
   * 是否显示背景
   * @default false
   */
  showBackground?: boolean;

  /**
   * 自定义容器样式
   */
  containerStyle?: CSSProperties;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 表盘背景色
   * @default '#ffffff'
   */
  clockBg?: string;

  /**
   * 表盘边框色
   * @default '#d0d0d0'
   */
  clockBorder?: string;
}

/**
 * 预设主题颜色
 */
export const THEME_COLORS = {
  /** 蓝色(默认) */
  blue: '#4da6ff',
  /** 绿色 */
  green: '#52c41a',
  /** 红色 */
  red: '#ff4d4f',
  /** 紫色 */
  purple: '#722ed1',
  /** 橙色 */
  orange: '#fa8c16',
  /** 青色 */
  cyan: '#13c2c2',
  /** 粉色 */
  pink: '#eb2f96',
  /** 金色 */
  gold: '#faad14',
} as const;

/**
 * 预设速度
 */
export const SPEED_PRESETS = {
  /** 极速 - 1秒/圈 */
  fast: 1,
  /** 标准 - 2秒/圈 */
  normal: 2,
  /** 慢速 - 4秒/圈 */
  slow: 4,
} as const;

/**
 * 预设尺寸
 */
export const SIZE_PRESETS = {
  /** 小 - 30px */
  small: 30,
  /** 中 - 50px */
  medium: 50,
  /** 大 - 80px */
  large: 80,
  /** 超大 - 120px */
  xlarge: 120,
} as const;

