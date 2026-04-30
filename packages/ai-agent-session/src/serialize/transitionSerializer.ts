/** LoopTransition 序列化/反序列化 — 处理 Error 对象 → string 转换 */

import type { LoopTransition } from '@suga/ai-agent-loop';
import type { SerializedLoopTransition } from '../types/serialized';

/**
 * 序列化 LoopTransition
 *
 * 关键处理：model_error 中的 Error 对象不可 JSON 序列化， 转换为 errorMessage + errorStack 字符串。
 */
export function serializeTransition(transition: LoopTransition): SerializedLoopTransition {
  if (transition.type === 'model_error') {
    return {
      type: 'model_error',
      errorMessage: transition.error.message,
      errorStack: transition.error.stack
    };
  }
  // 其他类型直接复制（均为纯数据，可 JSON 序列化）
  return transition as SerializedLoopTransition;
}

/**
 * 反序列化 LoopTransition
 *
 * 关键处理：model_error 的 errorMessage → 重建 Error 对象。
 */
export function deserializeTransition(serialized: SerializedLoopTransition): LoopTransition {
  if (serialized.type === 'model_error') {
    const error = new Error(serialized.errorMessage);
    if (serialized.errorStack) {
      error.stack = serialized.errorStack;
    }
    return { type: 'model_error', error };
  }
  return serialized as LoopTransition;
}
