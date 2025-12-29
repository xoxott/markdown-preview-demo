/**
 * Flow 配置工具函数
 *
 * 提供配置相关的工具函数：合并、验证、规范化、克隆等
 */

import type { FlowConfig, PartialFlowConfig } from '../types/flow-config';
import { DEFAULT_FLOW_CONFIG } from '../config/default-config';

/**
 * 深度合并配置
 *
 * 将源配置深度合并到目标配置中
 *
 * @param target 目标配置
 * @param source 源配置
 * @returns 合并后的配置
 */
export function mergeConfig(
  target: FlowConfig,
  source?: PartialFlowConfig
): FlowConfig {
  if (!source) {
    return { ...target };
  }

  const result: FlowConfig = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key as keyof FlowConfig];
      const targetValue = target[key as keyof FlowConfig];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        !(sourceValue instanceof Date) &&
        !(sourceValue instanceof RegExp)
      ) {
        // 深度合并对象
        result[key as keyof FlowConfig] = {
          ...targetValue,
          ...sourceValue
        } as any;
      } else if (sourceValue !== undefined) {
        // 直接赋值
        result[key as keyof FlowConfig] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * 规范化配置
 *
 * 将部分配置填充默认值，生成完整配置
 *
 * @param partialConfig 部分配置
 * @returns 完整配置
 */
export function normalizeConfig(
  partialConfig?: PartialFlowConfig
): FlowConfig {
  return mergeConfig(DEFAULT_FLOW_CONFIG, partialConfig);
}

/**
 * 深度克隆配置
 *
 * 创建配置的深拷贝
 *
 * @param config 要克隆的配置
 * @returns 克隆后的配置
 */
export function cloneConfig(config: FlowConfig): FlowConfig {
  return JSON.parse(JSON.stringify(config));
}

/**
 * 检查配置是否有效
 *
 * 验证配置的基本有效性（类型、范围等）
 *
 * @param config 要验证的配置
 * @returns 是否有效
 */
export function isValidConfig(config: any): config is FlowConfig {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // 验证画布配置
  if (config.canvas) {
    const canvas = config.canvas;
    if (
      canvas.minZoom !== undefined &&
      (typeof canvas.minZoom !== 'number' || canvas.minZoom < 0)
    ) {
      return false;
    }
    if (
      canvas.maxZoom !== undefined &&
      (typeof canvas.maxZoom !== 'number' || canvas.maxZoom <= canvas.minZoom)
    ) {
      return false;
    }
  }

  // 验证节点配置
  if (config.nodes) {
    const nodes = config.nodes;
    if (
      nodes.defaultWidth !== undefined &&
      (typeof nodes.defaultWidth !== 'number' || nodes.defaultWidth <= 0)
    ) {
      return false;
    }
    if (
      nodes.defaultHeight !== undefined &&
      (typeof nodes.defaultHeight !== 'number' || nodes.defaultHeight <= 0)
    ) {
      return false;
    }
  }

  // 验证连接线配置
  if (config.edges) {
    const edges = config.edges;
    if (
      edges.defaultStrokeWidth !== undefined &&
      (typeof edges.defaultStrokeWidth !== 'number' ||
        edges.defaultStrokeWidth <= 0)
    ) {
      return false;
    }
  }

  return true;
}

/**
 * 获取配置值（支持路径访问）
 *
 * 例如：getConfigValue(config, 'canvas.minZoom')
 *
 * @param config 配置对象
 * @param path 配置路径（用点分隔）
 * @returns 配置值
 */
export function getConfigValue(
  config: FlowConfig,
  path: string
): any {
  const keys = path.split('.');
  let value: any = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key as keyof typeof value];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * 设置配置值（支持路径访问）
 *
 * 例如：setConfigValue(config, 'canvas.minZoom', 0.2)
 *
 * @param config 配置对象
 * @param path 配置路径（用点分隔）
 * @param value 要设置的值
 */
export function setConfigValue(
  config: FlowConfig,
  path: string,
  value: any
): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  let target: any = config;

  for (const key of keys) {
    if (!target[key]) {
      target[key] = {};
    }
    target = target[key];
  }

  target[lastKey] = value;
}

