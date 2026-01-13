/**
 * 成功判断策略实现
 */

import type { SuccessEvaluationStrategy } from '../types';

/**
 * 默认成功判断策略
 * 没有错误即视为成功
 */
export class DefaultSuccessEvaluationStrategy implements SuccessEvaluationStrategy {
  isSuccess<T>(result: T | undefined, error: unknown | undefined): boolean {
    return error === undefined && result !== undefined;
  }
}

