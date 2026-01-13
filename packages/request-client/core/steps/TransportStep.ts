/**
 * 传输步骤（Transport Step）
 * 职责：调用 Transport 执行实际请求，并处理业务层响应数据
 */

import type { RequestStep, RequestContext, Transport } from '@suga/request-core';
import { TransportStep as CoreTransportStep } from '@suga/request-core';
import { handleResponseData } from '../../interceptors/response/handlers';
import type { RequestConfig } from '../../types';

/**
 * 业务层传输步骤
 * 包装 request-core 的 TransportStep，添加业务层响应处理逻辑
 */
export class TransportStep implements RequestStep {
  private coreStep: CoreTransportStep;

  constructor(transport: Transport) {
    this.coreStep = new CoreTransportStep(transport);
  }

  async execute<T>(ctx: RequestContext<T>, next: () => Promise<void>): Promise<void> {
    // 先执行核心传输步骤
    await this.coreStep.execute(ctx, next);

    // 如果请求成功，处理业务层响应数据
    if (ctx.result !== undefined && !ctx.error) {
      try {
        // 构建业务层配置（包含原始配置和元数据）
        const requestConfig: RequestConfig = {
          ...ctx.config,
          ...ctx.meta,
        } as RequestConfig;

        const responseData: unknown = ctx.result;
        const processedData: T = await handleResponseData<T>(
          responseData,
          requestConfig,
        );

        // 更新上下文（processedData 已经是 T 类型）
        ctx.result = processedData;
      } catch (error) {
        // 处理响应数据时出错
        ctx.error = error;
        throw error;
      }
    }
  }
}

