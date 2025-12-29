/**
 * Flow 验证工具函数
 *
 * 提供配置和数据验证相关的工具函数
 */

import type { FlowConfig } from '../types/flow-config';
import type { FlowEdge } from '../types/flow-edge';

/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
}

/**
 * 验证配置
 *
 * 检查配置的完整性和有效性
 *
 * @param config 要验证的配置
 * @returns 验证结果
 */
export function validateConfig(
  config: FlowConfig
): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 验证画布配置
  if (config.canvas) {
    const canvas = config.canvas;

    if (canvas.minZoom !== undefined) {
      if (typeof canvas.minZoom !== 'number') {
        errors.push('canvas.minZoom must be a number');
      } else if (canvas.minZoom < 0) {
        errors.push('canvas.minZoom must be >= 0');
      }
    }

    if (canvas.maxZoom !== undefined) {
      if (typeof canvas.maxZoom !== 'number') {
        errors.push('canvas.maxZoom must be a number');
      } else if (canvas.maxZoom <= 0) {
        errors.push('canvas.maxZoom must be > 0');
      }
    }

    if (
      canvas.minZoom !== undefined &&
      canvas.maxZoom !== undefined &&
      canvas.minZoom >= canvas.maxZoom
    ) {
      errors.push('canvas.minZoom must be < canvas.maxZoom');
    }

    if (canvas.defaultZoom !== undefined) {
      if (typeof canvas.defaultZoom !== 'number') {
        errors.push('canvas.defaultZoom must be a number');
      } else if (canvas.defaultZoom <= 0) {
        errors.push('canvas.defaultZoom must be > 0');
      } else if (
        canvas.minZoom !== undefined &&
        canvas.defaultZoom < canvas.minZoom
      ) {
        errors.push(
          'canvas.defaultZoom must be >= canvas.minZoom'
        );
      } else if (
        canvas.maxZoom !== undefined &&
        canvas.defaultZoom > canvas.maxZoom
      ) {
        errors.push(
          'canvas.defaultZoom must be <= canvas.maxZoom'
        );
      }
    }

    if (canvas.gridSize !== undefined) {
      if (typeof canvas.gridSize !== 'number' || canvas.gridSize <= 0) {
        errors.push('canvas.gridSize must be a positive number');
      }
    }

    if (canvas.gridOpacity !== undefined) {
      if (
        typeof canvas.gridOpacity !== 'number' ||
        canvas.gridOpacity < 0 ||
        canvas.gridOpacity > 1
      ) {
        errors.push('canvas.gridOpacity must be between 0 and 1');
      }
    }
  }

  // 验证节点配置
  if (config.nodes) {
    const nodes = config.nodes;

    if (nodes.defaultWidth !== undefined) {
      if (typeof nodes.defaultWidth !== 'number' || nodes.defaultWidth <= 0) {
        errors.push('nodes.defaultWidth must be a positive number');
      }
    }

    if (nodes.defaultHeight !== undefined) {
      if (
        typeof nodes.defaultHeight !== 'number' ||
        nodes.defaultHeight <= 0
      ) {
        errors.push('nodes.defaultHeight must be a positive number');
      }
    }

    if (nodes.minWidth !== undefined && nodes.defaultWidth !== undefined) {
      if (nodes.minWidth > nodes.defaultWidth) {
        warnings.push(
          'nodes.minWidth is greater than nodes.defaultWidth, this may cause issues'
        );
      }
    }

    if (nodes.minHeight !== undefined && nodes.defaultHeight !== undefined) {
      if (nodes.minHeight > nodes.defaultHeight) {
        warnings.push(
          'nodes.minHeight is greater than nodes.defaultHeight, this may cause issues'
        );
      }
    }

    if (nodes.portSize !== undefined) {
      if (typeof nodes.portSize !== 'number' || nodes.portSize <= 0) {
        errors.push('nodes.portSize must be a positive number');
      }
    }
  }

  // 验证连接线配置
  if (config.edges) {
    const edges = config.edges;

    if (edges.defaultStrokeWidth !== undefined) {
      if (
        typeof edges.defaultStrokeWidth !== 'number' ||
        edges.defaultStrokeWidth <= 0
      ) {
        errors.push('edges.defaultStrokeWidth must be a positive number');
      }
    }

    if (edges.arrowSize !== undefined) {
      if (typeof edges.arrowSize !== 'number' || edges.arrowSize <= 0) {
        errors.push('edges.arrowSize must be a positive number');
      }
    }

    if (edges.bezierControlOffset !== undefined) {
      if (
        typeof edges.bezierControlOffset !== 'number' ||
        edges.bezierControlOffset < 0 ||
        edges.bezierControlOffset > 1
      ) {
        errors.push(
          'edges.bezierControlOffset must be between 0 and 1'
        );
      }
    }
  }

  // 验证性能配置
  if (config.performance) {
    const perf = config.performance;

    if (perf.maxHistorySize !== undefined) {
      if (
        typeof perf.maxHistorySize !== 'number' ||
        perf.maxHistorySize < 0
      ) {
        errors.push('performance.maxHistorySize must be >= 0');
      }
    }

    if (perf.edgeCanvasThreshold !== undefined) {
      if (
        typeof perf.edgeCanvasThreshold !== 'number' ||
        perf.edgeCanvasThreshold < 0
      ) {
        errors.push(
          'performance.edgeCanvasThreshold must be >= 0'
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 验证连接是否有效
 *
 * @param connection 连接数据
 * @param config 配置（包含验证函数）
 * @returns 是否有效
 */
export async function validateConnection(
  connection: Partial<FlowEdge>,
  config: FlowConfig
): Promise<{ valid: boolean; reason?: string }> {
  // 基本验证
  if (!connection.source || !connection.target) {
    return { valid: false, reason: 'Source and target are required' };
  }

  if (connection.source === connection.target) {
    return { valid: false, reason: 'Cannot connect node to itself' };
  }

  // 自定义验证函数
  if (config.isValidConnection) {
    try {
      const result = await config.isValidConnection(connection);
      if (typeof result === 'string') {
        return { valid: false, reason: result };
      }
      if (result === false) {
        return { valid: false, reason: 'Connection validation failed' };
      }
    } catch (error) {
      return {
        valid: false,
        reason: error instanceof Error ? error.message : 'Validation error'
      };
    }
  }

  return { valid: true };
}

/**
 * 验证节点数据
 *
 * @param node 节点数据
 * @returns 是否有效
 */
export function validateNode(node: any): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }

  if (!node.id || typeof node.id !== 'string') {
    return false;
  }

  if (!node.type || typeof node.type !== 'string') {
    return false;
  }

  if (!node.position || typeof node.position !== 'object') {
    return false;
  }

  if (
    typeof node.position.x !== 'number' ||
    typeof node.position.y !== 'number'
  ) {
    return false;
  }

  return true;
}

/**
 * 验证连接线数据
 *
 * @param edge 连接线数据
 * @returns 是否有效
 */
export function validateEdge(edge: any): boolean {
  if (!edge || typeof edge !== 'object') {
    return false;
  }

  if (!edge.id || typeof edge.id !== 'string') {
    return false;
  }

  if (!edge.source || typeof edge.source !== 'string') {
    return false;
  }

  if (!edge.target || typeof edge.target !== 'string') {
    return false;
  }

  if (edge.source === edge.target) {
    return false;
  }

  return true;
}

