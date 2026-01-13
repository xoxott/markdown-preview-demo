/**
 * 传输步骤（Transport Step）
 * 职责：调用 Transport 执行实际请求
 *
 * 注意：此包不处理业务层响应格式，响应格式处理应由应用层实现
 */

import type { RequestStep, RequestContext, Transport } from '@suga/request-core';
import { TransportStep as CoreTransportStep } from '@suga/request-core';

/**
 * 传输步骤
 * 直接使用 request-core 的 TransportStep，不添加业务逻辑
 */
export class TransportStep implements RequestStep {
  private coreStep: CoreTransportStep;

  constructor(transport: Transport) {
    this.coreStep = new CoreTransportStep(transport);
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 直接执行核心传输步骤，不处理业务层响应格式
    await this.coreStep.execute(ctx, next);
  }
}

