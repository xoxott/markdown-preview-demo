/**
 * Flow 配置 Hook
 *
 * 提供 Vue 3 Composition API 的配置管理 Hook
 * 封装配置的创建、获取、更新、订阅等功能
 */

import { computed, onUnmounted, ref, type Ref } from 'vue';
import {
  FlowConfigManager,
  createFlowConfigManager,
  getGlobalConfigManager
} from '../config/FlowConfigManager';
import type { FlowConfig, PartialFlowConfig } from '../types/flow-config';

/**
 * useFlowConfig 选项
 */
export interface UseFlowConfigOptions {
  /** 配置实例 ID（如果不提供，会自动生成） */
  id?: string;
  /** 初始配置 */
  initialConfig?: PartialFlowConfig;
  /** 是否使用全局配置管理器（默认 true） */
  useGlobalManager?: boolean;
  /** 自定义配置管理器（如果提供，会使用此管理器而不是全局管理器） */
  configManager?: FlowConfigManager;
  /** 是否自动创建实例（如果实例不存在，默认 true） */
  autoCreate?: boolean;
}

/**
 * useFlowConfig 返回值
 */
export interface UseFlowConfigReturn {
  /** 配置实例 ID */
  id: string;
  /** 当前配置（响应式） */
  config: Ref<Readonly<FlowConfig>>;
  /** 配置管理器 */
  manager: FlowConfigManager;
  /** 更新配置 */
  updateConfig: (partialConfig: PartialFlowConfig) => void;
  /** 重置配置 */
  resetConfig: () => void;
  /** 获取配置的特定部分 */
  getCanvasConfig: () => Readonly<FlowConfig['canvas']>;
  getNodeConfig: () => Readonly<FlowConfig['nodes']>;
  getEdgeConfig: () => Readonly<FlowConfig['edges']>;
  getInteractionConfig: () => Readonly<FlowConfig['interaction']>;
  getPerformanceConfig: () => Readonly<FlowConfig['performance']>;
  getThemeConfig: () => Readonly<FlowConfig['theme']>;
}

/**
 * 生成唯一的配置实例 ID
 */
let instanceIdCounter = 0;
function generateInstanceId(): string {
  return `flow-config-${Date.now()}-${++instanceIdCounter}`;
}

/**
 * Flow 配置 Hook
 *
 * 提供响应式的配置管理功能
 *
 * @param options Hook 选项
 * @returns 配置相关的响应式数据和方法
 *
 * @example
 * ```typescript
 * const { config, updateConfig } = useFlowConfig({
 *   id: 'my-canvas',
 *   initialConfig: {
 *     canvas: { minZoom: 0.1, maxZoom: 4 },
 *     nodes: { draggable: true }
 *   }
 * });
 *
 * // 响应式访问配置
 * console.log(config.value.canvas.minZoom);
 *
 * // 更新配置
 * updateConfig({ canvas: { minZoom: 0.2 } });
 * ```
 */
export function useFlowConfig(
  options: UseFlowConfigOptions = {}
): UseFlowConfigReturn {
  const {
    id: providedId,
    initialConfig,
    useGlobalManager = true,
    configManager: customManager,
    autoCreate = true
  } = options;

  // 确定配置管理器
  const manager =
    customManager ||
    (useGlobalManager ? getGlobalConfigManager() : createFlowConfigManager());

  // 确定配置实例 ID
  const instanceId = providedId || generateInstanceId();

  // 创建或获取配置实例
  if (autoCreate && !manager.hasInstance(instanceId)) {
    manager.createInstance(instanceId, initialConfig);
  }

  // 响应式配置
  const config = ref<Readonly<FlowConfig>>(
    manager.getConfig(instanceId)
  ) as Ref<Readonly<FlowConfig>>;

  // 订阅配置变化
  const unsubscribe = manager.subscribe(instanceId, newConfig => {
    config.value = newConfig;
  });

  // 组件卸载时清理
  onUnmounted(() => {
    unsubscribe();
  });

  // 更新配置方法
  const updateConfig = (partialConfig: PartialFlowConfig) => {
    manager.updateConfig(instanceId, partialConfig);
  };

  // 重置配置方法
  const resetConfig = () => {
    manager.resetConfig(instanceId);
  };

  // 获取配置的特定部分（计算属性）
  const getCanvasConfig = () => {
    return computed(() => config.value.canvas).value;
  };

  const getNodeConfig = () => {
    return computed(() => config.value.nodes).value;
  };

  const getEdgeConfig = () => {
    return computed(() => config.value.edges).value;
  };

  const getInteractionConfig = () => {
    return computed(() => config.value.interaction).value;
  };

  const getPerformanceConfig = () => {
    return computed(() => config.value.performance).value;
  };

  const getThemeConfig = () => {
    return computed(() => config.value.theme).value;
  };

  return {
    id: instanceId,
    config,
    manager,
    updateConfig,
    resetConfig,
    getCanvasConfig,
    getNodeConfig,
    getEdgeConfig,
    getInteractionConfig,
    getPerformanceConfig,
    getThemeConfig
  };
}

/**
 * 使用默认配置的 Hook
 *
 * 快速创建一个使用默认配置的实例
 *
 * @param id 配置实例 ID（可选）
 * @returns 配置相关的响应式数据和方法
 */
export function useDefaultFlowConfig(id?: string): UseFlowConfigReturn {
  return useFlowConfig({ id, initialConfig: {} });
}

