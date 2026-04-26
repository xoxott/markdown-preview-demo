/* eslint-disable class-methods-use-this */
/** 准备上下文步骤 初始化请求上下文 */

import type { RequestContext } from '../context/RequestContext';
import type { RequestStep } from './RequestStep';

/** 准备上下文步骤 */
export class PrepareContextStep implements RequestStep {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 上下文已在创建时初始化，这里可以做一些额外的准备工作
    // 例如：设置默认值、验证配置等
    return next();
  }
}
