/**
 * 工作流配置系统
 * 
 * 提供全局配置管理，支持主题、样式、行为等自定义
 */

import type { DeepPartial } from '../types';

// ==================== 配置接口 ====================

/** 节点默认样式配置 */
export interface NodeStyleConfig {
  /** 默认宽度 */
  defaultWidth: number;
  /** 默认高度 */
  defaultHeight: number;
  /** 最小宽度 */
  minWidth: number;
  /** 最小高度 */
  minHeight: number;
  /** 边框宽度 */
  borderWidth: number;
  /** 圆角 */
  borderRadius: number;
  /** 端口大小 */
  portSize: number;
  /** 端口偏移 */
  portOffset: number;
  /** 端口间距 */
  portGap: number;
  /** 选中边框颜色 */
  selectedBorderColor: string;
  /** 锁定边框颜色 */
  lockedBorderColor: string;
  /** 错误边框颜色 */
  errorBorderColor: string;
  /** 成功边框颜色 */
  successBorderColor: string;
}

/** 连接线默认样式配置 */
export interface ConnectionStyleConfig {
  /** 默认渲染策略 */
  defaultStrategy: 'bezier' | 'straight' | 'step' | 'smooth-step';
  /** 默认线条宽度 */
  defaultStrokeWidth: number;
  /** 选中线条宽度 */
  selectedStrokeWidth: number;
  /** 悬停线条宽度 */
  hoverStrokeWidth: number;
  /** 默认线条颜色 */
  defaultStrokeColor: string;
  /** 选中线条颜色 */
  selectedStrokeColor: string;
  /** 点击区域宽度 */
  clickAreaWidth: number;
  /** 贝塞尔曲线控制点偏移比例 */
  bezierControlOffset: number;
  /** 步进线圆角半径 */
  stepRadius: number;
  /** 箭头大小 */
  arrowSize: number;
  /** 是否显示箭头 */
  showArrow: boolean;
  /** 动画速度（秒） */
  animationDuration: number;
}

/** 画布配置 */
export interface CanvasStyleConfig {
  /** 背景颜色 */
  backgroundColor: string;
  /** 背景颜色（暗色模式） */
  backgroundColorDark: string;
  /** 网格颜色 */
  gridColor: string;
  /** 网格大小 */
  gridSize: number;
  /** 网格透明度 */
  gridOpacity: number;
  /** 是否启用网格吸附 */
  gridSnap: boolean;
  /** 最小缩放 */
  minZoom: number;
  /** 最大缩放 */
  maxZoom: number;
  /** 缩放步长 */
  zoomStep: number;
  /** 默认缩放 */
  defaultZoom: number;
}

/** 交互行为配置 */
export interface InteractionConfig {
  /** 是否启用多选 */
  enableMultiSelection: boolean;
  /** 多选快捷键 */
  multiSelectionKey: 'ctrl' | 'shift' | 'meta';
  /** 是否启用框选 */
  enableBoxSelection: boolean;
  /** 框选快捷键 */
  boxSelectionKey: 'shift' | 'alt';
  /** 是否启用右键菜单 */
  enableContextMenu: boolean;
  /** 是否启用拖拽画布 */
  enableCanvasPan: boolean;
  /** 是否启用滚轮缩放 */
  enableWheelZoom: boolean;
  /** 拖拽阈值（像素） */
  dragThreshold: number;
  /** 双击延迟（毫秒） */
  doubleClickDelay: number;
}

/** 性能配置 */
export interface PerformanceConfig {
  /** 是否启用 RAF 节流 */
  enableRAFThrottle: boolean;
  /** 是否启用虚拟滚动 */
  enableVirtualScroll: boolean;
  /** 虚拟滚动缓冲区 */
  virtualScrollBuffer: number;
  /** 是否启用 GPU 加速 */
  enableGPUAcceleration: boolean;
  /** 历史记录最大数量 */
  maxHistorySize: number;
}

/** 主题配置 */
export interface ThemeConfig {
  /** 主题模式 */
  mode: 'light' | 'dark' | 'auto';
  /** 主色调 */
  primaryColor: string;
  /** 成功色 */
  successColor: string;
  /** 警告色 */
  warningColor: string;
  /** 错误色 */
  errorColor: string;
  /** 信息色 */
  infoColor: string;
  /** 字体族 */
  fontFamily: string;
  /** 字体大小 */
  fontSize: number;
  /** 圆角大小 */
  borderRadius: number;
  /** 阴影 */
  boxShadow: string;
}

/** 完整的工作流配置 */
export interface WorkflowConfig {
  /** 节点样式配置 */
  nodeStyle: NodeStyleConfig;
  /** 连接线样式配置 */
  connectionStyle: ConnectionStyleConfig;
  /** 画布配置 */
  canvasStyle: CanvasStyleConfig;
  /** 交互配置 */
  interaction: InteractionConfig;
  /** 性能配置 */
  performance: PerformanceConfig;
  /** 主题配置 */
  theme: ThemeConfig;
}

// ==================== 默认配置 ====================

/** 默认节点样式配置 */
export const DEFAULT_NODE_STYLE_CONFIG: NodeStyleConfig = {
  defaultWidth: 220,
  defaultHeight: 72,
  minWidth: 180,
  minHeight: 60,
  borderWidth: 2,
  borderRadius: 8,
  portSize: 20,
  portOffset: 10,
  portGap: 10,
  selectedBorderColor: '#2080f0',
  lockedBorderColor: '#f59e0b',
  errorBorderColor: '#d03050',
  successBorderColor: '#18a058'
};

/** 默认连接线样式配置 */
export const DEFAULT_CONNECTION_STYLE_CONFIG: ConnectionStyleConfig = {
  defaultStrategy: 'bezier',
  defaultStrokeWidth: 2.5,
  selectedStrokeWidth: 3.5,
  hoverStrokeWidth: 3,
  defaultStrokeColor: '#cbd5e1',
  selectedStrokeColor: '#f5576c',
  clickAreaWidth: 24,
  bezierControlOffset: 0.5,
  stepRadius: 10,
  arrowSize: 10,
  showArrow: true,
  animationDuration: 1.5
};

/** 默认画布配置 */
export const DEFAULT_CANVAS_STYLE_CONFIG: CanvasStyleConfig = {
  backgroundColor: '#f8fafc',
  backgroundColorDark: '#1a1a1a',
  gridColor: '#e2e8f0',
  gridSize: 20,
  gridOpacity: 0.5,
  gridSnap: false,
  minZoom: 0.1,
  maxZoom: 3,
  zoomStep: 0.1,
  defaultZoom: 1
};

/** 默认交互配置 */
export const DEFAULT_INTERACTION_CONFIG: InteractionConfig = {
  enableMultiSelection: true,
  multiSelectionKey: 'ctrl',
  enableBoxSelection: true,
  boxSelectionKey: 'shift',
  enableContextMenu: true,
  enableCanvasPan: true,
  enableWheelZoom: true,
  dragThreshold: 3,
  doubleClickDelay: 300
};

/** 默认性能配置 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableRAFThrottle: true,
  enableVirtualScroll: false,
  virtualScrollBuffer: 200,
  enableGPUAcceleration: true,
  maxHistorySize: 50
};

/** 默认主题配置 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  mode: 'light',
  primaryColor: '#2080f0',
  successColor: '#18a058',
  warningColor: '#f0a020',
  errorColor: '#d03050',
  infoColor: '#70c0e8',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: 14,
  borderRadius: 8,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
};

/** 默认完整配置 */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  nodeStyle: DEFAULT_NODE_STYLE_CONFIG,
  connectionStyle: DEFAULT_CONNECTION_STYLE_CONFIG,
  canvasStyle: DEFAULT_CANVAS_STYLE_CONFIG,
  interaction: DEFAULT_INTERACTION_CONFIG,
  performance: DEFAULT_PERFORMANCE_CONFIG,
  theme: DEFAULT_THEME_CONFIG
};

// ==================== 配置管理器 ====================

/**
 * 工作流配置管理器
 * 单例模式，全局共享配置
 */
export class WorkflowConfigManager {
  private static instance: WorkflowConfigManager;
  private config: WorkflowConfig;
  private listeners: Set<(config: WorkflowConfig) => void> = new Set();

  private constructor(initialConfig?: DeepPartial<WorkflowConfig>) {
    this.config = this.mergeConfig(DEFAULT_WORKFLOW_CONFIG, initialConfig);
  }

  /**
   * 获取单例实例
   */
  static getInstance(initialConfig?: DeepPartial<WorkflowConfig>): WorkflowConfigManager {
    if (!WorkflowConfigManager.instance) {
      WorkflowConfigManager.instance = new WorkflowConfigManager(initialConfig);
    }
    return WorkflowConfigManager.instance;
  }

  /**
   * 获取完整配置
   */
  getConfig(): Readonly<WorkflowConfig> {
    return Object.freeze({ ...this.config });
  }

  /**
   * 获取节点样式配置
   */
  getNodeStyleConfig(): Readonly<NodeStyleConfig> {
    return Object.freeze({ ...this.config.nodeStyle });
  }

  /**
   * 获取连接线样式配置
   */
  getConnectionStyleConfig(): Readonly<ConnectionStyleConfig> {
    return Object.freeze({ ...this.config.connectionStyle });
  }

  /**
   * 获取画布配置
   */
  getCanvasStyleConfig(): Readonly<CanvasStyleConfig> {
    return Object.freeze({ ...this.config.canvasStyle });
  }

  /**
   * 获取交互配置
   */
  getInteractionConfig(): Readonly<InteractionConfig> {
    return Object.freeze({ ...this.config.interaction });
  }

  /**
   * 获取性能配置
   */
  getPerformanceConfig(): Readonly<PerformanceConfig> {
    return Object.freeze({ ...this.config.performance });
  }

  /**
   * 获取主题配置
   */
  getThemeConfig(): Readonly<ThemeConfig> {
    return Object.freeze({ ...this.config.theme });
  }

  /**
   * 更新配置
   */
  updateConfig(partialConfig: DeepPartial<WorkflowConfig>): void {
    this.config = this.mergeConfig(this.config, partialConfig);
    this.notifyListeners();
  }

  /**
   * 重置配置为默认值
   */
  resetConfig(): void {
    this.config = { ...DEFAULT_WORKFLOW_CONFIG };
    this.notifyListeners();
  }

  /**
   * 订阅配置变化
   */
  subscribe(listener: (config: WorkflowConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const config = this.getConfig();
    this.listeners.forEach(listener => listener(config));
  }

  /**
   * 深度合并配置
   */
  private mergeConfig(
    target: WorkflowConfig,
    source?: DeepPartial<WorkflowConfig>
  ): WorkflowConfig {
    if (!source) return { ...target };

    const result = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key as keyof WorkflowConfig];
        const targetValue = target[key as keyof WorkflowConfig];

        if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
          result[key as keyof WorkflowConfig] = {
            ...targetValue,
            ...sourceValue
          } as any;
        } else if (sourceValue !== undefined) {
          result[key as keyof WorkflowConfig] = sourceValue as any;
        }
      }
    }

    return result;
  }
}

// 导出单例访问函数
export const getWorkflowConfig = () => WorkflowConfigManager.getInstance();

