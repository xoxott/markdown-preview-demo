/**
 * 准备上下文步骤
 * 初始化请求上下文
 */

import type { RequestStep } from './RequestStep';
import type { RequestContext } from '../context/RequestContext';

/**
 * 准备上下文步骤
 */
export class PrepareContextStep implements RequestStep {
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 上下文已在创建时初始化，这里可以做一些额外的准备工作
    // 例如：设置默认值、验证配置等
    return next();
  }
}

