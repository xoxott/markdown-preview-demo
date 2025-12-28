/**
 * 连接线渲染策略
 *
 * 使用策略模式实现不同的连接线渲染方式
 * 支持扩展自定义渲染策略
 */

import type { Position, ConnectionRenderStrategy } from '../../types';

export interface ConnectionRenderConfig {
  /** 渲染策略类型 */
  strategy: ConnectionRenderStrategy;
  /** 曲线控制点偏移比例（用于贝塞尔曲线） */
  bezierControlOffset?: number;
  /** 步进线的圆角半径 */
  stepRadius?: number;
  /** 自定义控制点 */
  controlPoints?: Position[];
  /** 其他自定义配置 */
  [key: string]: any;
}

/**
 * 连接线渲染策略接口
 */
export interface IConnectionRenderStrategy {
  /** 策略名称 */
  readonly name: ConnectionRenderStrategy;

  /**
   * 计算 SVG 路径数据
   * @param sourcePos 起点位置
   * @param targetPos 终点位置
   * @param config 渲染配置
   * @returns SVG path 数据
   */
  computePath(
    sourcePos: Position,
    targetPos: Position,
    config?: Partial<ConnectionRenderConfig>
  ): string;

  /**
   * 计算箭头位置和角度（可选）
   * @param sourcePos 起点位置
   * @param targetPos 终点位置
   * @param config 渲染配置
   * @returns 箭头变换信息
   */
  computeArrowTransform?(
    sourcePos: Position,
    targetPos: Position,
    config?: Partial<ConnectionRenderConfig>
  ): { x: number; y: number; angle: number };
}

/**
 * 贝塞尔曲线渲染策略（默认）
 */
export class BezierConnectionStrategy implements IConnectionRenderStrategy {
  readonly name: ConnectionRenderStrategy = 'bezier';

  computePath(
    sourcePos: Position,
    targetPos: Position,
    config: Partial<ConnectionRenderConfig> = {}
  ): string {
    const { x: x1, y: y1 } = sourcePos;
    const { x: x2, y: y2 } = targetPos;

    // 控制点偏移量基于水平距离
    const dx = x2 - x1;
    const controlOffset = Math.abs(dx) * (config.bezierControlOffset ?? 0.5);

    // 第一个控制点（靠近起始点）
    const cx1 = x1 + controlOffset;
    const cy1 = y1;

    // 第二个控制点（靠近结束点）
    const cx2 = x2 - controlOffset;
    const cy2 = y2;

    // 生成 SVG 路径：M 移动到起始点，C 三次贝塞尔曲线到结束点
    return `M ${x1},${y1} C ${cx1},${cy1} ${cx2},${cy2} ${x2},${y2}`;
  }

  computeArrowTransform(
    sourcePos: Position,
    targetPos: Position,
    config: Partial<ConnectionRenderConfig> = {}
  ): { x: number; y: number; angle: number } {
    const { x: x1, y: y1 } = sourcePos;
    const { x: x2, y: y2 } = targetPos;

    // 计算终点处的切线方向
    const dx = x2 - x1;
    const controlOffset = Math.abs(dx) * (config.bezierControlOffset ?? 0.5);
    const cx2 = x2 - controlOffset;
    const cy2 = y2;

    // 从最后一个控制点到终点的方向
    const angle = Math.atan2(y2 - cy2, x2 - cx2) * (180 / Math.PI);

    return { x: x2, y: y2, angle };
  }
}

/**
 * 直线渲染策略
 */
export class StraightConnectionStrategy implements IConnectionRenderStrategy {
  readonly name: ConnectionRenderStrategy = 'straight';

  computePath(sourcePos: Position, targetPos: Position): string {
    const { x: x1, y: y1 } = sourcePos;
    const { x: x2, y: y2 } = targetPos;

    return `M ${x1},${y1} L ${x2},${y2}`;
  }

  computeArrowTransform(sourcePos: Position, targetPos: Position): { x: number; y: number; angle: number } {
    const { x: x1, y: y1 } = sourcePos;
    const { x: x2, y: y2 } = targetPos;

    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

    return { x: x2, y: y2, angle };
  }
}

/**
 * 步进线渲染策略（直角转折）
 */
export class StepConnectionStrategy implements IConnectionRenderStrategy {
  readonly name: ConnectionRenderStrategy = 'step';

  computePath(sourcePos: Position, targetPos: Position): string {
    const { x: x1, y: y1 } = sourcePos;
    const { x: x2, y: y2 } = targetPos;

    // 中点 x 坐标
    const midX = (x1 + x2) / 2;

    // 生成步进路径：水平 -> 垂直 -> 水平
    return `M ${x1},${y1} L ${midX},${y1} L ${midX},${y2} L ${x2},${y2}`;
  }

  computeArrowTransform(sourcePos: Position, targetPos: Position): { x: number; y: number; angle: number } {
    const { x: x2, y: y2 } = targetPos;

    // 箭头水平指向
    return { x: x2, y: y2, angle: 0 };
  }
}

/**
 * 平滑步进线渲染策略（带圆角）
 */
export class SmoothStepConnectionStrategy implements IConnectionRenderStrategy {
  readonly name: ConnectionRenderStrategy = 'smooth-step';

  computePath(
    sourcePos: Position,
    targetPos: Position,
    config: Partial<ConnectionRenderConfig> = {}
  ): string {
    const { x: x1, y: y1 } = sourcePos;
    const { x: x2, y: y2 } = targetPos;

    const radius = config.stepRadius ?? 10;
    const midX = (x1 + x2) / 2;

    // 计算圆角位置
    const corner1X = midX;
    const corner1Y = y1;
    const corner2X = midX;
    const corner2Y = y2;

    // 生成带圆角的步进路径
    return `
      M ${x1},${y1}
      L ${corner1X - radius},${corner1Y}
      Q ${corner1X},${corner1Y} ${corner1X},${corner1Y + (y2 > y1 ? radius : -radius)}
      L ${corner2X},${corner2Y - (y2 > y1 ? radius : -radius)}
      Q ${corner2X},${corner2Y} ${corner2X + radius},${corner2Y}
      L ${x2},${y2}
    `.replace(/\s+/g, ' ').trim();
  }

  computeArrowTransform(sourcePos: Position, targetPos: Position): { x: number; y: number; angle: number } {
    const { x: x2, y: y2 } = targetPos;
    return { x: x2, y: y2, angle: 0 };
  }
}

/**
 * 自定义连接线渲染策略
 * 允许用户提供自定义的控制点
 */
export class CustomConnectionStrategy implements IConnectionRenderStrategy {
  readonly name: ConnectionRenderStrategy = 'custom';

  computePath(
    sourcePos: Position,
    targetPos: Position,
    config: Partial<ConnectionRenderConfig> = {}
  ): string {
    const { x: x1, y: y1 } = sourcePos;
    const { x: x2, y: y2 } = targetPos;
    const controlPoints = config.controlPoints ?? [];

    if (controlPoints.length === 0) {
      // 没有控制点，退化为直线
      return `M ${x1},${y1} L ${x2},${y2}`;
    }

    // 构建路径：起点 -> 控制点们 -> 终点
    let path = `M ${x1},${y1}`;

    for (const point of controlPoints) {
      path += ` L ${point.x},${point.y}`;
    }

    path += ` L ${x2},${y2}`;

    return path;
  }

  computeArrowTransform(
    sourcePos: Position,
    targetPos: Position,
    config: Partial<ConnectionRenderConfig> = {}
  ): { x: number; y: number; angle: number } {
    const { x: x2, y: y2 } = targetPos;
    const controlPoints = config.controlPoints ?? [];

    if (controlPoints.length === 0) {
      // 没有控制点，使用起点到终点的方向
      const { x: x1, y: y1 } = sourcePos;
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      return { x: x2, y: y2, angle };
    }

    // 使用最后一个控制点到终点的方向
    const lastPoint = controlPoints[controlPoints.length - 1];
    const angle = Math.atan2(y2 - lastPoint.y, x2 - lastPoint.x) * (180 / Math.PI);

    return { x: x2, y: y2, angle };
  }
}

/**
 * 连接线渲染策略管理器
 */
export class ConnectionRenderStrategyManager {
  private strategies: Map<ConnectionRenderStrategy, IConnectionRenderStrategy> = new Map();

  constructor() {
    // 注册内置策略
    this.registerStrategy(new BezierConnectionStrategy());
    this.registerStrategy(new StraightConnectionStrategy());
    this.registerStrategy(new StepConnectionStrategy());
    this.registerStrategy(new SmoothStepConnectionStrategy());
    this.registerStrategy(new CustomConnectionStrategy());
  }

  /**
   * 注册渲染策略
   */
  registerStrategy(strategy: IConnectionRenderStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * 获取渲染策略
   */
  getStrategy(name: ConnectionRenderStrategy): IConnectionRenderStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * 获取所有策略名称
   */
  getStrategyNames(): ConnectionRenderStrategy[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * 渲染连接线路径
   */
  renderPath(
    strategyName: ConnectionRenderStrategy,
    sourcePos: Position,
    targetPos: Position,
    config?: Partial<ConnectionRenderConfig>
  ): string {
    const strategy = this.getStrategy(strategyName);
    if (!strategy) {
      console.warn(`Connection render strategy "${strategyName}" not found, falling back to bezier`);
      return this.getStrategy('bezier')!.computePath(sourcePos, targetPos, config);
    }

    return strategy.computePath(sourcePos, targetPos, config);
  }
}

// 导出单例
export const connectionRenderManager = new ConnectionRenderStrategyManager();

