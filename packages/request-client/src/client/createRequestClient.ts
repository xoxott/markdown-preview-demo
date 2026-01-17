/**
 * 创建请求客户端（向后兼容）
 *
 * ⚠️ 注意：此函数仅为向后兼容保留，推荐使用按需组装的方式
 * 此函数内部使用 createDefaultClient，包含了所有功能包
 *
 * 推荐做法：
 * 1. 使用 @suga/request-axios + @suga/request-core 按需组装
 * 2. 参考 examples/createMinimalClient.ts（最小化）
 * 3. 参考 examples/createCustomClient.ts（自定义）
 * 4. 参考 examples/createDefaultClient.ts（全功能）
 */

import type { CreateRequestClientConfig } from '../types';
import { createDefaultClient } from '../examples/createDefaultClient';

/**
 * 创建请求客户端（向后兼容）
 * @deprecated 推荐使用按需组装的方式，参考 examples 目录下的示例
 * @param config 配置（完整包含 AxiosRequestConfig 和业务层配置，所有配置都可以放在一个对象中）
 * @returns ApiRequestClient（业务层包装）
 */
export function createRequestClient(
  config?: CreateRequestClientConfig,
) {
  // 向后兼容：重定向到 createDefaultClient
  // 但推荐业务层根据需求自行组装
  return createDefaultClient(config);
}

