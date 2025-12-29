/**
 * Flow 配置验证器
 *
 * 提供配置验证功能，包括类型验证、范围验证、依赖验证等
 */

import type { FlowConfig } from '../types/flow-config';
import {
  validateConfig,
  validateConnection,
  validateNode,
  validateEdge,
  type ConfigValidationResult
} from '../utils/validation-utils';

/**
 * Flow 配置验证器类
 *
 * 提供完整的配置验证功能
 */
export class FlowConfigValidator {
  /**
   * 验证配置
   *
   * @param config 要验证的配置
   * @returns 验证结果
   */
  validate(config: FlowConfig): ConfigValidationResult {
    return validateConfig(config);
  }

  /**
   * 验证配置并抛出异常（如果无效）
   *
   * @param config 要验证的配置
   * @throws 如果配置无效，抛出包含错误信息的异常
   */
  validateOrThrow(config: FlowConfig): void {
    const result = this.validate(config);
    if (!result.valid) {
      throw new Error(
        `Invalid config: ${result.errors.join(', ')}`
      );
    }
  }

  /**
   * 验证连接
   *
   * @param connection 连接数据
   * @param config 配置
   * @returns 验证结果
   */
  async validateConnection(
    connection: Partial<import('../types/flow-edge').FlowEdge>,
    config: FlowConfig
  ): Promise<{ valid: boolean; reason?: string }> {
    return validateConnection(connection, config);
  }

  /**
   * 验证节点
   *
   * @param node 节点数据
   * @returns 是否有效
   */
  validateNode(node: any): boolean {
    return validateNode(node);
  }

  /**
   * 验证连接线
   *
   * @param edge 连接线数据
   * @returns 是否有效
   */
  validateEdge(edge: any): boolean {
    return validateEdge(edge);
  }

  /**
   * 验证配置的特定部分
   *
   * @param config 配置
   * @param section 要验证的部分（如 'canvas', 'nodes' 等）
   * @returns 验证结果
   */
  validateSection(
    config: FlowConfig,
    section: keyof FlowConfig
  ): ConfigValidationResult {
    const sectionConfig = { [section]: config[section] } as FlowConfig;
    return this.validate(sectionConfig);
  }
}

/**
 * 创建验证器实例
 */
export function createFlowConfigValidator(): FlowConfigValidator {
  return new FlowConfigValidator();
}

