/**
 * 熔断器类型定义
 */

/**
 * 熔断器状态枚举
 */
export enum CircuitBreakerState {
  /** 关闭状态：正常处理请求 */
  CLOSED = 'closed',
  /** 开启状态：拒绝所有请求 */
  OPEN = 'open',
  /** 半开状态：允许少量请求通过，用于测试服务是否恢复 */
  HALF_OPEN = 'half-open',
}

/**
 * 熔断器指标数据（只读快照）
 */
export interface CircuitBreakerMetrics {
  /** 累计失败次数 */
  readonly failures: number;
  /** 半开状态下的成功次数 */
  readonly successes: number;
  /** 最后失败时间戳（毫秒） */
  readonly lastFailureTime: number | null;
  /** 当前状态快照 */
  readonly state: CircuitBreakerState;
}

/**
 * 状态转换策略接口
 * 定义熔断器状态之间的转换规则
 */
export interface StateTransitionStrategy {
  /**
   * 判断是否应该从 CLOSED 转换到 OPEN
   */
  shouldOpen(failures: number, failureThreshold: number): boolean;

  /**
   * 判断是否应该从 OPEN 转换到 HALF_OPEN
   */
  shouldHalfOpen(lastFailureTime: number | null, timeout: number, currentTime: number): boolean;

  /**
   * 判断是否应该从 HALF_OPEN 转换到 CLOSED
   */
  shouldClose(successes: number, successThreshold: number): boolean;
}

/**
 * 错误分类策略接口
 * 用于判断哪些错误应该被计入失败统计
 */
export interface ErrorClassificationStrategy {
  /**
   * 判断错误是否应该计入失败统计
   */
  shouldCountAsFailure(error: unknown): boolean;
}

/**
 * 成功判断策略接口
 * 用于 HALF_OPEN 状态下判断请求是否成功
 */
export interface SuccessEvaluationStrategy {
  /**
   * 判断请求是否成功
   */
  isSuccess<T>(result: T | undefined, error: unknown | undefined): boolean;
}

/**
 * 熔断器基础配置（不依赖泛型）
 */
export interface CircuitBreakerBaseOptions {
  /** 失败阈值：连续失败多少次后开启熔断 */
  failureThreshold?: number;
  /** 超时时间：熔断开启后多久进入半开状态（毫秒） */
  timeout?: number;
  /** 成功阈值：半开状态下成功多少次后关闭熔断 */
  successThreshold?: number;
  /** 是否启用熔断器 */
  enabled?: boolean;
  /** 错误分类策略：自定义哪些错误应该计入失败 */
  errorClassificationStrategy?: ErrorClassificationStrategy;
  /** 状态转换策略：自定义状态转换规则 */
  stateTransitionStrategy?: StateTransitionStrategy;
  /** 成功判断策略：自定义 HALF_OPEN 状态下的成功判断逻辑 */
  successEvaluationStrategy?: SuccessEvaluationStrategy;
}

/**
 * 熔断器配置选项
 */
export interface CircuitBreakerOptions<T = unknown> extends CircuitBreakerBaseOptions {
  /** 降级函数：熔断时返回的数据 */
  fallback?: (error?: unknown) => T | Promise<T>;
}

/**
 * 熔断器元数据接口
 * 定义熔断器相关的元数据字段
 */
export interface CircuitBreakerMeta {
  /**
   * 熔断器配置
   * - `true`: 启用熔断器（使用默认配置）
   * - `false`: 禁用熔断器
   * - `CircuitBreakerBaseOptions`: 使用自定义配置（不包含 fallback）
   * - `CircuitBreakerOptions`: 使用完整配置（包含 fallback）
   * - `undefined`: 不指定，不使用熔断器
   */
  circuitBreaker?: boolean | CircuitBreakerBaseOptions | CircuitBreakerOptions<unknown>;

  /**
   * 其他扩展字段
   */
  [key: string]: unknown;
}

/**
 * 类型守卫：判断 meta 是否包含 CircuitBreakerMeta
 */
export function isCircuitBreakerMeta(meta: Record<string, unknown>): meta is CircuitBreakerMeta {
  return typeof meta === 'object' && meta !== null;
}

