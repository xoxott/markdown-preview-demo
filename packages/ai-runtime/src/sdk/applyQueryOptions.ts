/** applyQueryOptions — QueryOptions → RuntimeConfig 合并辅助 */

import type { QueryOptions } from '@suga/ai-sdk';
import type { RuntimeConfig } from '../types/config';

/**
 * 将 SDK QueryOptions 合并到 RuntimeConfig
 *
 * QueryOptions 是面向 SDK 消费者的简化配置接口， RuntimeConfig 是面向 RuntimeSession 的完整配置接口。 此函数将 QueryOptions
 * 中有值的字段覆盖到 RuntimeConfig。
 *
 * 当前支持的覆盖项：
 *
 * - abort_signal → 作为 sendMessage 的 signal 参数传递（不修改 config）
 *
 * 暂不覆盖（P35+）：
 *
 * - model → 需 Provider 支持 model 切换
 * - max_tokens → 需 Provider 支持 maxTokens 切换
 * - append_system_prompt → 需 AnthropicAdapter system 字段注入
 * - permission_mode → 需 IronGate 策略切换
 * - allowed_tools / disallowed_tools → 需 ToolRegistry 过滤
 */
export function applyQueryOptions(config: RuntimeConfig, _options?: QueryOptions): RuntimeConfig {
  // 当前不修改 config — QueryOptions 的 signal 通过 sendMessage(signal) 参数传递
  // 未来 P35+ 将根据 options 动态调整 config
  return config;
}
